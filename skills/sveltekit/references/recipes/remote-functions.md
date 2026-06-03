# Server-Side Remote Functions

Remote functions are a SvelteKit experimental feature — see the [SvelteKit remote functions docs](https://svelte.dev/docs/kit/remote-functions) for the full API. Here's how we use them and what we've learned.

## Why this matters

SvelteKit has two classic ways to run server-side code: form actions (in `+page.server.ts`) and route handlers (`+server.ts`). Form actions only work with HTML `<form>` submits. Route handlers work with any HTTP request but require manual request/response wiring with no type safety on inputs.

Remote functions are a third option: **plain async TypeScript functions that run on the server but can be called from anywhere** — load functions, components, or other server modules. SvelteKit generates the client/server transport automatically. You get full type safety with none of the REST boilerplate.

What remote functions replace:
- Writing a `+server.ts` just to handle a button click that needs server access
- Using form actions for non-form interactions (like "create new item" buttons)
- Untyped client `fetch()` calls to manually-declared API routes

When to still use form actions: HTML `<form>` submits with progressive enhancement (works without JavaScript). See `feature-lib-forms.md`.

Enable in `svelte.config.js` with `kit.experimental.remoteFunctions: true` (see `config-and-build.md`).

## The two primitives and when to use each

- **`query(schema, handler)`** — for reads. Takes a Zod schema; the validated, typed payload is passed to the handler. Always validate input.
- **`command(handler)`** — for writes. No input schema; validate inside if it takes arguments. Use `getRequestEvent()` to access cookies, headers, and locals.

Both run server-side only. Both are callable as plain async functions from `.ts`, `.svelte`, and load functions.

```bash
pnpm add zod
```

## Where remote functions live in the feature-slice architecture

```
+page.server.ts  ->  feature server.ts  ->  *.remote.ts query  ->  service client (openapi-fetch)
                                                |
                                                +->  checkAuthorized query (from session.remote.ts)
```

`*.remote.ts` files belong with the route they serve (`src/routes/api/items.remote.ts`), not inside feature libs. Feature `server.ts` can call remote queries directly for cross-cutting reads, or call services and bypass remote functions when no client invocation is needed. Components call remote functions directly (not through feature `server.ts`) when they need on-demand data or write actions.

## A read: `query`

```ts
// src/routes/api/items.remote.ts
import { error } from "@sveltejs/kit";
import * as z from "zod";

import { query } from "$app/server";
import { itemsApiClient } from "$lib/services/items/items-api-client";

export const getItem = query(z.object({ itemId: z.string() }), async ({ itemId }) => {
  const { data, response } = await itemsApiClient.GET("/items/{id}", {
    params: { path: { id: itemId } },
  });

  if (!data || !response.ok) {
    error(500, "Failed to load item");
  }

  return data;
});
```

Notes:

- `import * as z from "zod"` (zod v4 namespace style; `z.string()`, `z.nanoid()`, `z.enum([...])`).
- Throw with SvelteKit's `error(status, message)` for failures — it propagates to the caller.
- A `query` taking no input omits the schema: `query(async () => { ... })`.

## A write: `command`

`command` has no input schema arg. Use `getRequestEvent()` from `$app/server` to reach cookies, headers, and locals.

```ts
import { nanoid } from "nanoid";

import { command, getRequestEvent } from "$app/server";
import { logger } from "$lib/logger";

export const createItem = command(async () => {
  const { cookies } = getRequestEvent();

  const itemId = nanoid();
  logger.info({ event: "item.create.request", itemId }, "Creating item");

  cookies.set("last_item", itemId, { path: "/" });
  return itemId;
});
```

## Calling from a load function

Remote functions are just async functions. Call them directly in `+page.ts` / `+layout.ts` load functions and `await Promise.all` for parallel reads:

```ts
// src/routes/items/[itemId]/+page.ts
import { getItem } from "../../api/items.remote";

export async function load({ params }) {
  const item = await getItem({ itemId: params.itemId });
  return { item };
}
```

## Calling from a component

```svelte
<script lang="ts">
  import { goto } from "$app/navigation";

  import { createItem } from "../api/items.remote";

  async function onCreate() {
    const itemId = await createItem();
    await goto(`/items/${itemId}`);
  }
</script>

<button onclick={onCreate}>New item</button>
```

## Redirect from a load function

Use `redirect(status, path)` (it throws). Build the path with `resolve` from `$app/paths` so the eslint `no-navigation-without-resolve` rule stays happy:

```ts
// src/routes/+layout.server.ts
import { redirect } from "@sveltejs/kit";

import { resolve } from "$app/paths";

export function load({ url }) {
  if (url.pathname === "/") {
    redirect(307, resolve("/items"));
  }
}
```

## When to use `+server.ts` instead

Use a route handler only for streaming or raw HTTP responses that remote functions cannot model — for example proxying a token-streamed AI/LLM response. Reuse the same remote functions for auth checks inside the handler:

```ts
// src/routes/api/stream/+server.ts
import { checkAuthorized } from "../session.remote";

export async function POST({ request }) {
  const { itemId, prompt } = await request.json();
  await checkAuthorized({ itemId });

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generateChunks(prompt)) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain" } });
}
```

## When to use remote functions vs form actions

| Need | Use |
|---|---|
| Typed read from a load function | `query` |
| Typed write triggered by a button | `command` |
| Form submit with progressive enhancement | form action in `+page.server.ts` (see `feature-lib-forms.md`) |
| Raw streaming response | `+server.ts` handler |

## Verify

```bash
pnpm run check   # types for $app/server and .remote.ts must resolve
pnpm dev
```

Hit a page whose `load` calls a `query`, and trigger a `command` from a button. Requests to the generated remote endpoints appear in devtools; the returned values are fully typed at the call site.
