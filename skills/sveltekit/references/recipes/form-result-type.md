# Typing Form Action Results

## Why this matters

When a SvelteKit form action returns data (success/error state, updated values), that data flows back to the page as the `form` prop and gets passed to form components. Without a shared type, developers hand-declare the shape in the component:

```ts
form?: { error?: string; success?: boolean; handle?: string; ... }
```

This type is disconnected from the action's actual return. When the action changes — a new error case, a renamed field — the component type drifts silently. TypeScript can't catch the mismatch because the two declarations are independent.

The fix: export a named type from `+page.server.ts`, use `satisfies` to verify the action's return against it, and import the type in the component. One definition, enforced at both ends.


## The problem in detail

Here's what drift looks like:

```ts
// +page.server.ts — action returns `displayName`
return { success: true, handle, displayName, description };

// PublicationForm.svelte — component expects `name` (stale copy)
let { form }: { form?: { success: boolean; name: string } } = $props();
//                                                     ^^^^ wrong field name — silent bug
```

TypeScript won't catch this because the two types are separate declarations. The component renders with `undefined` for `displayName` and no error is thrown.


## The correct pattern

### Step 1: Export a union type from the route

Declare all possible return shapes as a discriminated union. The discriminant (`success: true | false`) makes it easy for components to handle each case:

```ts
// +page.server.ts
export type PublicationFormResult =
  | { success: true; handle: string; displayName: string; description: string }
  | { success: false; error: string };
```

### Step 2: Use `satisfies` on action returns

`satisfies` verifies that a return value matches the type at the return site — not just at the usage site. This means TypeScript catches mismatches where the data is created, not where it's consumed:

```ts
export const actions = {
  update: async ({ request, locals }) => {
    // ... validate and save

    return {
      success: true,
      handle,
      displayName,
      description,
    } satisfies Extract<PublicationFormResult, { success: true }>;

    // If you add a field to the type but forget it here,
    // TypeScript errors at this line — not somewhere in a component.
  },
};
```

### Step 3: Re-export from the feature lib's `index.ts`

The type is defined in the route file, but components shouldn't need relative path imports into a route. Re-export it from the feature lib:

```ts
// libs/feature-publications/src/index.ts
export type { PublicationFormResult } from '../../apps/web/src/routes/publication/+page.server';
// Or if the type is duplicated into the feature lib for cleanliness:
export type { PublicationFormResult } from './view-models/publication-form';
```

### Step 4: Import the type in the component

```ts
// PublicationFormContent.svelte
import type { PublicationFormResult } from "@readership/feature-publications";

let { form }: { form?: PublicationFormResult } = $props();
```

Now the component's prop type is the same type as the action's return. When the action changes, the component type stays in sync automatically.


## Using the type in the template

Because `PublicationFormResult` is a discriminated union, TypeScript narrows it correctly in template `{#if}` blocks:

```svelte
{#if form?.success === false}
  <p class="text-destructive">{form.error}</p>
  <!-- TypeScript knows form.error exists here -->
{/if}

{#if form?.success === true}
  <p class="text-success">Saved as {form.displayName}</p>
  <!-- TypeScript knows form.displayName exists here -->
{/if}
```


## See also

- `view-model-parse.md` — same single-source-of-truth principle for service return types
- `feature-lib-forms.md` — how FormContent components receive and pass down form results
- [SvelteKit $types and ActionData](https://svelte.dev/docs/kit/types)
