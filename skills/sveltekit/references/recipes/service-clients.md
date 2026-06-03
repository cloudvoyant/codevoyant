# HTTP Service Clients

## Why this matters

Feature services need to fetch data from external HTTP APIs (backend services, third-party APIs). Without a structured approach, you end up with raw `fetch()` calls scattered across the codebase, no type safety on request or response shapes, and inconsistent error handling.

The pattern here uses `openapi-fetch` with types generated from OpenAPI/Swagger specs. The key benefit: **a wrong URL path, missing parameter, or incorrect request body is a TypeScript error at the call site** — caught before the code runs, not in production logs.

What goes wrong without this:
- Typos in API path strings produce runtime errors that are hard to trace
- Response shapes are typed as `any` or `unknown`, so data errors surface far from where the call was made
- Auth headers are added inconsistently across different fetch calls
- When an API changes, there's no automated way to find all affected call sites


## Where service clients fit in the architecture

```
feature service (libs/feature-X/src/services/)
    ↓ imports
service client (src/lib/services/<svc>/client.ts)
    ↓ uses
generated OpenAPI schema (src/lib/services/<svc>/schema.d.ts)
```

Generated schemas and clients are **shared infrastructure** — they live in `src/lib/services/<svc>/`, not inside any single feature lib. Feature services import them to fetch data, then transform that data into view models. Remote functions in `src/routes/api/` also import clients directly for 1:1 endpoint mappings.

Never import a service client from a client-side component — these modules read `PRIVATE_*` environment variables and are server-only.


## Prerequisites

```bash
pnpm add openapi-fetch
pnpm add -D openapi-typescript picocolors
```


## File layout

```
src/lib/services/
├── middleware.ts                          # shared auth/identity middleware
├── items/
│   ├── items-api-schema.d.ts              # generated from Swagger spec — do not edit
│   └── items-api-client.ts                # configured client
└── files/
    ├── files-api-schema.d.ts
    └── files-api-client.ts
```


## Step 1: Generate types from the Swagger spec

Create a codegen script at `cli/swagger-typegen.ts`. This script fetches the OpenAPI spec from each upstream API and generates TypeScript types:

```ts
import { execSync } from "node:child_process";
import { join } from "node:path";

import pc from "picocolors";

interface SwaggerSource {
  url: string;
  name: string;
  outputDir: string;
  outputFilename: string;
}

const sources: SwaggerSource[] = [
  {
    url: "https://items.acme.example.com/swagger/v1/swagger.json",
    name: "items-api",
    outputDir: "./src/lib/services/items",
    outputFilename: "items-api-schema.d.ts",
  },
];

function processSource(source: SwaggerSource): boolean {
  const outputPath = join(source.outputDir, source.outputFilename);
  try {
    execSync(`openapi-typescript "${source.url}" -o "${outputPath}"`, { stdio: "pipe" });
    console.log(pc.green(`+ ${source.name}`));
    return true;
  } catch (error) {
    const stderr = error instanceof Error ? error.message : String(error);
    if (stderr.toLowerCase().includes("econnrefused")) {
      console.error(pc.red(`x ${source.name}`) + pc.dim(` - cannot connect to ${source.url}`));
    } else {
      console.error(pc.red(`x ${source.name}`) + pc.dim(" - failed to generate types"));
    }
    return false;
  }
}

console.log(pc.bold("Generating swagger types...\n"));

const failed = sources.filter((source) => !processSource(source));
if (failed.length > 0) {
  console.log(pc.red(`\nFailed to generate types for ${failed.length} source(s).\n`));
  process.exit(1);
}
```

Add the script to `package.json` and run it whenever an upstream API changes:

```json
{
  "scripts": {
    "swagger-typegen": "node cli/swagger-typegen.ts"
  }
}
```

```bash
pnpm swagger-typegen
```

The generated `*-schema.d.ts` files are committed to the repo. When the upstream API changes, regenerate them and TypeScript will immediately flag all affected call sites.


## Step 2: Shared middleware

A single `Middleware` injects standard client-identity headers on every request. Put it in `src/lib/services/middleware.ts`:

```ts
import type { Middleware } from "openapi-fetch";

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    request.headers.set("X-Acme-Client", "acme-app");
    request.headers.set("X-Acme-On-Behalf-Of", "acme-app-api@acme.example.com");
    return request;
  },
  async onResponse({ response }) {
    return response;
  },
  async onError({ error }) {
    return new Error("Request failed", { cause: error });
  },
};
```


## Step 3: Configure the client

`createClient<paths>` is typed by the generated `paths`. The `baseUrl` comes from a `PRIVATE_*` env var so a missing URL throws at use time, not at import time:

```ts
// src/lib/services/items/items-api-client.ts
import createClient from "openapi-fetch";

import { env } from "$env/dynamic/private";

import { authMiddleware } from "../middleware";
import type { components, paths } from "./items-api-schema";

export const itemsApiClient = createClient<paths>({
  baseUrl: env.PRIVATE_ITEMS_API_URL,
});

itemsApiClient.use(authMiddleware);

// Re-export schema types that callers need
export type ItemStatus = components["schemas"]["ItemStatus"];
```


## Step 4: Call the client from a feature service or remote function

Always destructure `{ data, response }` and check both. `openapi-fetch` does not throw on non-2xx status — `response.ok` is false, and `data` is undefined. Missing this check silently swallows errors.

```ts
const { data, response } = await itemsApiClient.POST("/items", {
  body: { name, status: "active" as ItemStatus },
  params: { header: { "X-Acme-Tenant-Key": `workspace=${itemId}` } },
});

if (!data || !response.ok) {
  error(500, "Failed to create item");
}
```

The `as ItemStatus` cast is safe here because `ItemStatus` is derived from the generated schema — it's not a hand-declared type. See `service-clients.md` step 3 for how `ItemStatus` is re-exported from the client module.


## Step 5 (optional): Instrumented fetch for non-OpenAPI calls

For HTTP calls that have no Swagger spec, a thin `ky` wrapper that logs a trace ID and request duration keeps observability consistent. Create `src/lib/server/http-client.ts`:

```ts
import ky from "ky";

import { logger } from "$lib/logger";

export const httpClient = ky.extend({
  hooks: {
    beforeRequest: [
      (request) => {
        const traceId = crypto.randomUUID();
        request.headers.set("x-trace-id", traceId);
        request.headers.set("x-request-start", String(performance.now()));
        logger.debug(
          { event: "http.client.start", traceId, method: request.method, url: request.url },
          "HTTP request started",
        );
      },
    ],
    afterResponse: [
      (request, _options, response) => {
        const start = Number(request.headers.get("x-request-start"));
        logger.debug(
          {
            event: "http.client.success",
            traceId: request.headers.get("x-trace-id") ?? undefined,
            durationMs: Math.round(performance.now() - start),
            url: request.url,
            status: response.status,
          },
          "HTTP request completed",
        );
        return response;
      },
    ],
  },
});
```

Install with `pnpm add ky`.


## Verify

```bash
pnpm swagger-typegen   # generates src/lib/services/items/items-api-schema.d.ts
pnpm run check         # client + all call sites type-check against the generated paths
```
