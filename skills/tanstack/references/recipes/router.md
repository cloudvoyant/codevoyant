# Type-Safe Routing with TanStack Router

See the [TanStack Router docs](https://tanstack.com/router/latest/docs/framework/react/overview) for the full API — here's what the docs underemphasize and the patterns we've landed on after hitting the gotchas:

## Why this matters

Most React routing libraries treat type safety as an afterthought — you pass a string URL and hope it matches a real route. TanStack Router takes the opposite approach: every route, every param, every search key is typed end-to-end. The `routeTree.gen.ts` file (generated, never edited) is what makes `<Link to="/posts/$postId" params={{ postId: "42" }}>` a compile error if `postId` is the wrong type or if `/posts/$postId` does not exist.

The other major problem this recipe solves is **data loading without waterfalls**. Without loader prefetching, a user navigates, React renders, a component fires `useQuery`, and only then does a network request go out. With TanStack Router loaders, the data fetch starts the moment the user signals intent to navigate (or during SSR), before the component tree even renders. Components then consume the already-filled cache synchronously via `useSuspenseQuery`.

What goes wrong without these patterns:
- Passing `queryClient` incorrectly causes loaders and components to use different caches (double-fetching)
- Reading `search` directly in `loader` instead of via `loaderDeps` breaks preload and dedupe
- Setting `defaultPreloadStaleTime` to anything other than `0` lets the router double-cache data that React Query already manages
- Editing `routeTree.gen.ts` by hand causes the next `dev`/`build` to silently overwrite your changes

## File-based routing conventions

See the [TanStack Router file-based routing docs](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing) for the full naming reference. The conventions we use:

- Dynamic params: `$postId.tsx` → `params.postId` (typed string)
- Pathless auth gate: `(protected)/route.tsx` — groups routes under auth without adding a URL segment
- Splat: `docs/$.tsx` → `params._splat` captures everything after `/docs/`
- Server-only: `.ts` with `server.handlers` and no `component` (see section 11 below)
- Flat dotted names: `(protected)/app.index.tsx`, `(protected)/app.route.tsx` — used when you want nesting without directories

We do not use the `_auth.tsx` underscore prefix pattern. All auth gating goes in pathless `(protected)/` groups.

## 1. `src/router.tsx`

The router is created fresh per request (or once on the client). Passing `queryClient` via context is what allows every loader to call `context.queryClient.ensureQueryData(...)` and share the same cache the components will later read. The `Register` module augmentation is what makes all `<Link>` props fully typed — without it, TypeScript cannot resolve the generated route tree.

```tsx
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "~/routeTree.gen";
import { getTanStackQueryContext } from "~/shared/api/query-client";

import { ErrorComponent } from "./shared/components/router/error";
import { NotFoundComponent } from "./shared/components/router/not-found";
import { PendingComponent } from "./shared/components/router/pending";

export function getRouter() {
  return createRouter({
    routeTree,
    context: getTanStackQueryContext(),
    defaultErrorComponent: ErrorComponent,
    defaultPendingComponent: PendingComponent,
    defaultNotFoundComponent: NotFoundComponent,
    defaultPendingMs: 250,
    defaultPendingMinMs: 250,
    defaultPreload: false,
    defaultPreloadDelay: 50,
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,        // let react-query own staleness, not the router
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
```

`defaultPreloadStaleTime: 0` is non-negotiable. Without it the router caches loader results independently of React Query, leading to stale UI and confusing double-fetch behavior.

SSR-query bridge style (per-request QueryClient that hydrates the query cache across the SSR boundary):

```tsx
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 20, refetchOnWindowFocus: false, retry: 1 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
  });

  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
};
```

With SSR-query bridge style, do NOT render `<QueryClientProvider>` — the bridge supplies the client via router context.

## 2. Shared QueryClient — `src/shared/api/query-client.ts`

Used in the non-SSR-bridge style. A single instance shared between the router context and the `QueryClientProvider`.

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 20,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function getTanStackQueryContext() {
  return { queryClient };
}
```

Provider — `src/shared/api/providers/tanstack-query.tsx`:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "~/shared/api/query-client";

export function TanStackQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

## 3. Root route — `src/routes/__root.tsx`

The root route has two distinct responsibilities that must be kept separate:

- `shellComponent` renders the HTML document itself (`<html>`, `<head>`, `<body>`) — it wraps everything and must be server-renderable without any React context
- `component` renders the provider tree around `<Outlet/>` — this is where `QueryClientProvider`, theme providers, etc. live

`ssr: "data-only"` means loaders run on the server but the app ships as a SPA client — you get SSR data loading without full server-side rendering of the component tree.

```tsx
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

import { TanStackQueryProvider } from "~/shared/api/providers/tanstack-query";
import appCss from "../styles.css?url";

type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  ssr: "data-only",
  shellComponent: RootDocument,
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Acme" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  return (
    <TanStackQueryProvider>
      <Outlet />
    </TanStackQueryProvider>
  );
}
```

Fuller version with a root loader that fetches client-safe env via a server fn (see `server-actions.md`), and multiple nested providers:

```tsx
type RouterContext = { queryClient: QueryClient; env?: PublicRuntimeEnv };

