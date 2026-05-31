---
name: sveltekit
description: "SvelteKit feature-slice architecture patterns. Load when adding routes, building feature libs, designing components, or deciding where code belongs."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# SvelteKit Feature-Slice Architecture

This skill documents how this codebase structures SvelteKit applications using a feature-slice approach.

## When to load recipes

| You are working on...                          | Load recipe                                           |
| ---------------------------------------------- | ----------------------------------------------------- |
| App-level route and data flow                  | `references/recipes/frontend-architecture.md`         |
| A feature lib (components, VMs, services)      | `references/recipes/feature-architecture.md`          |
| A Svelte component's structure and readability | `references/recipes/composable-components.md`         |
| A form component in a feature lib              | `references/recipes/feature-lib-forms.md`             |
| Deciding where a new component lives           | `references/recipes/ui-vs-feature-components.md`      |
| Designing or extending the app shell           | `references/recipes/app-shell.md`                     |
| Service returning a view model                 | `references/recipes/view-model-parse.md`              |
| Form action return type + component prop       | `references/recipes/form-result-type.md`              |
| `$state` initialized from `$props`             | `references/recipes/initializing-state-from-props.md` |
| `<svelte:component>` deprecation warning       | `references/recipes/dynamic-component.md`             |
| Any Svelte a11y warning                        | `references/recipes/a11y.md`                          |
| shadcn-svelte components, bits-ui, tailwind-variants | `references/recipes/shadcn-svelte.md`           |

Load the first six when designing a new feature from scratch.

## Overview

Features live in `libs/feature-X/`. Each feature owns:

- **View models** (zod schemas) -- BFF contracts for the UI
- **Services** -- transform DB documents into view models
- **Components** -- pure UI, receive VM props
- **server.ts** -- called from `+page.server.ts`, orchestrates the feature's data flow

Routes in `apps/web/src/routes/` are thin: they call the feature's server function and pass data to components. They own form actions.

The app shell (`@readership/feature-shell`) owns layout, navigation, and session helpers.
