# React + Vite Project Setup

See the [Vite docs](https://vite.dev/guide/) for general Vite setup and the [TypeScript docs](https://www.typescriptlang.org/tsconfig/) for compiler option reference — here's what matters for our projects:

## Why the defaults are wrong

The default Vite React-TS template (`pnpm create vite`) creates two tsconfig files (`tsconfig.json` + `tsconfig.app.json`) and leaves several footguns enabled. We replace it entirely with a single strict config. The two categories of problems this prevents:

1. **Silent type bugs.** The default template allows `arr[i]` without undefined handling, does not require type-only imports to be marked, and permits TypeScript-only runtime constructs that esbuild cannot strip.

2. **Structural drift.** Without an import alias and ESLint feature isolation enforced from day one, features start importing each other after the first month. By the time you notice, the coupling is everywhere.


## 1. Scaffold

```bash
pnpm create vite@latest acme-web --template react-ts
cd acme-web
pnpm install
```

## 2. Install toolchain

```bash
# linting
pnpm add -D @eslint/js typescript-eslint eslint eslint-plugin-react-hooks \
  eslint-plugin-react-refresh eslint-plugin-simple-import-sort globals \
  @eslint-react/eslint-plugin @tanstack/eslint-plugin-query

# formatting + tailwind plugin (Tailwind itself: see shadcn-tailwind.md)
pnpm add -D prettier prettier-plugin-tailwindcss

# node types for config files
pnpm add -D @types/node
```

If using TanStack Router, also add `@tanstack/eslint-plugin-router`.

## 3. `tsconfig.json` — single strict config

Replace the scaffolded `tsconfig.json` entirely. One file, no split `tsconfig.app.json`:

```jsonc
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2023",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["node", "vite/client", "vite-plugin-svgr/client"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": { "~/*": ["./src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

**Why each load-bearing flag matters:**

- `verbatimModuleSyntax: true` — every type import MUST be marked `import type` or `import { type X }`. This prevents accidentally importing runtime values when you only needed the type, which can cause bundle bloat and circular-dependency bugs.
- `noUncheckedIndexedAccess: true` — `arr[i]` is typed `T | undefined`; you must handle the undefined case. Without this, array index access is a silent footgun.
- `erasableSyntaxOnly: true` — bans TypeScript-only runtime constructs like enums and parameter properties. These constructs can't be stripped by tools like `esbuild`; use `const` objects and explicit constructor params instead.
- `paths: { "~/*": ["./src/*"] }` — the single import alias used everywhere. See section 6 for Vite wiring.

## 4. `eslint.config.js` — flat config with feature isolation

```js
import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginQuery from "@tanstack/eslint-plugin-query";
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
      reactRefresh.configs.vite,
      eslintReact.configs["recommended-typescript"],
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
  // FEATURE ISOLATION — see folder-structure.md
  {
    files: ["**/features/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: ["~/features/*"] }] },
  },
  {
    files: ["**/shared/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: ["~/features/*"] }] },
  },
  sortImports,
]);
```

The two `no-restricted-imports` blocks are the load-bearing feature isolation rule. A feature can't import another feature, and `shared/` can't import any feature. This prevents circular dependencies and enforces the architectural boundary described in `folder-structure.md`.

## 5. `prettier.config.js`

```js
// @ts-check

/** @type {import('prettier').Config} */
const config = {
  trailingComma: "all",
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/styles.css",
  tailwindFunctions: ["cva", "cn"],
};

export default config;
```

`tailwindFunctions: ["cva", "cn"]` tells `prettier-plugin-tailwindcss` to sort classes inside `cva(...)` and `cn(...)` calls — not just JSX `className` attributes.

## 6. `vite.config.ts`

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  server: { port: 3000 },
  plugins: [react(), svgr(), tailwindcss()],
  resolve: { tsconfigPaths: true },
  build: { sourcemap: true },
});
```

`resolve.tsconfigPaths: true` makes Vite honor the `~/*` alias from `tsconfig.json` (Vite 7+). On older Vite, install `vite-tsconfig-paths` and put `tsconfigPaths()` first in `plugins`.

## 7. `package.json` scripts

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --fix",
    "lintcheck": "eslint .",
    "format": "prettier . --write",
    "formatcheck": "prettier . --check --log-level warn",
    "check": "pnpm run typecheck && pnpm run lintcheck && pnpm run formatcheck"
  }
}
```

The `check` script is used in CI. Run it locally before every PR.

## Verify

```bash
pnpm run typecheck
pnpm run lintcheck
pnpm run dev
```

Next: set up the folder structure (`folder-structure.md`), then add coding conventions (`conventions.md`).
