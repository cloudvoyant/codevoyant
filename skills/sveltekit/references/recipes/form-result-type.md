# Recipe: Export FormResult type from route, use as component prop

## Problem

Form components that receive action results declare their prop type by hand:

```ts
form?: { error?: string; success?: boolean; handle?: string; ... }
```

This must be kept in sync with the action manually and silently drifts.

## Correct Fix

Export a named result type from `+page.server.ts` that matches the action's actual return shapes exactly. Import it in the component.

```ts
// +page.server.ts:
export type PublicationFormResult =
  | { success: true; handle: string; displayName: string; description: string }
  | { success: false; error: string };

export const actions = {
  update: async ({ request, locals }) => {
    // ...
    return {
      success: true,
      handle,
      displayName,
      description,
    } satisfies Extract<PublicationFormResult, { success: true }>;
  },
};
```

```ts
// PublicationForm.svelte:
import type { PublicationFormResult } from "@readership/feature-publications";
let { form }: { form?: PublicationFormResult } = $props();
```

## Why

The `satisfies` operator on action returns makes TypeScript verify the return matches the declared type at the return site, not just at the usage site. Exporting the type from the route and re-exporting from the feature lib's `index.ts` makes it available without relative path imports. The component prop type is now derived from the authoritative source rather than maintained separately.

## See Also

- `view-model-parse.md` — same single-source-of-truth principle for service returns
- https://svelte.dev/docs/kit/types — SvelteKit $types and ActionData
