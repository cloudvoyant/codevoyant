# Code Quality: ESLint, Prettier, and Pre-commit Hooks

## Why this matters

Without automated enforcement, code style reviews become noise in pull requests: reviewers spend attention on import order and semicolons instead of logic. The combination here — ESLint catching real bugs and anti-patterns, Prettier enforcing formatting, and a pre-commit hook making both run automatically — means style violations never reach CI. The reviewer sees consistently formatted code and can focus on what matters.

The module-boundary rule (`no-restricted-imports` on `features/**`) is the structural convention that prevents feature spaghetti: it's impossible to deep-import across feature directories at the lint level, before any architecture review is needed.

This recipe uses ESLint + Prettier. Not Biome.

**Prerequisites:** a package with `package.json` and `tsconfig.json`.


## Node / library package (no React)

### 1. Install dev deps

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-simple-import-sort globals prettier
```

### 2. Create `eslint.config.ts`

ESLint 9 reads `eslint.config.ts` natively when the package has `"type": "module"` and TypeScript is available. For non-TS-aware setups, name it `eslint.config.js`.

`parserOptions.projectService: true` enables type-aware rules (like `@typescript-eslint/no-deprecated`) by letting ESLint find your `tsconfig.json` automatically.

```ts
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

const sortImports = {
  plugins: { "simple-import-sort": simpleImportSort },
  rules: {
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
  },
};

export default defineConfig([
  globalIgnores(["**/dist/**", "**/node_modules/**", "**/.platform/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-deprecated": "warn",
    },
  },
  sortImports,
]);
```


## React app package

### 1. Install React-stack dev deps (in addition to the node deps above)

```bash
pnpm add -D @eslint-react/eslint-plugin eslint-plugin-react-hooks eslint-plugin-react-refresh \
  @tanstack/eslint-plugin-query @tanstack/eslint-plugin-router
```

### 2. Create `eslint.config.ts`

The key additions beyond the node config:
- `@eslint-react` for component-level rules
- `react-hooks` to catch violations of hook rules that React's runtime only reports at runtime
- `react-refresh` to catch exports that would break HMR
- TanStack Query and Router plugins to catch common API misuse statically

```ts
import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

const sortImports = {
  plugins: { "simple-import-sort": simpleImportSort },
  rules: {
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
  },
};

export default defineConfig([
  globalIgnores(["dist", "routeTree.gen.ts", "mockServiceWorker.js", ".output"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite({
        extraHOCs: ["createFileRoute", "createRootRouteWithContext"],
      }),
      eslintReact.configs["recommended-typescript"],
      pluginRouter.configs["flat/recommended"],
      pluginQuery.configs["flat/recommended"],
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "react-hooks/incompatible-library": "off",
      "@tanstack/query/exhaustive-deps": "off",
    },
  },
  // Module-boundary rule: code in features/** and shared/** must not deep-import another feature.
  // This is enforced statically at lint time — architecture violations show up immediately, not in review.
  // Pair with a `~/*` → `./src/*` path alias in tsconfig.json.
  {
    files: ["**/features/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: ["~/features/*"] }] },
  },
  {
    files: ["**/shared/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: ["~/features/*"] }] },
  },
  // UI libs intentionally re-export many components — relax react-refresh for them
  {
    files: ["libs/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
      "@eslint-react/no-array-index-key": "off",
    },
  },
  sortImports,
]);
```


## Prettier

### 1. `prettier.config.js`

```js
//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  trailingComma: "all",
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/styles.css",
  tailwindFunctions: ["cva", "cn"],
};

export default config;
```

For a non-Tailwind package, drop the `plugins` and `tailwind*` keys and keep `trailingComma: "all"` as the only override from Prettier defaults.

### 2. `.prettierignore`

```
# Dependency Lock Files
package-lock.json
pnpm-lock.yaml
pnpm-workspace.yaml
yarn.lock
bun.lock

# Generated Files
routeTree.gen.ts
generated.ts
dist
```


## Scripts

Convention: `<verb>` auto-fixes; `<verb>check` is the read-only CI gate. This separates "fix my code" (developer workflow) from "verify nothing is wrong" (CI gate).

Minimal app:

```jsonc
"scripts": {
  "lint": "eslint . --fix",
  "format": "prettier . --write",
  "check": "pnpm run lint && pnpm run format"
}
```

Full CI-grade set — separates fix from check for each tool:

```jsonc
"scripts": {
  "lint": "eslint . --fix",
  "lintcheck": "eslint .",
  "format": "prettier . --write",
  "formatcheck": "prettier . --check",
  "typecheck": "tsc --noEmit",
  "fix": "pnpm run lint && pnpm run format",
  "check": "pnpm run typecheck && pnpm run lintcheck && pnpm run formatcheck"
}
```

At the workspace root, run ESLint and Prettier across everything, and fan out type-checking to each package:

```jsonc
"scripts": {
  "lint": "eslint . --fix",
  "format": "prettier . --write",
  "type-check": "pnpm -r type-check"
}
```


## Pre-commit hooks: husky + lint-staged

### Why pre-commit hooks instead of relying on CI

CI catches violations after the push — the feedback loop is slow. A pre-commit hook catches violations before the commit exists, giving immediate feedback. With `lint-staged`, only staged files are checked, so even large repos stay fast.

### 1. Install

```bash
pnpm add -Dw husky lint-staged
pnpm exec husky init
```

`husky init` creates `.husky/pre-commit` with a placeholder. Replace it:

```bash
# .husky/pre-commit
pnpm exec lint-staged
```

### 2. Configure `lint-staged` in the root `package.json`

```jsonc
"lint-staged": {
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ]
}
```

`lint-staged` passes only the staged files to each command — fast even in large repos. Commands run sequentially per glob; a failure aborts the commit and leaves the working tree intact so you can fix and re-stage.

### 3. Verify

```bash
pnpm run lint     # auto-fixes import order and lint issues across the whole package
pnpm run format   # rewrites files to Prettier style
git commit -m "test"   # triggers lint-staged on staged files only
```

To confirm `simple-import-sort` fires: deliberately mis-order two imports, stage the file, and run `pnpm run lint`. To confirm the hook works: make a staged change with mis-ordered imports and attempt `git commit` — the commit should be aborted with the lint error.


## Conventions to keep

- Use ESLint flat config (`eslint.config.ts`) with `parserOptions.projectService: true` for type-aware rules.
- `simple-import-sort` is always enabled as `"error"` — import order is not a style choice.
- The module-boundary rule (`no-restricted-imports` on `features/**` and `shared/**`) is the structural convention that prevents feature coupling. Don't remove it; adjust the paths if your feature structure differs.
- Naming: `lint` / `format` for fix; `lintcheck` / `formatcheck` / `typecheck` for CI gates; `check` for the full CI gate bundle.
- husky + lint-staged at the workspace root catches issues before they reach CI.
