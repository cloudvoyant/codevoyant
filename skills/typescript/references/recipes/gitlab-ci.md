# GitLab CI for pnpm Monorepos

## Why this matters

The most common CI problem for monorepos is running the full build and test suite on every commit, even for changes that only touched one package. A 10-package monorepo that rebuilds everything on every feature branch push wastes most of its pipeline budget on irrelevant work. `rules:changes:` solves this by gating each package's job on path changes — if `apps/web/**` didn't change, the web build job simply doesn't run.

The second problem is install time. pnpm's content-addressable store makes installs fast locally, but CI runners start clean. The pattern here — caching the store on `pnpm-lock.yaml` and passing `node_modules` between stages as artifacts — means jobs after the first run see near-instant installs.

**Prerequisites:** a GitLab repo with pnpm pinned in the root `package.json` via `packageManager`.


## 1. Pipeline entrypoint `.gitlab-ci.yml`

The `default:` block applies to every job: Alpine Node image, corepack setup, and cache keyed on the lockfile. Changing any dependency bumps `pnpm-lock.yaml`, which busts the cache — so a lockfile-bump MR gets a clean install while everything else reuses the previous store.

```yaml
stages:
  - install
  - build
  - test
  - publish

variables:
  # Cache pnpm's content-addressable store between jobs
  PNPM_HOME: "$CI_PROJECT_DIR/.pnpm-store"
  # Prevents pnpm from prompting for anything in CI
  CI: "true"

default:
  image: node:24-alpine
  before_script:
    - corepack enable
    - corepack prepare pnpm@latest --activate
    - pnpm config set store-dir "$PNPM_HOME"
  cache:
    key:
      files:
        - pnpm-lock.yaml
    paths:
      - .pnpm-store
      - node_modules
      - "**/node_modules"
    policy: pull-push  # every job can both read and write the cache
```


## 2. Install stage — one job, fan out via artifacts

Run install once and pass `node_modules` to later stages as an artifact. This is the difference between "install takes 2 minutes per job" and "install happens once":

```yaml
install:
  stage: install
  script:
    - pnpm install --frozen-lockfile
  artifacts:
    paths:
      - node_modules
      - "**/node_modules"
    expire_in: 1 hour
```

`--frozen-lockfile` fails the job if `pnpm-lock.yaml` is out of date. This is the correct CI default — a missing lockfile update is a bug you want to catch early, not silently fix.

The `node_modules` artifact is what downstream stages consume. The cache is a warm-up fallback for the first run after a lockfile bump; once warm, the cache makes subsequent runs near-instant.


## 3. Build, test, lint, and publish stages

```yaml
build:
  stage: build
  needs: [install]
  script:
    - pnpm -r run build
  artifacts:
    paths:
      - "**/dist"
    expire_in: 1 hour

test:
  stage: test
  needs: [install, build]
  script:
    - pnpm -r --if-present run test
  coverage: '/^All files\s+\|\s+(\d+\.?\d*)/'

lintcheck:
  stage: test
  needs: [install]
  script:
    - pnpm -r --if-present run lintcheck
    - pnpm -r --if-present run formatcheck
    - pnpm -r --if-present run typecheck

publish:
  stage: publish
  needs: [install, build, test]
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  script:
    - export NPM_AUTH_TOKEN="$CI_JOB_TOKEN"
    - pnpm -r publish --access restricted --no-git-checks
```

`--no-git-checks` lets publish proceed on a CI checkout without a clean-working-tree warning (CI checkouts are always "dirty" from pnpm's perspective). `NPM_AUTH_TOKEN=$CI_JOB_TOKEN` uses the built-in GitLab job token — no secrets management needed for the GitLab registry.


## 4. Only rebuild affected packages with `rules:changes:`

This is where the real savings are in a monorepo. Gate per-package jobs on the paths they actually depend on. Always include `pnpm-lock.yaml` and `pnpm-workspace.yaml` — changes to those root files affect every package.

```yaml
.web-rules: &web-rules
  rules:
    - changes:
        - apps/web/**/*
        - libs/ui/**/*
        - pnpm-lock.yaml
        - pnpm-workspace.yaml

.api-rules: &api-rules
  rules:
    - changes:
        - apps/api/**/*
        - libs/shared/**/*
        - pnpm-lock.yaml
        - pnpm-workspace.yaml

build:web:
  <<: *web-rules
  stage: build
  needs: [install]
  script:
    - pnpm --filter @acme/web run build

test:web:
  <<: *web-rules
  stage: test
  needs: [install, build:web]
  script:
    - pnpm --filter @acme/web run test

build:api:
  <<: *api-rules
  stage: build
  needs: [install]
  script:
    - pnpm --filter @acme/api run build

test:api:
  <<: *api-rules
  stage: test
  needs: [install, build:api]
  script:
    - pnpm --filter @acme/api run test
```

When a change touches `apps/web/**` only, the `api` jobs don't run. When `pnpm-lock.yaml` changes, both run — a dep upgrade could affect anyone.


## 5. Splitting large pipelines by trigger

As pipelines grow, a single `.gitlab-ci.yml` becomes hard to read. Split by trigger into separate files included from the entrypoint, sharing anchors via `!reference`:

```yaml
# .gitlab-ci.yml
include:
  - local: "ci/components.gitlab-ci.yml"
  - local: "ci/on-feature-commit.gitlab-ci.yml"
  - local: "ci/on-merge.gitlab-ci.yml"
  - local: "ci/on-manual-run.gitlab-ci.yml"
```

```yaml
# ci/components.gitlab-ci.yml — reusable rule anchors
.if_feature_commit_rules:
  - if: '$CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH =~ /^(feature|bugfix|hotfix)\/.*$/'
    when: on_success

.if_merge_rules:
  - if: $CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    when: on_success

.if_manual_rules:
  - if: '$CI_PIPELINE_SOURCE == "web"'
    when: on_success
```

```yaml
# ci/on-feature-commit.gitlab-ci.yml — build + test only on feature branches
build:
  rules:
    - !reference [.if_feature_commit_rules]
    - when: never
  stage: build
  needs: [install]
  script:
    - pnpm -r run build
```

Branch model:
- `feature|bugfix|hotfix/*` → feature pipeline (build + test, no publish)
- default branch push → merge pipeline (build + test + deploy to dev + publish)
- `web` trigger → manual run (prod deploy)


## 6. Local verification

Before pushing, mimic the CI cache-hit scenario to confirm the pipeline will work:

```bash
pnpm config set store-dir .pnpm-store
pnpm install --frozen-lockfile
pnpm -r run build
pnpm -r --if-present run test
```

After pushing a feature branch, watch the first pipeline: install should take a full minute, subsequent runs should take seconds (cache warm). Per-package jobs should only appear for packages whose paths changed.


## Conventions to keep

- Cache key on `pnpm-lock.yaml` — a lockfile change is the only thing that should bust the install cache.
- `pnpm install --frozen-lockfile` in CI — fail loudly on lockfile drift, never silently update.
- Pass build output between stages via `artifacts.paths`, not the cache. Artifacts are deterministic; cache is opportunistic.
- Use `pnpm --filter <pkg>` for per-package jobs and `pnpm -r --if-present <script>` for workspace-wide commands.
- Include `pnpm-lock.yaml` and `pnpm-workspace.yaml` in every `rules:changes:` list — root file changes affect every package.
- Split pipelines into `ci/components.gitlab-ci.yml` plus one file per trigger; share rule anchors with `!reference [.anchor]`.
- Publish uses `NPM_AUTH_TOKEN=$CI_JOB_TOKEN` for the GitLab project registry — no manual secrets required.
