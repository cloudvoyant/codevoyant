---
title: react
---

# react

Context skill for React 19 projects using TypeScript, Vite, TanStack Query, Zustand, shadcn/ui, Tailwind v4, and React Three Fiber.

## Philosophy

Applications follow a feature-sliced layout under `src/`: business domains live in `features/<feature>/` and are exposed to routes only through feature hooks, never by direct component import. Server and remote state belongs in TanStack Query; UI and client state belongs in Zustand. API types are generated from OpenAPI via `openapi-typescript` and form types are always `z.infer<typeof schema>` — neither is written by hand. Class composition uses `cn()` and `cva()` with Tailwind theme tokens, never literal colour values.

## Recipes

- [React + Vite Project Setup](./react/recipes/project-config) — strict tsconfig, ESLint flat config with feature isolation, path alias, and toolchain
- [Feature-Sliced Project Layout](./react/recipes/folder-structure) — features vs shared buckets, hooks as the public API, and the ESLint boundary rule
- [TypeScript and Code Conventions](./react/recipes/conventions) — type-only imports, Prettify helper, result helpers, cn(), and Zod-validated env
- [Client State Management with Zustand](./react/recipes/zustand) — global singleton and per-instance context store patterns
- [Building UI with shadcn/ui and Tailwind CSS](./react/recipes/shadcn-tailwind) — Tailwind v4, theme tokens, cva variant pattern, and component ownership model
- [Data Fetching and Forms with TanStack Query](./react/recipes/data-fetching) — typed openapi-fetch client, query/mutation factories, feature hooks, Zod forms, and view-models
- [3D Scenes with React Three Fiber and Drei](./react/recipes/drei-threejs) — Canvas setup, lighting, GLB loading, animation loop, instancing, and polylines

## References

- [React documentation](https://react.dev)
- [TanStack Query docs](https://tanstack.com/query/latest)
- [Zustand](https://zustand.docs.pmnd.rs)
- [shadcn/ui](https://ui.shadcn.com)
