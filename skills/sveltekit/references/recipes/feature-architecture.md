# Recipe: Feature Architecture

## Directory layout

```
libs/feature-X/
├── src/
│   ├── components/       # Svelte components -- public API
│   ├── view-models/      # Zod schemas + TypeScript types
│   ├── services/         # DB -> VM transformation
│   ├── stores/           # Client-side reactive state (if any) -- .svelte.ts files
│   ├── utils/            # Shared utilities for this feature
│   │   ├── helpers.ts            # shared pure functions
│   │   └── format.server.ts      # server-only utils (use .server.ts naming)
│   └── server.ts         # Public server API called by routes; re-exports server utils
├── src/index.ts          # Barrel -- exports components, VMs, types (client-safe)
└── package.json
```

### Server-only utilities

Server-only helpers (those that import Node APIs, secrets, or server-side libs) go in `utils/` with a `.server.ts` suffix. They are exported from the feature's `server.ts` barrel, not from `index.ts`.

```ts
// feature-X/src/utils/auth.server.ts
export function requireAuth(locals: App.Locals) { ... }

// feature-X/src/server.ts
export { requireAuth } from "./utils/auth.server";
export async function getFooPage(...) { ... }
```

**Exception — `feature-shell`**: uses a `server/` subdirectory instead of `utils/` because its server surface is large enough to warrant a dedicated folder. This is an intentional exception to the standard pattern; other feature libs should use `utils/`.

## When to skip the VM and service

Forego both if:

- The DB entity maps 1:1 to what the UI renders, AND
- No transformation, filtering, or aggregation is needed

Otherwise, always create a VM -- it prevents raw Firestore fields leaking to the client.

## View model role

The VM is a BFF contract:

- Zod schema validates the shape
- Service function transforms >=1 DB docs into the VM
- The route receives the VM; the component renders it
- To add a UI field: render it first, then add it to the VM

## Service role

```ts
// feature-X/src/services/foo.ts
export const fooService = defineService({ FooDoc }, ({ FooDoc }) => ({
  async getFoo(handle: string): Promise<FooViewModel> {
    const doc = await FooDoc.findByHandle(handle);
    return FooViewModelSchema.parse({ ...doc });
  },
}));
```

## Stores

Use stores (`.svelte.ts` files) for client-only reactive state that needs to be shared across components. Do not put server-fetched data in stores -- use the route's `data` prop.

## Public API (`index.ts`)

Export only what routes and other features need:

```ts
export { FooCard, FooForm } from "./components/FooCard.svelte";
export type { FooViewModel } from "./view-models/foo";
export { getFooPage } from "./server";
```