export const Route = createRootRouteWithContext<RouterContext>()({
  ssr: "data-only",
  shellComponent: RootDocument,
  component: RootLayoutComponent,
  loader: async () => ({ env: await getPublicEnvVars() }),
  head: () => ({ /* ... */ }),
});

function RootLayoutComponent() {
  const { env } = Route.useLoaderData();
  const apiClients = useMemo(() => createApiClients(env), [env]);
  return (
    <TanStackQueryProvider>
      <DevToolsProvider>
        <ApiClientsProvider clients={apiClients}>
          <ThemeProvider><Outlet /></ThemeProvider>
        </ApiClientsProvider>
      </DevToolsProvider>
    </TanStackQueryProvider>
  );
}
```

## 4. Static route — `src/routes/index.tsx`

The simplest route: no loader, no params. `createFileRoute("/")` is how the route tree generator knows this file maps to `/`.

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <h1>Acme</h1>
      <Link to="/posts/$postId" params={{ postId: "42" }}>Post 42</Link>
    </>
  );
}
```

## 5. Dynamic params + loader — `src/routes/posts/$postId.tsx`

`$postId` in the filename becomes `:postId` in the URL and `params.postId` (typed string) in the loader and component.

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts/$postId")({
  loader: ({ params }) => fetchPost(params.postId),
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const post = Route.useLoaderData();
  return <h1>{post.title} ({postId})</h1>;
}
```

Splat at `routes/docs/$.tsx` — captures everything after `/docs/`:

```tsx
export const Route = createFileRoute("/docs/$")({
  loader: ({ params }) => fetchDoc(params._splat),
  component: () => <Doc />,
});
```

## 6. Server-only loader (dynamic import)

Dynamic-import server modules inside the loader so the DB driver, ORM, or secret-reading code never reaches the client bundle. With `ssr: "data-only"` on the root, loaders run server-side; dynamic import ensures Vite's module graph analysis does not include server packages in the client chunk.

```tsx
// src/routes/health.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  loader: async () => {
    const { checkDatabaseHealth, getDatabase } = await import("@acme/db");
    try {
      await getDatabase();
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }
    return { health: await checkDatabaseHealth() };
  },
  component: HealthPage,
});

function HealthPage() {
  const { health } = Route.useLoaderData();
  return <div>{health.connected ? "Connected" : "Disconnected"}</div>;
}
```

## 7. Search params with Zod + `loaderDeps`

`validateSearch` parses and coerces the raw URL query string into a typed object — `.catch()` provides safe defaults so invalid URLs never crash. `loaderDeps` selects which search keys re-trigger the loader; this is what makes preload and dedupe work correctly.

**Never read `search` directly in `loader`** — always go through `deps`. If you read `search` directly, TanStack Router cannot tell whether a preloaded result is fresh, breaking the preload optimization.

```tsx
// src/routes/posts/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

const postsSearch = z.object({
  page:   z.number().int().nonnegative().catch(0),
  filter: z.enum(["draft", "published", "all"]).catch("all"),
});

export const Route = createFileRoute("/posts/")({
  validateSearch: postsSearch,
  loaderDeps: ({ search }) => ({ page: search.page, filter: search.filter }),
  loader: ({ deps }) => fetchPosts(deps),
  component: PostsPage,
});

