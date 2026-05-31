---
name: mise
description: "mise.toml authoring, tool management, task patterns, and GCP publish workflows. Load when writing or editing mise.toml, adding tools, defining tasks, or working with mise-tasks/ directories. Triggers on: mise.toml, .mise.toml, mise tasks, mise run, mise install, tool versions, task depends."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# mise

Patterns for writing and maintaining `mise.toml` files based on the mise-lib-template and nv-gcp-template conventions used across projects.

## When to load recipes

| You are working on... | Load recipe |
|---|---|
| Task naming conventions and standard task set | `references/recipes/task-naming.md` |
| TypeScript + pnpm project (single or monorepo) | `references/recipes/ts-pnpm.md` |
| SvelteKit project | `references/recipes/sveltekit.md` |
| Zig project | `references/recipes/zig.md` |
| C++ project with Conan package manager | `references/recipes/cpp-conan.md` |
| Docker tasks, dev containers, WSL/Linux/Mac compat | `references/recipes/docker.md` |
| Terraform tasks for GCP (tf-init, tf-plan, tf-apply) | `references/recipes/terraform-gcp.md` |
| Terraform tasks for AWS (tf-init, tf-plan, tf-apply) | `references/recipes/terraform-aws.md` |

## mise.toml Structure

Standard section order:

```toml
# [env] — environment variables (PROJECT, VERSION, GCP_*, PATH extensions)
# [tools] — tool versions (node, pnpm, gcloud, etc.)
# [tasks.*] — inline tasks grouped by: CORE, DOCKER, CI/CD, UTILITIES
# [task_config] includes = ["mise-tasks"]  ← for external task dirs
# [settings] experimental = true  ← required for some features
```

## Environment Variables

```toml
[env]
PROJECT                 = "my-project"
VERSION                 = "{{ exec(command='cat version.txt 2>/dev/null | tr -d [:space:] || echo 0.1.0') }}"
GCP_REGISTRY_PROJECT_ID = "devops-466002"
GCP_REGISTRY_REGION     = "us-east1"
GCP_REGISTRY_NAME       = "cloudvoyant-generic-registry"
_.path                  = ['{{ config_root }}/node_modules/.bin']  # extend PATH
```

Key patterns:
- `VERSION` always read from `version.txt` with a fallback
- `_.path` extends `$PATH` — use `config_root` not hardcoded paths
- GCP vars follow: `GCP_REGISTRY_*` (artifact registry) and `GCP_PROJECT_*` / `GCP_DEVOPS_*` (project split)

## Tools

```toml
[tools]
node       = "lts"       # or "20", "24"
pnpm       = "latest"    # or "10"
gcloud     = "latest"
terraform  = "1"         # major-pinned
shellcheck = "latest"
shfmt      = "latest"
bats       = "latest"
claude     = "latest"
```

- Pin to major version for infra tools (`terraform = "1"`)
- Use `"lts"` for node unless a specific version is needed
- Add `npm:package-name` to install npm packages as tools: `"npm:skills-ref" = "0.1.5"`

## Task Patterns

### Inline tasks (preferred for ≤20 tasks)

```toml
[tasks.build]
description = "Build the project"
depends     = ["install"]
run         = "pnpm build"

[tasks.test]
description = "Run tests"
depends     = ["build"]
run         = "pnpm test"

[tasks."format-check"]
description = "Check formatting"
run         = "shfmt -d .mise-tasks/"
```

### External task dir (preferred for large projects)

```toml
[task_config]
includes = ["mise-tasks"]

[settings]
experimental = true  # required for task_config.includes
```

Scripts in `mise-tasks/` are auto-discovered. Hide internal helpers:
```bash
#!/usr/bin/env bash
#MISE hide=true
```

### Standard task set (every project should have these)

| Task | Description |
|------|-------------|
| `install` | Install dependencies |
| `build` | Build the project |
| `test` | Run tests (depends: build) |
| `lint` | Run linter |
| `lint-fix` | Auto-fix linting issues |
| `format` | Format source files |
| `format-check` | Check formatting (CI-safe) |
| `clean` | Remove build artifacts |
| `version` | Print current version |
| `upversion` | Bump version (semantic-release) |

### Docker tasks (when applicable)

```toml
[tasks.docker-build]
description = "Build Docker image"
run         = "COMPOSE_BAKE=true docker compose build"

[tasks.docker-run]
description = "Run in Docker"
depends     = ["docker-build"]
run         = "docker compose up"

[tasks.docker-test]
description = "Run tests in Docker"
depends     = ["docker-build"]
run         = "docker compose run --rm app mise run test"
```

### GCP publish pattern (from mise-lib-template)

```toml
[tasks.publish]
description = "Publish to GCP Artifact Registry"
depends     = ["test", "build-prod"]
run         = """
IMAGE="${GCP_REGISTRY_REGION}-docker.pkg.dev/${GCP_REGISTRY_PROJECT_ID}/${GCP_REGISTRY_NAME}/${PROJECT}:${VERSION}"
docker build -t "$IMAGE" .
docker push "$IMAGE"
echo "Published: $IMAGE"
"""

[tasks.publish-rc]
description = "Publish release candidate"
depends     = ["test", "build-prod"]
run         = """
IMAGE="${GCP_REGISTRY_REGION}-docker.pkg.dev/${GCP_REGISTRY_PROJECT_ID}/${GCP_REGISTRY_NAME}/${PROJECT}:${VERSION}-rc"
docker build -t "$IMAGE" .
docker push "$IMAGE"
"""
```

## Monorepo Pattern (pnpm workspaces)

```toml
[tasks."build:web"]
run = "pnpm --filter @myproject/web run build"

[tasks."test:api"]
run = "pnpm --filter @myproject/api run test"
```

## Common Pitfalls

- **`config_root` vs `$PWD`**: use `{{ config_root }}` in TOML templates, `$MISE_CONFIG_ROOT` in bash tasks
- **`experimental = true`**: required for `[task_config] includes` and some env features — add it
- **Task names with hyphens**: wrap in quotes: `[tasks."build-prod"]`
- **Depends chain**: `depends = ["install"]` runs before the task; don't duplicate in `run`
- **PATH not extended?**: use `_.path = [...]` not `PATH = "..."` — the latter overwrites

## Version Management

`version.txt` holds the current semver. The `upversion` task runs semantic-release:

```toml
[tasks.upversion]
description = "Bump version based on conventional commits"
run         = ".mise-tasks/upversion"
```

Publish tasks should depend on the version being set, not bump it themselves.
