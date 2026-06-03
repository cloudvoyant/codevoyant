# TypeScript + pnpm Setup

mise.toml patterns for TypeScript projects using pnpm (single package or monorepo).

## Single-Package

```toml
[env]
PROJECT = "my-project"
VERSION = "{{ exec(command='cat version.txt 2>/dev/null | tr -d [:space:] || echo 0.1.0') }}"
_.path  = ['{{ config_root }}/node_modules/.bin']

[tools]
node = "lts"      # or pin: "20", "22", "24"
pnpm = "latest"   # or pin: "10"

[tasks.install]
description = "Install dependencies"
run         = "pnpm install"

[tasks.build]
description = "Compile TypeScript"
run         = "pnpm build"

[tasks.typecheck]
description = "Type-check without emitting"
run         = "pnpm typecheck"

[tasks.test]
description = "Run tests"
depends     = ["build"]
run         = "pnpm test"

[tasks.lint]
description = "Lint source files"
run         = "pnpm lint"

[tasks."lint-fix"]
description = "Auto-fix lint issues"
run         = "pnpm lint:fix"

[tasks.format]
description = "Format with Prettier"
run         = "prettier --write ."

[tasks."format-check"]
description = "Check formatting (CI-safe)"
run         = "prettier --check ."

[tasks.clean]
description = "Remove build artifacts"
run         = "rm -rf dist .tsbuildinfo"

[tasks.dev]
description = "Start dev server with hot reload"
run         = "pnpm dev"
```

## Monorepo (pnpm workspaces)

```toml
[env]
PROJECT = "my-monorepo"
VERSION = "{{ exec(command='cat version.txt 2>/dev/null | tr -d [:space:] || echo 0.1.0') }}"
_.path  = ['{{ config_root }}/node_modules/.bin']

[tools]
node = "24"
pnpm = "latest"

[tasks.install]
description = "Install all workspace dependencies"
run         = "pnpm install"

[tasks.build]
description = "Build all packages"
run         = "pnpm -r build"

[tasks.typecheck]
description = "Type-check all packages"
run         = "pnpm -r typecheck"

[tasks.test]
description = "Run tests across all packages"
run         = "pnpm -r test"

[tasks.lint]
description = "Lint all packages"
run         = "pnpm -r lint"

[tasks."lint-fix"]
description = "Auto-fix lint across all packages"
run         = "pnpm -r lint:fix"

[tasks.format]
description = "Format all source files"
run         = "prettier --write ."

[tasks."format-check"]
description = "Check formatting (CI-safe)"
run         = "prettier --check ."

[tasks.clean]
description = "Remove build artifacts across all packages"
run         = "pnpm -r --if-present exec rm -rf dist .turbo"

# Target a specific package
[tasks."build:api"]
description = "Build the API package only"
run         = "pnpm --filter @myproject/api run build"

[tasks."test:api"]
description = "Test the API package only"
run         = "pnpm --filter @myproject/api run test"
```

## CI Pattern

Format-check and typecheck are the CI-safe variants (no side effects):

```toml
# In CI: run format-check, lint, typecheck, test — in that order
```

## Node version pinning

See [mise node docs](https://mise.jdx.dev/lang/node.html) for the full version syntax. Project convention: pin to a major (`"24"`) for apps that deploy to production — never `"latest"` which can silently upgrade between CI runs. Use `"lts"` only for internal tooling scripts where exact node version doesn't matter.
