---
title: tanstack
---

# tanstack

Context skill for React apps built on TanStack Start with file-based routing, Router v1, Query v5, Form, and server functions.

## Philosophy

The `tanstackStart()` Vite plugin owns SSR entry generation and produces `src/routeTree.gen.ts` — that file is never edited by hand and `@tanstack/router-plugin` is never added separately. The root route is created with `createRootRouteWithContext<{ queryClient: QueryClient }>()` so loaders and components share a single Query cache. Server-only modules are imported dynamically inside loaders to stay out of the client bundle, and server functions follow a strict chain of `.middleware([...]).inputValidator(zod).handler(async (ctx) => ...)`. The router's `defaultPreloadStaleTime` is set to `0` so TanStack Query owns all staleness logic.

## Recipes

- [Scaffolding a TanStack Start Project](./tanstack/recipes/project-setup) — deps, Vite plugin order, tsconfig, entry files, and env variable split
- [Type-Safe Routing with TanStack Router](./tanstack/recipes/router) — file-based routes, root route, loaders, search params, queryOptions prefetch, API routes
- [Server Functions and Validation](./tanstack/recipes/server-actions) — `createServerFn` with Zod, JWT middleware, typed key factories, and calling from loaders and components
- [Protecting Routes with Auth Guards](./tanstack/recipes/auth-routes) — server-side loader redirects (Style A) and client-side provider gates (Style B)
- [Async State with TanStack Query and Forms](./tanstack/recipes/query-and-forms) — `useQuery`, `useSuspenseQuery`, `useMutation`, `useInfiniteQuery`, and TanStack Form with Zod validators
- [Project Conventions](./tanstack/recipes/conventions) — naming, file layout, QueryClient defaults, key factories, token passing, and SSR mode

## References

- [TanStack Router documentation](https://tanstack.com/router/latest)
- [TanStack Query documentation](https://tanstack.com/query/latest)
- [TanStack Start documentation](https://tanstack.com/start/latest)
