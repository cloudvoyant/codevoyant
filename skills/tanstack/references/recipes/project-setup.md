# Scaffolding a TanStack Start Project

See the [TanStack Start docs](https://tanstack.com/start/latest/docs/overview) for a general framework overview — here's the validated starting configuration and the gotchas the docs don't warn you about clearly enough.

## Why the default getting-started path is dangerous

TanStack Start is not a typical "framework with a CLI". It is a thin integration layer that wires together Vite, Nitro (the SSR server), TanStack Router's file-based code generator, and React. Because so many tools meet in `vite.config.ts`, **plugin order is not optional** — putting `react()` before `tanstackStart()` or adding `@tanstack/router-plugin` as a separate plugin will produce cryptic hydration mismatches or silently generate the wrong route tree.

What goes wrong without the exact config below:
- Vite bundles server code into the client when `tanstackStart()` is missing or mis-ordered
- TypeScript path aliases (`~/`) silently fall back to relative imports, breaking across monorepos
- Forgetting `"type": "module"` in `package.json` causes Node to misparse the Nitro output
- Reading `PRIVATE_*` env vars outside a server function leaks secrets to the browser bundle

## Prerequisites

Node >= 22, an empty directory, `pnpm` (other package managers work identically).

## 1. `package.json`

Start with the exact dependency set below. Pinning the minor version of `vite` and `nitro` prevents cross-version breakage in this pre-1.0 stack.

```json
{
  "name": "@acme/web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "start": "node .output/server/index.mjs"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.90.21",
    "@tanstack/react-router": "^1.168.23",
    "@tanstack/react-start": "^1.167.44",
    "nitro": "3.0.260415-beta",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "tailwindcss": "^4.2.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.1",
    "@tanstack/router-plugin": "^1.167.23",
    "@types/node": "^25.0.10",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "typescript": "~5.9.3",
    "vite": "8.0.0",
    "vite-plugin-svgr": "^4.5.0"
  }
}
```

`@tanstack/router-plugin` is installed but **NOT wired into Vite directly** — `tanstackStart()` includes it internally and generates `src/routeTree.gen.ts`. Adding the plugin separately causes duplicate route tree generation. For the SSR-query bridge (per-request QueryClient, hydrates query cache across SSR) also add `"@tanstack/react-router-ssr-query": "^1.166.9"`.

```bash
pnpm install
```

## 2. `vite.config.ts`

The plugin order here is the single most important line in the whole project. Each plugin in this list has a reason for its position:

- `tanstackStart()` must come first — it owns the SSR entry, sets up the virtual modules Router needs, and wraps the other plugins
- `nitro()` configures the production server and must see the Vite config before `react()` transforms JSX
- `react()` transforms JSX after the framework plugins have claimed their virtual modules
- `svgr()` and `tailwindcss()` are pure asset transforms that can sit last

```ts
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  server: { port: 3000 },
  plugins: [tanstackStart(), nitro(), react(), svgr(), tailwindcss()],
  build: { sourcemap: true },
  resolve: { tsconfigPaths: true },
});
```

Variant — use `vite-tsconfig-paths` explicitly and silence `"use client"`/`"use server"` Rollup warnings (these directives are React Server Component conventions that Rollup does not understand but are harmless):

```ts
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: { port: 3000 },
  plugins: [tsconfigPaths(), tanstackStart(), nitro(), svgr(), react(), tailwindcss()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
    },
  },
});
```

## 3. `tsconfig.json`

The key choices here: `"moduleResolution": "bundler"` is required for Vite — do not use `"node16"` or `"nodenext"`. `"verbatimModuleSyntax": true` catches accidentally-runtime-erased type imports. The `~/*` path alias maps to `src/*` throughout the project.

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["node", "vite/client", "vite-plugin-svgr/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
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

In a monorepo, extend a shared base: `"extends": "../../tsconfig.json"`, keeping only `outDir`/`rootDir`/`types`/`include` overrides. Put `paths` in the base so every package gets `~/` for free.

## 4. `src/styles.css`

```css
@import "tailwindcss";
```

This is the **only CSS file** in the project. Tailwind v4 uses a CSS-first config — theme customization goes in this file via `@theme`, not in a `tailwind.config.js`. Import it in the root route as `import appCss from "../styles.css?url"` and inject via the `head()` function.

## 5. Minimum route files

Create `src/routes/__root.tsx` and `src/routes/index.tsx` — see `router.md` for full contents. `src/routeTree.gen.ts` is auto-generated by `tanstackStart()` on first `dev`/`build` — **never create or edit it by hand**.

## 6. Optional custom server entry — `src/server.ts`

There is no `app.config.ts`. `tanstackStart()` owns the SSR entry. Add `src/server.ts` only for routes that must bypass the framework router (health checks, version endpoints, request logging middleware). We always add it to expose `/healthcheck` and `/version`:

```ts
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export default createServerEntry({
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/healthcheck") {
      return new Response("OK", { status: 200 });
    }

    if (url.pathname === "/version") {
      return new Response(
        JSON.stringify({
          appVersion: process.env.APP_VERSION ?? null,
          commitMessage: process.env.COMMIT_MESSAGE ?? null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const response = await handler.fetch(request);
    if (response.status >= 400) {
      console.error(`${request.method} ${url.pathname} -> ${response.status}`);
    }
    return response;
  },
});
```

## 7. Environment variables

| Prefix | Visibility | How to read |
|---|---|---|
| `PUBLIC_*` | client-safe | server fn read in root loader (see `server-actions.md`) |
| `PRIVATE_*` | server-only | `createServerOnlyFn` or directly inside a server fn handler |

Never reference `PRIVATE_*` from a client component or any non-server module. Vite's module graph analysis will silently inline them into the client bundle if you do.

## 8. Run it

```bash
pnpm dev                    # http://localhost:3000 — generates routeTree.gen.ts
pnpm build && pnpm start    # Nitro at .output/server/index.mjs
```

## Directory layout

```
src/
  router.tsx            getRouter() + Register module augmentation
  routes/
    __root.tsx          root route (shell + client providers)
    index.tsx           "/"
    api/health.ts       server-handler API route (no component)
    (protected)/...     auth-gated route group
  routeTree.gen.ts      GENERATED — never edit
  styles.css            only CSS file; imports Tailwind
  server.ts             optional custom Nitro server entry (health, version, logging)
```

Larger apps add `src/features/<domain>/` for vertical slices and `src/shared/<concern>/` for horizontal utilities (api, auth, components, dev-tools, theme, telemetry).

See `conventions.md` for the complete naming and structure conventions enforced across all TanStack Start projects.
