---
title: SvelteKit
---

# sveltekit

Context skill for SvelteKit applications using a feature-slice architecture with Svelte 5 runes.

## Philosophy

Features live in `libs/feature-X/` and each owns its view models (Zod schemas), services (data transforms), components (pure UI), and a `server.ts` entry called from `+page.server.ts`. Routes under `apps/web/src/routes/` are thin: they call the feature's server function, pass data to components, and own form actions. The app shell owns layout, navigation, and session helpers. This layering keeps route files small and makes features independently testable.

## Recipes

**Foundation — understand the system before building pieces:**

- [SvelteKit App Architecture](./sveltekit/recipes/frontend-architecture) — the route → feature → view model → component flow
- [Feature-Slice Architecture](./sveltekit/recipes/feature-architecture) — directory layout, view models, services, and public API
- [Building the App Shell](./sveltekit/recipes/app-shell) — layout variants, snippet-based content projection, shared overlays

**Building blocks:**

- [Writing Composable Svelte 5 Components](./sveltekit/recipes/composable-components) — one concern per component, derived state, named snippets
- [UI Components vs Feature Components](./sveltekit/recipes/ui-vs-feature-components) — when to use `ui/` vs `feature/`, cross-feature rules
- [shadcn-svelte, bits-ui, and tailwind-variants](./sveltekit/recipes/shadcn-svelte) — component registry, variants, global CSS rules

**Data layer:**

- [HTTP Service Clients](./sveltekit/recipes/service-clients) — OpenAPI-typed clients, generated schemas, shared middleware
- [Data Transformation with View Models](./sveltekit/recipes/view-model-parse) — always call `.parse()`, never inline-construct return objects
- [Server-Side Remote Functions](./sveltekit/recipes/remote-functions) — `query` and `command` primitives, calling from load functions and components

**Forms and actions:**

- [Building Forms in a Feature Lib](./sveltekit/recipes/feature-lib-forms) — `*FormContent` components, `use:enhance` in routes
- [Typing Form Action Results](./sveltekit/recipes/form-result-type) — discriminated union types, `satisfies` operator, single source of truth

**Auth:**

- [Auth Sessions with JWT Cookies](./sveltekit/recipes/auth-sessions) — stateless JWT sessions, per-call authorization, `checkAuthorized`

**Svelte 5 patterns:**

- [Reactive State from Props in Svelte 5](./sveltekit/recipes/initializing-state-from-props) — seeding `$state` from `$props` without the `state_referenced_locally` warning
- [Dynamic Components in Svelte 5](./sveltekit/recipes/dynamic-component) — replacing deprecated `<svelte:component>` with native tag syntax

**Quality:**

- [Accessibility Patterns for Svelte](./sveltekit/recipes/a11y) — roles, label associations, keyboard handlers, focus management

**Config:**

- [SvelteKit Config and Build Adapters](./sveltekit/recipes/config-and-build) — adapter-node, env vars, Tailwind v4, Vitest split, Docker

## References

- [SvelteKit documentation](https://svelte.dev/docs/kit)
- [Svelte 5 runes](https://svelte.dev/docs/svelte/what-are-runes)
