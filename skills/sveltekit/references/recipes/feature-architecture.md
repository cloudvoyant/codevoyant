# Feature-Slice Architecture in SvelteKit

## Why this matters

Features are the heart of this codebase. A "feature lib" is a self-contained package that owns everything about one slice of product functionality: what data looks like (view models), how to get it (services), how to display it (components), and how routes access it (server functions).

Without this structure, teams end up with a flat `components/` folder full of files that have invisible dependencies on each other, services mixed with UI logic, and types defined in three different places. When the product changes, it's impossible to know what you can safely modify.

The feature-slice pattern solves this by giving each domain a hard boundary. You can look at `libs/feature-series/` and know that every line of code related to the Series feature lives there — and nothing outside it.


## Directory layout

Every feature lib follows this structure:

```
libs/feature-X/
├── src/
│   ├── components/       # Svelte components — public API for routes
│   ├── view-models/      # Zod schemas + TypeScript types (the data contracts)
│   ├── services/         # DB → VM transformation logic
│   ├── stores/           # Client-side reactive state (.svelte.ts files)
│   ├── utils/
│   │   ├── helpers.ts            # shared pure functions within this feature
│   │   └── format.server.ts      # server-only utils (use .server.ts suffix)
│   └── server.ts         # Public server API called by routes
├── src/index.ts          # Barrel — exports components, VMs, types (client-safe only)
└── package.json
```

### Why `.server.ts` for server-only utilities?

SvelteKit's build system uses the `.server.ts` suffix as a signal that a module must never be bundled into the client. If you import a server-only module from a component, the build will fail with a clear error. This prevents secrets (DB credentials, API keys) from accidentally reaching the browser.

```ts
// feature-X/src/utils/auth.server.ts
// This file can import Node APIs, secrets, and server-side libs safely
export function requireAuth(locals: App.Locals) { ... }

// feature-X/src/server.ts — re-exports server utils
export { requireAuth } from "./utils/auth.server";
export async function getFooPage(...) { ... }
```

**Exception — `feature-shell`**: the shell uses a `server/` subdirectory instead of `utils/` because its server surface (auth helpers, session utilities, logging) is large enough to warrant a dedicated folder. All other feature libs use `utils/`.


## The view model: your data contract

The view model is a Zod schema that defines exactly what the UI needs from a backend entity. Think of it as the API contract between your database and your components.

```ts
// feature-X/src/view-models/foo.ts
import { z } from "zod";

export const FooViewModelSchema = z.object({
  id: z.string(),
  title: z.string(),
  authorName: z.string(),  // might be derived from a separate author document
  // only fields the UI actually renders
});
export type FooViewModel = z.infer<typeof FooViewModelSchema>;
```

**When to skip the view model**: only when the DB entity maps 1:1 to what the UI renders AND no transformation is needed. In practice, this is rare — even simple cases often need field renaming or aggregation. When in doubt, create the view model — it prevents raw Firestore fields from reaching the client.

**The workflow**: when you need a new field in the UI, add it to the view model first, then update the service to populate it, then use it in the component. The Zod schema is the single source of truth.


## The service: transforming data into view models

Services fetch data from the DB and transform it into view models. They never return raw DB documents.

```ts
// feature-X/src/services/foo.ts
export const fooService = defineService({ FooDoc }, ({ FooDoc }) => ({
  async getFoo(handle: string): Promise<FooViewModel> {
    const doc = await FooDoc.findByHandle(handle);
    return FooViewModelSchema.parse({ ...doc }); // always call .parse() — never construct inline
  },
}));
```

Always call `ViewModelSchema.parse()` at the end of a service function — never construct the return object inline with manual type casts. Zod's `.parse()` validates at runtime and ensures the type is sound. See `view-model-parse.md` for why inline construction with `as` casts causes problems.


## Stores: client-side reactive state

Use `.svelte.ts` files for reactive state that needs to be shared across components on the client. Do not put server-fetched data in stores — that belongs in the route's `data` prop.

Good uses for stores:
- UI state like sidebar open/closed, selected tab, active filter
- Client-only caches or optimistic updates

Bad uses for stores:
- Data fetched in `+page.server.ts` (use `$props().data` instead)
- State that should reset when the user navigates away


## The public API: `index.ts`

The barrel file is the feature's contract with the outside world. Export only what routes and other features actually need:

```ts
// libs/feature-X/src/index.ts
// Components
export { FooCard, FooForm } from "./components/FooCard.svelte";
// Types only — not implementation
export type { FooViewModel } from "./view-models/foo";
// Server function (only needed in +page.server.ts — consider if it belongs here or in server.ts)
export { getFooPage } from "./server";
```

Everything not exported here is private to the feature. Other packages cannot import from `./src/services/foo` directly — they can only use the public API.


## Cross-feature rules

Feature libs must not import from other feature libs. If two features need the same data shape:
1. If it's domain-agnostic → move it to `libs/ui/` or `libs/shared/`
2. If it's domain-aware → the shared type belongs in `@readership/models`, and each feature has its own version of the component
