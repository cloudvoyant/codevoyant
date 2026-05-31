---
title: mise
---

# mise

Context skill for `mise.toml` authoring and task conventions. Activates automatically when `mise.toml` or `.mise.toml` is detected — no slash command needed.

## Installation

```bash
npx skills add cloudvoyant/codevoyant
```

## What It Does

When you're writing or editing `mise.toml` the agent loads conventions for section ordering, environment variable patterns, tool pinning, task naming, and publish workflows — based on patterns from mise-lib-template and nv-gcp-template.

## Recipes

| Working on… | Recipe loaded |
|---|---|
| Task naming conventions and standard task set | `task-naming` |
| TypeScript + pnpm project (single or monorepo) | `ts-pnpm` |
| SvelteKit project | `sveltekit` |
| Zig project | `zig` |
| C++ project with Conan package manager | `cpp-conan` |
| Docker tasks, dev containers, WSL/Linux/Mac compat | `docker` |

## mise.toml Structure

Standard section order:

```toml
[env]      # PROJECT, VERSION, GCP_*, _.path extensions

[tools]    # node, pnpm, gcloud, terraform, etc.

[tasks.*]  # grouped: CORE → DOCKER → CI/CD → UTILITIES

[task_config]
includes = ["mise-tasks"]   # for external task files (large projects)

[settings]
experimental = true         # required for task_config.includes
```

## Environment Variables

```toml
[env]
PROJECT = "my-app"
VERSION = "{{ exec(command='cat version.txt 2>/dev/null | tr -d [:space:] || echo 0.1.0') }}"
GCP_REGISTRY_PROJECT_ID = "devops-466002"
GCP_REGISTRY_REGION     = "us-east1"
GCP_REGISTRY_NAME       = "cloudvoyant-docker-registry"
_.path = ['{{ config_root }}/node_modules/.bin']
```

- `VERSION` always read from `version.txt` with a fallback — never hardcoded
- `_.path` extends `$PATH` — use `config_root`, not hardcoded absolute paths
- Use `$MISE_CONFIG_ROOT` inside bash task scripts; use `{{ config_root }}` in TOML templates

## Tool Pinning

```toml
[tools]
node       = "lts"
pnpm       = "latest"
gcloud     = "latest"
terraform  = "1"       # major-pinned for infra stability
shellcheck = "latest"
```

- `"lts"` for Node unless a specific version is required
- Major-pin infra tools like Terraform to avoid unexpected breaking changes

## Standard Task Set

Every project should have these tasks:

| Task | Description |
|---|---|
| `install` | Install dependencies |
| `build` | Build the project |
| `test` | Run tests |
| `lint` | Run linter |
| `lint-fix` | Auto-fix linting issues |
| `format` | Format source files |
| `format-check` | Check formatting (CI-safe, no writes) |
| `clean` | Remove build artifacts |
| `version` | Print current version |
| `upversion` | Bump version via semantic-release |

## Task Patterns

### Inline tasks (preferred for ≤20 tasks)

```toml
[tasks.build]
description = "Build the project"
depends     = ["install"]
run         = "pnpm build"

[tasks."format-check"]
description = "Check formatting (CI)"
run         = "prettier --check ."
```

Wrap task names containing hyphens in quotes: `[tasks."build-prod"]`.

### External task directory (large projects)

```toml
[task_config]
includes = ["mise-tasks"]

[settings]
experimental = true
```

Scripts in `mise-tasks/` are auto-discovered. Add `#MISE hide=true` to hide internal helpers from `mise tasks`.

## Common Pitfalls

- **`experimental = true` missing** — required for `task_config.includes`; add it or the includes are silently ignored
- **`config_root` in bash** — use `$MISE_CONFIG_ROOT` in task `run` scripts, not `{{ config_root }}`
- **Depends doesn't need repeating** — if `test` depends on `build`, don't also call `mise run build` inside the `test` script
