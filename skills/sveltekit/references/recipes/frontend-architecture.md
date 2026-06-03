# SvelteKit App Architecture

See the [SvelteKit docs](https://kit.svelte.dev/docs/routing) for routing primitives and load function basics — here's the architectural pattern we apply on top of them.

## Why the default falls apart

When you first build a SvelteKit app, it's tempting to put everything in route files: fetch the data, transform it, pass it to the template, handle forms — all in one place. This works for a demo but collapses quickly in a real product. Route files become thousand-line monsters, business logic leaks everywhere, and changing a data shape breaks six files at once.

The architecture here solves this with a strict layering rule: **routes are thin coordinators, features own everything about a domain**. A route file calls one function, gets back typed data, and hands it to a component. That's it. All the real work — DB access, transformation, validation — happens in feature libs.

What goes wrong without it:
- Raw Firestore/DB objects flow directly to the UI, so any DB schema change breaks every component that touches it
- Business logic is scattered across route files making it impossible to test or reuse
- Type safety degrades as `any` casts accumulate where shapes don't line up


## The core pattern: Route → Feature → View Model → Component

Every page follows the same flow:

```
+page.server.ts  →  feature server function  →  service  →  view model  →  component
```

### Step 1: The route (`+page.server.ts`)

The route is thin. It gets the session, calls the feature's server function, and returns what it gets back.

```ts
// apps/web/src/routes/foo/+page.server.ts
import { getFooPage } from "@readership/feature-foo";

export const load = async ({ locals }) => {
  const session = await getSession(locals);
  return getFooPage(session.user.handle);
};
```

Notice what is NOT here: no DB queries, no data transformation, no business logic. The route doesn't know how `getFooPage` works.

### Step 2: The feature server function (`feature-foo/src/server.ts`)

The server function is the feature's public server API. It orchestrates calls to services.

```ts
// libs/feature-foo/src/server.ts
import { fooService } from "./services/foo";

export async function getFooPage(handle: string) {
  return fooService.getFoo(handle); // returns FooViewModel
}
```

### Step 3: The view model (`feature-foo/src/view-models/foo.ts`)

The view model is a Zod schema that defines exactly what the UI needs. It's the contract between the backend and the frontend. If a field isn't in the view model, it isn't in the UI — no accidental data leaks.

```ts
// libs/feature-foo/src/view-models/foo.ts
import { z } from "zod";

export const FooViewModelSchema = z.object({
  id: z.string(),
  title: z.string(),
  // only fields the UI renders — not the full DB document
});
export type FooViewModel = z.infer<typeof FooViewModelSchema>;
```

When you need to add a new field to the UI, add it here first. Zod validates at runtime, so if the data from the DB doesn't match, you get an error at the service boundary — not a silent `undefined` in your component.

### Step 4: The component (`+page.svelte`)

The page component receives typed data from `$props()` and renders it. It does not fetch, transform, or mutate.

```svelte
<script lang="ts">
  import { FooCard } from '@readership/feature-foo';
  let { data } = $props();
</script>

<FooCard foo={data.foo} />
```


## Feature modules vs shared infrastructure

Not all code belongs in a feature lib. Here's how to decide:

**Feature modules** (`libs/feature-X/`) own a slice of product functionality end-to-end: the view model, the service, the components, and the server function. They contain business logic and know about domain entities like Publications, Series, Users, and Posts.

**Shared infrastructure** has no business logic and is reusable across any feature:

| Module                | Purpose                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `libs/ui/`            | Generic, unstyled or lightly-styled UI primitives (Button, Card, Tabs, …)             |
| `libs/shared/`        | Pure utilities with no framework dependencies (formatters, validators, …)             |
| `libs/models/`        | Shared TypeScript types used across features                                          |
| `libs/db/`            | Firestore document definitions — raw data layer                                       |
| `libs/editor/`        | Tiptap editor integration — framework component, not a feature                        |
| `libs/feature-shell/` | App shell: layout, navigation, session helpers — owns the wrapper but not the content |

**The decision rule**: if the code knows about a business entity (post, series, publication), it belongs in a feature lib. If it's reusable across multiple features with no business knowledge, it belongs in shared infrastructure.

Examples:
- `Avatar.svelte` that takes `src` and `name` → `libs/ui/`
- `AuthorAvatar.svelte` that takes an `Author` view model → `libs/feature-X/`
- `formatDate()` utility → `libs/shared/`
- `getSeriesPage()` server function → `libs/feature-series/`


## Rules

- Routes own form actions; features own data shape
- View models are the contract: if it's not in the VM, it's not in the UI
- No `any` — all data flows through typed view models
- Server functions call services; services call DB documents
- Features must not import from other feature libs