function PostsPage() {
  const { page, filter } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <button onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })}>
      next
    </button>
  );
}
```

Normalizing redirect — restore search keys an external OAuth callback stripped:

```tsx
// src/routes/(protected)/app.route.tsx
export const Route = createFileRoute("/(protected)/app")({
  validateSearch: z.object({
    resourceId: z.uuidv4().default(() => crypto.randomUUID()).catch(() => crypto.randomUUID()),
    tab: z.enum(["inputs", "item", "stock"]).default("inputs").catch("inputs"),
  }),
  loaderDeps: ({ search }) => ({ resourceId: search.resourceId, tab: search.tab }),
  loader: async ({ location, deps: { resourceId, tab } }) => {
    const params = new URLSearchParams(location.search);
    if (!params.has("resourceId") || !params.has("tab")) {
      throw redirect({ to: "/app", search: (prev) => ({ ...prev, resourceId, tab }) });
    }
  },
  component: () => <Outlet />,
});
```

## 8. `queryOptions` + loader prefetch

This is the pattern that eliminates loading spinners for navigations. The loader calls `ensureQueryData` which either returns the cached data immediately or fetches and caches it. The component then calls `useSuspenseQuery` with the **same `queryOptions` object** — because the key matches what the loader filled, the component gets data synchronously with no `isPending` branch to write.

```ts
// src/queries/posts.ts
import { queryOptions } from "@tanstack/react-query";

export const postsKeys = {
  all:    ["posts"] as const,
  list:   (filter: string) => [...postsKeys.all, "list", filter] as const,
  detail: (id: string)     => [...postsKeys.all, "detail", id] as const,
};

export const postQuery = (id: string) => queryOptions({
  queryKey: postsKeys.detail(id),
  queryFn:  () => api.posts.get(id),
});
```

```tsx
// src/routes/posts/$postId.tsx
export const Route = createFileRoute("/posts/$postId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(postQuery(params.postId)),
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const { data } = useSuspenseQuery(postQuery(postId));
  return <article>{data.body}</article>;
}
```

Parallel loaders — fetch multiple queries simultaneously, avoiding a waterfall where the second query waits for the first:

```ts
loader: ({ context, params }) =>
  Promise.all([
    context.queryClient.ensureQueryData(postQuery(params.postId)),
    context.queryClient.ensureQueryData(commentsQuery(params.postId)),
  ]),
```

## 9. `beforeLoad` + redirect (auth gate)

`beforeLoad` runs before the loader and before the component renders. Throwing a `redirect` here is the right place to gate a route for auth. The returned object is merged into the route context, making `actor` available to the `loader` and the component.

```tsx
export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({ to: "/login", search: { next: location.href } });
    }
    return { actor: context.auth.user };       // added to context for loader/component
  },
  loader: ({ context }) => fetchDashboard(context.actor.id),
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  component: AdminDashboard,
});
```

See `auth-routes.md` for the full pattern with session server functions and both auth strategies.

## 10. Lazy / code-split routes

With `autoCodeSplitting: true` on `tanstackStart()`, splitting is automatic — you do not need the manual pattern below. Use manual splitting only when you need fine-grained control over which chunk includes which code.

```tsx
// routes/heavy.tsx — config only (loads immediately, small)
export const Route = createFileRoute("/heavy")({ loader: () => fetchHeavyData() });
```

```tsx
// routes/heavy.lazy.tsx — component only (lazy-loaded when route activates)
import { createLazyFileRoute } from "@tanstack/react-router";
export const Route = createLazyFileRoute("/heavy")({ component: HeavyPage });
function HeavyPage() { /* ... */ }
```

## 11. HTTP API route — `src/routes/api/health.ts`

A route file with only `server.handlers` (no `component`) becomes a pure HTTP endpoint. The router does not render any React for it.

```ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          status: "healthy",
          service: "web",
          version: process.env.PRIVATE_APP_VERSION,
          timestamp: new Date().toISOString(),
        }),
    },
  },
});
```

For endpoints that must bypass the framework router entirely, use `src/server.ts` (see `project-setup.md`).
