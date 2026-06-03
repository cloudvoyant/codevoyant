# Managing Shared Dependencies with pnpm Catalogs

## Why this matters

Hardcoded version strings in individual `package.json` files cause drift: one package bumps React to 19, another stays on 18, and the conflict only surfaces in production. pnpm catalogs make shared dependency versions a first-class declaration — one place to change, all packages move together. When you upgrade Zod from v3 to v4, you edit a single line in `pnpm-workspace.yaml` rather than hunting through every package.

Catalogs also address supply-chain risk at install time. The `onlyBuiltDependencies` allowlist blocks `postinstall` scripts from running unless you have explicitly vetted them — a compromised package cannot execute arbitrary code during `pnpm install` unless it is named in your allowlist. The `minimumReleaseAge` guard refuses to install any version published less than 24 hours ago, which closes the typosquatting window where attackers publish malicious versions right after a legitimate release.


## Default catalog

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
```

In a package's `package.json`, reference the catalog entry instead of a version string:

```jsonc
{
  "dependencies": { "zod": "catalog:" },
  "devDependencies": { "typescript": "catalog:" }
}
```


## Named catalogs

Named catalogs group packages that must upgrade together — reference them as `catalog:<name>`. The clearest example is React: `react`, `react-dom`, `@types/react`, and `@types/react-dom` must all move to the same major version at the same time. A named catalog enforces that constraint.

```yaml
# named catalogs group versions that must upgrade as a unit — reference as "catalog:react19"
catalogs:
  react19:
    '@types/react': ^19.2.14
    '@types/react-dom': ^19.2.3
    react: ^19.2.6
    react-dom: ^19.2.6
```

In a package's `package.json`:

```jsonc
{
  "dependencies": {
    "react": "catalog:react19",
    "react-dom": "catalog:react19"
  },
  "devDependencies": {
    "@types/react": "catalog:react19",
    "@types/react-dom": "catalog:react19"
  }
}
```

All four React packages upgrade together or not at all. If you only bump `react` in the catalog, `react-dom` stays pinned to the same named entry — no partial upgrades.


## `onlyBuiltDependencies`

`onlyBuiltDependencies` is a security allowlist. pnpm blocks `postinstall` scripts from running by default; packages you name here are the only ones permitted to execute install-time scripts. This prevents a compromised or malicious transitive dependency from running arbitrary code during `pnpm install`.

```yaml
onlyBuiltDependencies:
  - esbuild
  - msw
  - unrs-resolver
```

Mirror the allowlist in `.npmrc` so both pnpm and npm CLI agree:

```ini
ignore-scripts=false
only-built-dependencies[]=koffi
only-built-dependencies[]=esbuild
```

Add a package to this list only after reviewing what its install script actually does. Treat every addition as a deliberate trust decision.


## `minimumReleaseAge`

The typosquatting attack window is narrow but real: attackers publish a malicious version of a popular package and wait for automated dependency updates to pull it in. `minimumReleaseAge` closes that window by refusing to resolve any package version published less than the specified number of minutes ago.

```yaml
# supply-chain guard: refuse to install any version published less than 24h ago
minimumReleaseAge: 1440 # 24 hours
```

A 24-hour delay gives the community time to spot and report a bad publish before your monorepo installs it. Legitimate releases are unaffected — they age out of the window within a day.


## `catalogMode: manual`

```yaml
# pnpm does NOT auto-add new deps to the catalog; you opt in deliberately
catalogMode: manual
```

With `catalogMode: manual`, running `pnpm add zod` in a package does not automatically move the version into the catalog. You add it to the catalog explicitly when you decide it should be shared. This is safer than auto mode: auto-promotion can silently move a version into the catalog from a package that needed an unusual pin, then apply that pin across the entire repo.

Use `manual` as the default. Promote a dep to the catalog as a deliberate step when you know it should be shared.


## Day-to-day catalog workflows

```bash
# Add a dep to the catalog: edit pnpm-workspace.yaml manually, then reference it
# In pnpm-workspace.yaml:
#   catalog:
#     zod: ^4.4.3
# In the package's package.json:
#   "zod": "catalog:"

# Bump a shared dep for all packages at once: change the version in the catalog
# In pnpm-workspace.yaml:
#   catalog:
#     zod: ^4.5.0   ← single edit, every package picks it up on next install
pnpm install

# Check what version a catalog entry resolves to
pnpm why zod --filter @acme/web
```

When you update a catalog entry, run `pnpm install` from the repo root. pnpm re-resolves all `catalog:` references against the updated entry and updates `pnpm-lock.yaml` in one pass.


## Rules to keep

- Every shared third-party dep lives in the catalog and is referenced as `catalog:` or `catalog:<name>` — never a hardcoded version string in a package's own `package.json`.
- `onlyBuiltDependencies` is an explicit allowlist. Add a package only after reviewing its install scripts.
- `catalogMode: manual` — pnpm will not auto-add new deps to the catalog; you opt in deliberately.
- Use named catalogs for any group of packages that must upgrade as a unit (React, testing frameworks, etc.).
