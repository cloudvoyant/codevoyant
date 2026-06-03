# Publishing TypeScript Packages

## Why this matters

Publishing a TypeScript package is harder than it looks because consumers use it in three different environments: modern bundlers that support `exports`, legacy tools that only read `main`, and TypeScript itself that needs to find declaration files. Get the `package.json` shape wrong and your package works in your own project but silently breaks for consumers.

The second trap is auth: mixing `pnpm publish` quirks with GitLab's project-level registry in CI produces intermittent token failures. This recipe gives you a deterministic path through both npm and GitLab, covering the build, the `package.json` fields, registry auth, and versioning.

**Prerequisites:** a package that builds to `dist/` (using `tsup`, `tsdown`, or `tsc`). For GitLab: a token with `write_package_registry`.


## 1. Shape `package.json` for registries

The fields below are what registries and package consumers actually read. Get these right before you think about the build tool.

```jsonc
{
  "name": "@acme/service-client",
  "version": "0.0.1",
  "private": false,             // MUST be false to publish
  "type": "module",
  "main": "./dist/index.cjs",    // legacy CJS entry (for tools that don't read "exports")
  "module": "./dist/index.mjs",  // legacy ESM entry (for bundlers that don't read "exports")
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],   // allowlist — anything not listed is excluded from the tarball
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --clean"
  }
}
```

Key decisions:
- `exports` is the authoritative resolver for modern tools. `main`/`module`/`types` are fallbacks for older ones.
- For dual ESM/CJS, emit per-format `.d.mts` / `.d.cts` declaration files so TypeScript picks the right one per condition.
- `files` is an allowlist, not a blocklist. Verify it with `npm pack --dry-run` before the first real publish.


## 2. Build the library

Three options — pick based on your needs:

### Option A: `tsup` (fastest, esbuild-based)

Best for most packages. Zero config to get started, fast due to esbuild.

```bash
pnpm add -D tsup
pnpm exec tsup src/index.ts --format esm,cjs --dts --clean
```

### Option B: `tsdown` (rolldown-based, workspace-aware)

Better for monorepo libs that use the `dev`/`default` conditional-exports pattern — `tsdown` understands workspace source resolution.

```ts
// tsdown.config.ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
});
```

### Option C: raw `tsc` (one format only)

Use when you need full TypeScript compiler control or emit only ESM. For dual-format, you need two tsconfigs:

```jsonc
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "outDir": "dist", "declaration": true, "module": "ESNext" },
  "include": ["src/**/*"]
}
```


## 3. Configure auth for your target registry

### Public npm

Nothing scope-specific is needed. `npm login` covers it. On first publish of a scoped package, pass `--access public` (see step 4).

### GitLab project-level registry

Add a `.npmrc` file in the package directory (not the repo root, unless all packages share the same registry):

```ini
@acme:registry=https://gitlab.com/api/v4/projects/12345678/packages/npm/
//gitlab.com/api/v4/projects/12345678/packages/npm/:_authToken=${NPM_AUTH_TOKEN}
always-auth=true
```

Two important decisions here:
- Hardcode the numeric project id (`12345678`) — do not derive it from `$CI_PROJECT_ID`. This way the `.npmrc` works correctly in forks and scaffolded copies.
- `always-auth=true` sends the token on reads too, which is required for private scopes.

In CI, set the token from the job token (no secrets needed):

```yaml
script:
  - export NPM_AUTH_TOKEN="$CI_JOB_TOKEN"
  - pnpm run build
  - npm publish
```


## 4. Publish

### Public scope (first publish of a scoped package)

```bash
pnpm publish --access public
```

`--access public` is required exactly once — for the first publish of a scoped package on the public npm registry. After that, the scope's access setting is remembered.

### Private / GitLab registry

Add `publishConfig` to `package.json` so the registry and access level are always deterministic, regardless of the user's local `.npmrc`:

```jsonc
"publishConfig": {
  "registry": "https://gitlab.com/api/v4/projects/12345678/packages/npm/",
  "access": "restricted"
}
```

Then publish normally — `publishConfig` overrides any user-level `.npmrc`:

```bash
npm publish
# or
pnpm publish
```

### Prerelease (rc on non-main branches)

Use a dist-tag so existing consumers on `latest` don't auto-upgrade to a prerelease:

```bash
npm version --no-git-tag-version "1.4.0-rc.20260601-1430"
npm publish --tag rc
```

Consumers who want the prerelease install with `@rc`: `pnpm add @acme/service-client@rc`.


## 5. Versioning across a monorepo with Changesets

When multiple packages publish together, manually keeping versions in sync is error-prone. Changesets automates the version-bump-and-publish flow:

```bash
pnpm add -Dw @changesets/cli
pnpm exec changeset init
```

The workflow:
1. **During development:** contributors run `pnpm exec changeset` to record intent — which packages changed, how (patch/minor/major), and a human-readable summary. This creates a small file in `.changeset/`.
2. **CI opens a version PR:** `changeset version` reads those files, bumps each affected `package.json`, and updates `CHANGELOG.md`.
3. **On merge:** `changeset publish` publishes every package whose version moved.

The `.changeset/` files are the audit trail — they live in source control and accumulate until the version PR is merged.


## Variant: in-repo lib that is never published

For a `libs/*` package consumed only via `workspace:*`, skip the publish flow entirely. Use the `dev`/`default` conditional-exports pattern so the package resolves to TypeScript source during development and to the built `dist` in production:

```jsonc
{
  "name": "@acme/geometry",
  "type": "module",
  "exports": {
    ".": {
      "dev": "./src/index.ts",       // resolved when the "dev" condition is active (dev server, tests)
      "default": "./dist/index.mjs"  // resolved everywhere else
    },
    "./package.json": "./package.json"
  },
  "publishConfig": {
    "exports": {
      ".": "./dist/index.mjs"        // applied only at publish time: strips the "dev" condition
    }
  }
}
```

The dev server and test runner activate `dev` and read `src/` directly — no rebuild needed on save. A prod consumer (or a published copy) resolves to `dist`.


## Gotchas

- **Use `npm publish` over `pnpm publish` for GitLab.** The build can be `pnpm run build`, but `npm publish` has fewer auth-token edge cases with GitLab's project registry.
- **`private: false` is required to publish.** In-repo `workspace:*` libs should keep `private: true` (or omit `version`) so they're never published by accident.
- **Restore `package.json` after `npm version`.** After an in-place version bump, restore the working tree: `trap 'git checkout -- package.json' EXIT`.
- **Hardcode the GitLab project id** in both `.npmrc` and `publishConfig.registry`. Never derive from `$CI_PROJECT_ID`.
- **Verify `files` with `npm pack --dry-run`** before the first real publish. It's easy to accidentally exclude `dist/` or include secrets.
