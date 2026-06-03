# Monorepo Dependency Management with pnpm

## Why this matters

JavaScript monorepos without a version management strategy accumulate silent drift: one package quietly installs React 18 while another uses React 19, and the conflict only appears in production. pnpm catalogs solve this by making shared dependency versions a first-class declaration — one place to change, all packages move together. The `workspace:*` protocol for internal packages means your app's import of `@acme/math` always resolves to the live source in `libs/math`, not a stale npm publish.

This pattern also prevents supply-chain attacks at install time: the `onlyBuiltDependencies` allowlist blocks install scripts from running unless you've explicitly vetted them.

**Prerequisites:** Node 22.18+ (or 24), `corepack enable` so the pinned pnpm version is enforced.


## 1. Pin pnpm and Node in the root `package.json`

Start here so every contributor and CI runner uses the exact same pnpm version without a separate install step. Corepack reads `packageManager` and enforces it.

```jsonc
{
  "name": "acme",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsdown",
    "lint": "eslint . --fix",
    "format": "prettier . --write",
    "type-check": "pnpm -r type-check",
    "test": "pnpm -r --if-present test"
  },
  "packageManager": "pnpm@10.33.4"
}
```

Pin Node too: `echo "24" > .nvmrc`.


## 2. Declare the workspace in `pnpm-workspace.yaml`

The `packages:` globs tell pnpm which directories are workspace members. `onlyBuiltDependencies` is the security allowlist — pnpm blocks `postinstall` scripts by default and only runs them for packages you name here.

```yaml
packages:
  - apps/*
  - libs/*

onlyBuiltDependencies:
  - esbuild
  - koffi
```

Mirror the allowlist in `.npmrc` so both pnpm and npm CLI agree:

```ini
ignore-scripts=false
only-built-dependencies[]=koffi
only-built-dependencies[]=esbuild
```


## 3. Centralize shared versions in a catalog

Without a catalog, bumping a shared dependency (say, Zod v3 → v4) means touching every `package.json` in the repo and hoping nothing drifts. A catalog pins each shared version once; packages reference it as `catalog:` instead of a version string.

```yaml
packages:
  - apps/*
  - libs/*

# default (unnamed) catalog — reference as "catalog:"
catalog:
  '@tanstack/react-query': ^5.100.9
  '@tanstack/react-router': ^1.169.2
  eslint-plugin-simple-import-sort: ^13.0.0
  globals: ^17.6.0
  prettier: ^3.8.3
  tailwindcss: ^4.2.4
  typescript: ^6.0.3
  typescript-eslint: ^8.59.2
  vite: 8.0.11
  vitest: ^4.1.5
  zod: ^4.4.3
  zustand: ^5.0.13

# pnpm does NOT auto-add new deps to the catalog; you opt in deliberately
catalogMode: manual

# named catalogs group versions that must upgrade as a unit — reference as "catalog:react19"
catalogs:
  react19:
    '@types/react': ^19.2.14
    '@types/react-dom': ^19.2.3
    react: ^19.2.6
    react-dom: ^19.2.6

# supply-chain guard: refuse to install any version published less than 24h ago
minimumReleaseAge: 1440 # 24 hours

onlyBuiltDependencies:
  - esbuild
  - msw
  - unrs-resolver
```

Named catalogs (like `react19` above) group packages that must stay in sync — all four React packages upgrade together or not at all.


## 4. Create an internal lib

Internal packages use a scoped name (`@acme/*`) and reference catalog entries instead of hardcoded versions. The version is `0.0.0` because internal packages are never published from this workspace.

```jsonc
// libs/math/package.json
{
  "name": "@acme/math",
  "version": "0.0.0",
  "type": "module",
  "exports": { ".": "./index.ts" },
  "dependencies": { "zod": "catalog:" },
  "devDependencies": { "typescript": "catalog:" }
}
```


## 5. Consume the lib from an app

Internal deps use `workspace:*` — pnpm resolves this to the live source in `libs/math`, not an npm tarball. Shared third-party deps use `catalog:` or `catalog:<name>`.

```jsonc
// apps/web/package.json
{
  "name": "@acme/web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc -b && vite build" },
  "dependencies": {
    "@acme/math": "workspace:*",
    "@tanstack/react-query": "catalog:",
    "react": "catalog:react19",
    "react-dom": "catalog:react19",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/react": "catalog:react19",
    "@types/react-dom": "catalog:react19",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vitest": "catalog:"
  }
}
```


## 6. Install and verify

```bash
pnpm install
pnpm ls -r --depth -1   # lists every workspace package pnpm discovered
```

`pnpm install` resolves `catalog:` refs against the catalog block and symlinks `@acme/math` from `libs/math`. A missing catalog entry or an unresolved `workspace:*` target fails install immediately — the error tells you exactly what's missing.


## Working with packages day-to-day

```bash
# Add a dep to one package
pnpm add --filter @acme/web zod

# Add a dev dep to the root (available workspace-wide)
pnpm add -Dw <pkg>

# Run a script in every package that has it
pnpm -r --if-present test

# Build all packages
pnpm -r run build

# Run only a subset
pnpm --filter "./apps/*" run build
```


## node-linker: when to switch away from the default

pnpm's default `isolated` linker uses symlinked `node_modules`. This is the correct default — it prevents accidental access to undeclared dependencies. Only switch to `hoisted` if a specific tool (some native loaders, old bundlers) cannot resolve through symlinks:

```ini
# .npmrc — only add this if you have a concrete symlink resolution failure
node-linker=hoisted
```

`hoisted` mimics npm/yarn classic flat layout. Document why you added it — future contributors will wonder.


## Variant: single-app frontend (no workspace members)

A standalone frontend that doesn't share code uses `pnpm-workspace.yaml` only to carry build settings — no `packages:` key needed:

```yaml
onlyBuiltDependencies:
  - '@tailwindcss/oxide'
  - core-js
  - esbuild
```


## Rules to keep

- Internal packages are scoped (`@acme/*`) and wired with `workspace:*`. Never publish them by accident: keep `private: true` or omit the `version` field.
- Every shared third-party dep lives in the catalog and is referenced as `catalog:` or `catalog:<name>` — never a hardcoded version string in a package's own `package.json`.
- `packageManager` is pinned in the root `package.json`; Node is pinned via `.nvmrc` and/or `engines.node`.
- `onlyBuiltDependencies` is an explicit allowlist. Add a package only after reviewing its install scripts.
- `catalogMode: manual` — pnpm will not auto-add new deps to the catalog; you opt in deliberately.
