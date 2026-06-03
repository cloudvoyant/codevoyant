# SvelteKit Config and Build Adapters

## Why this matters

SvelteKit's configuration is the "build plane" of your app — it determines how your code is compiled, which platform it deploys to, how environment variables are handled, and how tests are structured. Getting this wrong means builds that fail in production but pass locally, secrets leaking to the browser, or test environments that don't match production behavior.

This recipe covers everything you need to wire up a production-ready SvelteKit app: scaffold choices, adapter selection, experimental flags, environment variables, Tailwind v4, Vitest client/server split, and the Docker build pipeline.

See the [SvelteKit docs](https://svelte.dev/docs/kit) for the full framework reference — here's what matters for our projects.

## Scaffold and adapter

```bash
npx sv create acme-app
```

Choose: SvelteKit minimal template, TypeScript, prettier, eslint, vitest, tailwindcss, playwright, pnpm.

We always swap `adapter-auto` for `adapter-node` — remote functions and server-side JWT sessions require a real Node server, not a static adapter:

```bash
pnpm remove @sveltejs/adapter-auto
pnpm add -D @sveltejs/adapter-node
```

## `svelte.config.js`

Adapter-node plus the two experimental flags (`async` and `remoteFunctions`). The `vite.ssr.noExternal` list is only needed for deps that ship un-bundled ESM (e.g. `svelte-sonner`).

```js
import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    experimental: {
      remoteFunctions: true,
    },
  },
  // Only needed for deps that ship un-bundled ESM:
  // vite: { ssr: { noExternal: ["svelte-sonner"] } },
};

export default config;
```

## `vite.config.ts`

Tailwind v4 is the `@tailwindcss/vite` plugin — no PostCSS config, no `tailwind.config`. `vite-plugin-devtools-json` silences the Chrome devtools `/.well-known` request in dev.

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  plugins: [devtoolsJson(), tailwindcss(), sveltekit()],
});
```

Install the devtools plugin if the scaffold did not:

```bash
pnpm add -D vite-plugin-devtools-json
```

The Vitest `projects` config (client/server split) merges into this same `defineConfig` — see section 8.

## `tsconfig.json`

The scaffold default is correct; confirm it extends the generated config and is strict. Do not add `paths` here — `$lib` and route aliases come from SvelteKit.

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

## Environment variables

See the [SvelteKit env docs](https://svelte.dev/docs/kit/$env-dynamic-private) for the full API — here's our rule of thumb:

Use `$env/dynamic/private` for secrets and service URLs. It's a runtime lookup that throws at the point of use if the variable is missing, which means a clear error message instead of a cryptic crash deep in the app. Use `$env/static/private` only for compile-time constants like build version metadata — it gets inlined as a string literal at build time so it must exist when you run `pnpm build`.

```ts
// Build-time constant — must exist at build; inlined as a string.
import { PRIVATE_APP_VERSION } from "$env/static/private";

// Runtime lookup — throws at use if missing; good for secrets and URLs.
import { env } from "$env/dynamic/private";
const apiUrl = env.PRIVATE_ITEMS_API_URL;
```

Never access `process.env` directly — SvelteKit's env modules enforce the `PUBLIC_*` / `PRIVATE_*` boundary and prevent secrets from leaking into the browser bundle.

`.env.example` (commit this, never commit `.env`):

```
PUBLIC_LOG_LEVEL=debug
PUBLIC_PRETTY_PRINT=true

PRIVATE_APP_VERSION=
PRIVATE_COMMIT_MESSAGE=
PRIVATE_ITEMS_API_URL=https://items.acme.example.com
PRIVATE_JWT_SECRET=
```

## Tailwind v4 entry — `src/app.css`

Tailwind v4 is configured in CSS, not a JS config file. A minimal entry:

```css
@import "tailwindcss";

