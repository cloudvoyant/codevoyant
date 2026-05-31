# SvelteKit Setup

mise.toml patterns for SvelteKit projects (single app or monorepo with SvelteKit web app).

## Single SvelteKit App

```toml
[env]
PROJECT = "my-app"
VERSION = "{{ exec(command='cat version.txt 2>/dev/null | tr -d [:space:] || echo 0.1.0') }}"
_.path  = ['{{ config_root }}/node_modules/.bin']

[tools]
node = "lts"
pnpm = "latest"

[tasks.install]
description = "Install dependencies"
run         = "pnpm install"

[tasks.build]
description = "Build SvelteKit app"
run         = "pnpm build"

[tasks.dev]
description = "Start Vite dev server with hot reload"
run         = "pnpm dev"

[tasks.typecheck]
description = "Type-check without emitting"
run         = "pnpm check"

[tasks.test]
description = "Run tests with Vitest"
run         = "pnpm test"

[tasks.lint]
description = "Lint with ESLint"
run         = "pnpm lint"

[tasks."lint-fix"]
description = "Auto-fix ESLint issues"
run         = "pnpm lint:fix"

[tasks.format]
description = "Format with Prettier"
run         = "prettier --write ."

[tasks."format-check"]
description = "Check formatting (CI-safe)"
run         = "prettier --check ."

[tasks.clean]
description = "Remove build artifacts"
run         = "rm -rf .svelte-kit build"
```

## Monorepo with SvelteKit Web App

```toml
[env]
PROJECT = "my-project"
VERSION = "{{ exec(command='cat version.txt 2>/dev/null | tr -d [:space:] || echo 0.1.0') }}"
_.path  = ['{{ config_root }}/node_modules/.bin']

[tools]
node = "lts"
pnpm = "latest"

[tasks.install]
description = "Install all workspace dependencies"
run         = "pnpm install"

[tasks.build]
description = "Build all packages"
run         = "pnpm -r build"

[tasks.dev]
description = "Start API and web dev servers"
run         = """
pnpm --filter @myproject/api dev &
pnpm --filter @myproject/web dev &
trap 'exit 0' INT TERM
wait
"""

[tasks.typecheck]
description = "Type-check all packages"
run         = "pnpm -r typecheck"

[tasks.test]
description = "Run all tests"
run         = "pnpm -r test"

[tasks.lint]
description = "Lint all packages"
run         = "pnpm -r lint"

[tasks.format]
description = "Format all source files"
run         = "prettier --write ."

[tasks."format-check"]
description = "Check formatting (CI-safe)"
run         = "prettier --check ."

[tasks."build:web"]
description = "Build SvelteKit web app only"
run         = "pnpm --filter @myproject/web run build"

[tasks."dev:web"]
description = "Start Vite dev server only"
run         = "pnpm --filter @myproject/web run dev"
```

## Notes

- SvelteKit uses `pnpm check` (not `tsc`) for type-checking — it runs `svelte-check` which understands `.svelte` files
- Build output goes to `.svelte-kit/` (during dev) and `build/` (production) — clean both in the `clean` task
- Vitest is preferred over Jest for SvelteKit projects (native ESM, faster, compatible with Vite config)
- For the `dev` task in a monorepo, background both servers with `&` and trap `INT`/`TERM` signals for clean shutdown
