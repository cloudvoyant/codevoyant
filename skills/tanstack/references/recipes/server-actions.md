# Server Functions and Validation

See the [TanStack Start server functions docs](https://tanstack.com/start/latest/docs/framework/react/server-functions) for the full API — here's the opinionated layout and patterns we use in production:

## Why this matters

When you build a React app with TanStack Start, you need code that only ever runs on the server — database queries, secret reads, upstream API calls authenticated with private keys. The naive approach is to create a REST endpoint and call it from the client. But that means writing two things: the endpoint handler and the client-side fetch wrapper, keeping their types in sync manually.

`createServerFn` solves this differently. You write a typed function. TanStack Start automatically splits it at build time — the server gets the real implementation, the client gets a typed RPC stub that serializes arguments and calls the server over HTTP. You never write `fetch` manually. TypeScript enforces the contract end-to-end.

The second problem it solves is **middleware composition**. Auth, logging, and tenant isolation are cross-cutting concerns. Without a middleware layer, you copy-paste token verification into every function. The `.middleware([...]).inputValidator(zod).handler(async (ctx) => ...)` chain lets you declare these once and compose them declaratively.

What goes wrong without these patterns:
- Reading `process.env.PRIVATE_*` outside a server fn — Vite inlines it into the client bundle (secret leak)
- Not using `createServerOnlyFn` for helpers that build upstream clients — the client library ends up in the browser bundle
- Skipping input validation — runtime errors instead of typed, user-friendly error messages
- Passing tokens via `ctx.data` instead of headers — the auth middleware cannot read them

## Suggested file layout

Mirror a `services/` workspace library per domain. This layout co-locates everything a domain needs: its RPC functions, schemas, query keys, and client-side hooks.

```
services/
  server.ts            shared server helpers (env, headers, error middleware)
  middleware.ts        JWT-verify auth middleware
  items/
    server.ts          createServerFn (RPC) + server-only upstream client
    schema.ts          Zod input schemas
    key.ts             typed query-key factory
    client.ts          useServerFn + useQuery/useMutation hooks
```

## 1. Shared server helpers — `services/server.ts`

`createServerFn` defines an RPC-callable function. `createServerOnlyFn` wraps helpers that must **never be called from a client module** — they cannot be serialized into RPC stubs and will throw if called client-side. Use `createServerOnlyFn` for anything that reads private env vars or constructs server-side clients.

Expose client-safe config through a `createServerFn` so the root loader can read it without bundling secrets.

```ts
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { type Middleware } from "openapi-fetch";

// PUBLIC_* — surfaced to client through this fn (read in root loader)
export const getPublicEnvVariablesFn = createServerFn({ method: "GET" }).handler(async () => ({
  logLevel: process.env.PUBLIC_LOG_LEVEL || "info",
  authDomain: process.env.PUBLIC_AUTH_DOMAIN || "",
  authClientId: process.env.PUBLIC_AUTH_CLIENT_ID || "",
}));

// PRIVATE_* — server-only, never readable from client
export const getItemBaseUrl = createServerOnlyFn(() => {
  const uri = process.env.PRIVATE_ITEM_API_URI;
  if (!uri) throw new Error("Missing env var PRIVATE_ITEM_API_URI");
  return uri;
});

// tenant headers forwarded to upstream services
export const getInternalHeaders = createServerOnlyFn(
  ({ externalOrgId, emailAddress }: { externalOrgId: string; emailAddress: string }) => ({
    "X-Acme-Client": "web",
    "X-Acme-Tenant-Key": `workspace=${externalOrgId}`,
    "X-Acme-On-Behalf-Of": emailAddress,
  }),
);

// upstream-error middleware (logs + translates network errors)
export const errorMiddleware: Middleware = {
  async onRequest({ request }) {
    request.headers.set("x-request-start-time", Date.now().toString());
  },
  async onResponse({ response }) {
    if (!response.ok) {
      const error = await response.clone().json().catch(() => null);
      console.error(error);
    }
  },
  async onError({ error }) {
    if (error instanceof Error && error.message.includes("ENOTFOUND")) {
      return new Error("Network error: unable to resolve hostname.");
    }
    return new Error("Oops");
  },
};
```

## 2. JWT auth middleware — `services/middleware.ts`

Middleware runs server-side for every call to any function that includes it in `.middleware([...])`. It reads the `Authorization` header, verifies the JWT against a remote JWKS endpoint, extracts claims, and injects them into the context that downstream handlers read via `ctx.context`.

Throwing from middleware cancels the function call and surfaces the error to the caller — React Query routes it to `error` state.

```ts
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createRemoteJWKSet, errors, type JWTPayload, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(
  new URL(`${process.env.PUBLIC_AUTH_DOMAIN}/.well-known/jwks.json`),
);

interface AcmeJWTPayload extends JWTPayload {
  email?: string;
  external_org_id?: string;
  permissions: ("can_access_app" | "can_edit")[];
}

export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const accessToken = getRequestHeader("Authorization")?.replace("Bearer ", "");
  if (!accessToken) throw new Error("Authentication required: token missing");

  const { payload } = await jwtVerify<AcmeJWTPayload>(accessToken, jwks, {
    issuer: process.env.PUBLIC_AUTH_DOMAIN,
  }).catch((error) => {
    if (error instanceof errors.JWTExpired) throw new Error("Authentication required: token has expired");
    if (error instanceof errors.JWSSignatureVerificationFailed) throw new Error("Authentication required: invalid signature");
    throw new Error("Authentication required: token verification failed");
  });

  if (!payload.external_org_id) throw new Error("Invalid token: external_org_id claim is missing");
  if (!payload.email) throw new Error("Invalid token: email claim is missing");
  if (!payload.permissions.includes("can_access_app")) throw new Error("Access denied: insufficient permissions");

  return next({
    context: {
      externalOrgId: payload.external_org_id,
      emailAddress: payload.email,
      accessToken,
    },
  });
});
```

## 3. Input schema — `services/items/schema.ts`

Define Zod schemas separately from the server function. This keeps schemas importable in both server functions and client-side form validation without pulling in server-only code.

```ts
import * as z from "zod";

export const createItemInputSchema = z.object({
  itemId: z.uuidv4(),
  name: z.string().min(1),
  filePath: z.string(),
});
```

## 4. Server function — `services/items/server.ts`

The chain is: `createServerFn({ method }).middleware([...]).inputValidator(zod).handler(async (ctx) => ...)`.

- `ctx.data` — the validated, typed input (after Zod parsing)
- `ctx.context` — values injected by middleware (e.g. `externalOrgId`, `emailAddress`, `accessToken`)

Start simple with a `GET` that needs no auth, then add middleware and input validation as needed.

```ts
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import createClient from "openapi-fetch";

import { authMiddleware } from "../middleware";
import { errorMiddleware, getInternalHeaders, getItemBaseUrl } from "../server";
import type { paths } from "./generated";    // openapi-typescript output (optional)
import { createItemInputSchema } from "./schema";

// server-only helper (not RPC) — builds the upstream HTTP client
export const itemApiClient = createServerOnlyFn(() => {
  const client = createClient<paths>({ baseUrl: getItemBaseUrl() });
  client.use(errorMiddleware);
  return client;
});

export const createItemFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(createItemInputSchema)
  .handler(async (ctx) => {
    const { data } = await itemApiClient().POST("/items", {
      body: {
        itemId: ctx.data.itemId,
        name: ctx.data.name,
        filePath: ctx.data.filePath,
      },
      params: { header: getInternalHeaders(ctx.context) },
    });

    if (!data) throw new Error("Failed to create item");
    return data;
  });
```

A handler may return a raw `Response` — useful for streaming a file download:

```ts
return new Response(buffer, { headers: { "Content-Type": "application/zip" } });
```

No `'use server'` directives are required. `createServerFn` handles the bundle split automatically.

## 5. Typed key factory — `services/items/key.ts`

Query key factories are `as const` typed objects that produce deterministic, hierarchical cache keys. This makes partial invalidation safe — `itemKeys.root()` invalidates everything in the "items" subtree; `itemKeys.detail(id)` invalidates only that item.

```ts
export const itemKeys = {
  root:   () => ["items"] as const,
  create: () => [...itemKeys.root(), "create"] as const,
  detail: (itemId: string) => [...itemKeys.root(), { itemId }] as const,
};
```

For clients keyed by base URL + tenant (multi-tenant apps), include both in the key so cache entries are naturally scoped per tenant:

```ts
export const itemKeys = {
  root:   (baseUrl: string) => ["items", { baseUrl }] as const,
  all:    (baseUrl: string, shopId: string) => [...itemKeys.root(baseUrl), { shopId }] as const,
  detail: (baseUrl: string, shopId: string, itemId: string) =>
    [...itemKeys.all(baseUrl, shopId), { itemId }] as const,
  create: (baseUrl: string, shopId: string) => [...itemKeys.all(baseUrl, shopId), "create"] as const,
  remove: (baseUrl: string, shopId: string) => [...itemKeys.all(baseUrl, shopId), "remove"] as const,
};
```

## 6. Calling from a loader

Pass input as `{ data }`. The function runs server-side during SSR (the loader is server-side with `ssr: "data-only"`). No auth header is needed here because the loader itself is server-side — the auth middleware can read cookies or session state instead of a bearer token.

```tsx
// src/routes/(protected)/items/$itemId/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { getItemHistory } from "~/widgets/items";

export const Route = createFileRoute("/(protected)/items/$itemId/")({
  loader: async ({ params }) => {
    const history = await getItemHistory({ data: { itemId: params.itemId } });
    return { history };
  },
  component: RouteComponent,
});
```

## 7. Calling from a component — `services/items/client.ts`

Wrap with `useServerFn` to get a React-safe caller, then call it inside React Query. Pass the bearer token as a per-call header so `authMiddleware` can verify it server-side. The client never sees the token verification logic.

```ts
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuthAccessToken } from "~/shared/auth";
import { itemKeys } from "./key";
import { createItemFn } from "./server";

export function useCreateItem() {
  const { getAccessToken } = useAuthAccessToken();
  const createItem = useServerFn(createItemFn);

  return useMutation({
    mutationKey: itemKeys.create(),
    mutationFn: async (input: { itemId: string; name: string; filePath: string }) =>
      createItem({
        data: input,
        headers: { Authorization: `Bearer ${await getAccessToken()}` },
      }),
  });
}
```

Conditional / lazy query — use `skipToken` so the query stays idle until all required inputs are available. This avoids the anti-pattern of passing `undefined` to a server fn.

```ts
import { skipToken, useQuery } from "@tanstack/react-query";

export function useItem(itemId: string | undefined) {
  const getItem = useServerFn(getItemFn);
  return useQuery({
    queryKey: itemId ? itemKeys.detail(itemId) : ["items", "idle"],
    queryFn: itemId ? () => getItem({ data: { itemId } }) : skipToken,
  });
}
```

## 8. Plain HTTP alternative — `queryOptions` / `mutationOptions` factories

When you call an `openapi-fetch` client directly without a server fn (e.g. from a client-side context with a base URL injected via provider), return factory functions that produce `queryOptions`, `infiniteQueryOptions`, or `mutationOptions`. Mutations invalidate by key in `onSettled`. Deletes use optimistic updates with `onMutate`/`onError` rollback for instant UI response.

```ts
import {
  infiniteQueryOptions,
  keepPreviousData,
  type InfiniteData,
  mutationOptions,
  type QueryClient,
} from "@tanstack/react-query";

import type { ApiClients } from "../api-clients";
import { itemKeys } from "../keys/items";

export function itemsQueryOptions(shopId: string, clients: ApiClients) {
  return infiniteQueryOptions({
    queryKey: itemKeys.all(clients.apiBaseUrl, shopId),
    queryFn: async ({ pageParam }) => {
      const { data } = await clients.api.GET("/items", {
        params: { query: { continuationToken: pageParam, limit: 25 } },
      });
      if (!data) throw new Error("Failed to fetch data");
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.continuationToken,
    placeholderData: keepPreviousData,
  });
}

export function removeItemMutationOptions(queryClient: QueryClient, shopId: string, clients: ApiClients) {
  const queryKey = itemKeys.all(clients.apiBaseUrl, shopId);
  return mutationOptions({
    mutationKey: itemKeys.remove(clients.apiBaseUrl, shopId),
    mutationFn: async (itemId: string) => {
      await clients.api.DELETE("/items/{itemId}", { params: { path: { itemId } } });
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<InfiniteData<{ items: { itemId: string }[] }>>(queryKey);
      queryClient.setQueryData<InfiniteData<{ items: { itemId: string }[] }>>(queryKey, (prev) =>
        prev
          ? { ...prev, pages: prev.pages.map((p) => ({ ...p, items: p.items.filter((i) => i.itemId !== itemId) })) }
          : { pages: [], pageParams: [] },
      );
      return { previous };
    },
    onError: (_, __, ctx) => { queryClient.setQueryData(queryKey, ctx?.previous); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
  });
}
```

## Common pitfalls

- Never read `process.env.PRIVATE_*` outside a server fn or `createServerOnlyFn` — Vite will bundle it to the client
- Pass tokens as per-call `headers`, not via `data` — the middleware reads the `Authorization` header
- Always `throw` for errors in handlers — `useServerFn` rethrows so React Query routes them to `error` state
- `'use server'` directives are not required — `createServerFn` handles the bundle split
