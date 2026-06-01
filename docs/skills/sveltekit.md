---
title: SvelteKit
---

# sveltekit

Context skill for Svelte 5 runes and feature-slice architecture. Activates automatically when `.svelte`, `.svelte.ts`, or `.svelte.js` files are detected — no slash command needed.

## Installation

```bash
npx skills add cloudvoyant/codevoyant
```

## What It Does

When you're working on a SvelteKit project the agent loads architecture patterns, component conventions, and Svelte 5 APIs before writing or reviewing code. You don't invoke it explicitly; it fires whenever the agent opens or discusses `.svelte` files.

## Architecture Model

Features live in `libs/feature-X/`. Each feature owns:

- **View models** — Zod schemas that form the BFF contract between server and UI
- **Services** — transform raw data (DB documents, API responses) into view models
- **Components** — pure UI that receive view model props
- **server.ts** — called from `+page.server.ts`, orchestrates data flow

Routes in `apps/web/src/routes/` are thin: call the feature's server function, pass data to components, own form actions.

```
apps/web/src/routes/dashboard/
  +page.server.ts        ← calls feature-dashboard/server.ts
  +page.svelte           ← renders <DashboardView>

libs/feature-dashboard/
  server.ts              ← fetches + transforms data
  DashboardView.svelte   ← top-level feature component
  components/            ← internal sub-components
  view-model.ts          ← Zod schemas
```

## Recipes

The skill loads specific recipes on demand:

| Working on… | Recipe loaded |
|---|---|
| App-level route and data flow | `frontend-architecture` |
| A feature lib (components, VMs, services) | `feature-architecture` |
| A component's structure and readability | `composable-components` |
| A form in a feature lib | `feature-lib-forms` |
| Deciding where a new component lives | `ui-vs-feature-components` |
| Designing or extending the app shell | `app-shell` |
| Service returning a view model | `view-model-parse` |
| Form action return type + component prop | `form-result-type` |
| `$state` initialized from `$props` | `initializing-state-from-props` |
| `<svelte:component>` deprecation warning | `dynamic-component` |
| Any Svelte a11y warning | `a11y` |
| shadcn-svelte, bits-ui, tailwind-variants | `shadcn-svelte` |

## Svelte 5 Runes Quick Reference

```svelte
<script lang="ts">
  let { count = 0, label }: { count?: number; label: string } = $props();

  let doubled = $derived(count * 2);
  let local = $state(0);

  $effect(() => {
    console.log('count changed:', count);
  });
</script>
```

Key rules:
- Use `$props()` not `export let`
- Use DOM event attributes (`onclick`, `oninput`) not `on:` directives
- `$bindable()` for two-way bindable props

## shadcn-svelte

Includes patterns for shadcn-svelte components, bits-ui primitives, and tailwind-variants for variant composition. The `shadcn-svelte` recipe loads automatically when working with those libraries.
