# Task Naming Conventions

Established naming conventions across mise-lib-template, nv-gcp-template, neo, and astral.

## Core Task Names (every project)

| Name | What it does |
|------|-------------|
| `install` | Install all dependencies (npm, pnpm, zig fetch, pip install, conan install) |
| `build` | Build the project (debug/dev mode by default) |
| `build-prod` | Optimized production build |
| `run` | Build and run locally (depends: build) |
| `test` | Run the full test suite (depends: build) |
| `lint` | Run linter (no changes) |
| `lint-fix` | Auto-fix linting issues |
| `format` | Format source files in-place |
| `format-check` | Check formatting without modifying (use in CI) |
| `clean` | Remove all build artifacts |
| `version` | Print current version (reads version.txt) |
| `version-next` | Preview next semantic-release version (dry-run) |
| `upversion` | Bump version using semantic-release |

## Namespace with colons for sub-tasks

Use `"namespace:verb"` (quoted, colon-separated) for related groups:

```toml
[tasks."db:migrate"]
[tasks."db:seed"]
[tasks."db:rollback"]

[tasks."test:smoke"]
[tasks."test:e2e"]

[tasks."build:web"]
[tasks."build:api"]
```

## Docker Tasks

| Name | What it does |
|------|-------------|
| `docker-build` | Build Docker image(s) |
| `docker-run` | Run container locally |
| `docker-test` | Run test suite inside container |
| `docker-stop` | Stop running containers |

Use hyphens (not colons) for docker tasks — `docker-build` not `docker:build`.

## CI/CD Tasks

| Name | What it does |
|------|-------------|
| `publish` | Build + tag + push to registry (full release) |
| `publish-rc` | Publish release candidate |
| `publish-templates` | Publish scaffold templates (template projects only) |

## GCP Tasks

| Name | What it does |
|------|-------------|
| `gcp-login` | Authenticate with GCP (ADC + docker config) |
| `tf-apply` | Apply Terraform for an environment: `mise run tf-apply dev` |
| `tf-plan` | Terraform plan |

## Development Tasks

| Name | What it does |
|------|-------------|
| `dev` | Start dev server(s) with hot reload |
| `typecheck` | TypeScript type check (no emit) |

## Naming Rules

1. **Lowercase, hyphen-separated** — `build-prod` not `buildProd` or `build_prod`
2. **Verb first** — `build-prod` not `prod-build`; `format-check` not `check-format`
3. **`-check` suffix** for read-only/CI-safe variants — `format-check`, `lint-check` (if distinct from `lint`)
4. **`-fix` suffix** for auto-repair variants — `lint-fix`
5. **`-prod` suffix** for optimized/release builds — `build-prod`
6. **`-rc` suffix** for release candidates — `publish-rc`
7. **Quote names with hyphens or colons** — `[tasks."build-prod"]`, `[tasks."db:migrate"]`
8. **`depends`** — declare dependencies explicitly; don't duplicate commands

## Hidden Tasks

Prefix helper scripts in `mise-tasks/` with `#MISE hide=true` to keep `mise tasks ls` output clean:

```bash
#!/usr/bin/env bash
#MISE hide=true
# Internal helper — not a user-facing task
```

## `description` Field

Always include. It appears in `mise tasks ls`. One sentence, no trailing period:

```toml
[tasks.build]
description = "Build the project (debug mode)"
```