@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";
```

For the full design-token setup (`@custom-variant dark`, `:root`/`.dark` CSS variables, `@theme inline` color mapping, custom fonts, base-layer element styles), follow the `tailwind-css` conventions. This recipe only wires the plugin into Vite and imports the stylesheet.

## Vitest — client/server split

Two test projects in `vite.config.ts`: a browser project for `*.svelte.{test,spec}.ts` (Playwright Chromium) and a Node project for everything else. Merge into the `defineConfig` from section 4:

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "client",
          environment: "browser",
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
          },
          include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          exclude: ["src/lib/server/**"],
          setupFiles: ["./vitest-setup-client.ts"],
        },
      },
      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.{test,spec}.{js,ts}"],
          exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
    ],
  },
});
```

## Root layout — `src/routes/+layout.svelte`

Import the stylesheet once at the root. Svelte 5 renders children via the `children` snippet prop.

```svelte
<script lang="ts">
  import "../app.css";

  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
```

## `src/app.html`

Scaffold default is fine. Note `data-sveltekit-preload-data="hover"` for hover preloading:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

## `.npmrc` and engines

Pin Node so the wrong runtime fails fast.

`.npmrc`:

```
engine-strict=true
```

`package.json`:

```json
{
  "type": "module",
  "engines": { "node": ">=22.18.0" },
  "pnpm": {
    "onlyBuiltDependencies": ["@tailwindcss/oxide", "esbuild"]
  }
}
```

## `static/robots.txt`

For an internal/private app, disallow crawling:

```
# disallow all crawling
User-agent: *
Disallow: /
```

## Build output (adapter-node)

`pnpm build` writes to `build/`:

```
build/
├── client/         # static assets (hashed)
├── server/         # SSR bundle
└── index.js        # entry point — `node build/index.js`
```

Run the production server with `node build/index.js`. Honor `PORT`, `HOST`, and `NODE_ENV` env vars at runtime.

## Multi-stage Dockerfile (pnpm + adapter-node)

Four stages: `base` with pnpm 10 + shared store; `prod-deps` (runtime deps only); `build` (full deps, check, build); `runner` (copies `node_modules`, `build/`, `package.json`, runs as `node`). `pnpm fetch` + `--offline --frozen-lockfile` maximizes layer caching.

```dockerfile
FROM node:24-trixie-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /project

RUN npm i -g pnpm@10 && pnpm config set store-dir /pnpm/store

FROM base AS prod-deps
COPY pnpm-lock.yaml package.json ./
RUN pnpm fetch --prod
RUN pnpm install --offline --prod --frozen-lockfile

FROM base AS build
COPY pnpm-lock.yaml package.json ./
RUN pnpm fetch
RUN pnpm install --offline --frozen-lockfile
COPY . .

ARG APP_VERSION
ARG COMMIT_MESSAGE
ENV PRIVATE_APP_VERSION="${APP_VERSION}" \
    PRIVATE_COMMIT_MESSAGE="${COMMIT_MESSAGE}"

RUN pnpm run check
RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

USER node

COPY --chown=node:node --from=prod-deps /project/node_modules ./node_modules
COPY --chown=node:node --from=build /project/build ./build
COPY --chown=node:node package.json ./

EXPOSE 3000
CMD ["node", "build/index.js"]
```

`.dockerignore`:

```
node_modules
.pnpm-store
*-debug.log*
.git
.gitignore
.vscode
.idea
.DS_Store
coverage
playwright-report
test-results
e2e
build
```

`node:24-trixie-slim` is the runtime base; bump system packages in `base` only if a dependency needs them (e.g. fonts for server-side image/PDF rendering).

## Verify

```bash
pnpm install
pnpm run check                                            # svelte-check clean
pnpm lint:check && pnpm format:check                       # lint/format clean
pnpm test:unit -- --run                                    # both vitest projects pass
pnpm build && node build/index.js                          # adapter-node smoke

docker build -t acme-app .
docker run -p 3000:3000 -e PRIVATE_JWT_SECRET=dev acme-app
curl localhost:3000/healthcheck                            # -> OK
```

`pnpm run check` passing (after `svelte-kit sync` generates `.svelte-kit/tsconfig.json` and the remote-function / `$app/server` types) confirms experimental flags and adapter are wired correctly.
