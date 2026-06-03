# Building Forms in a Feature Lib

## Why this matters

SvelteKit form actions are one of its best features: they give you progressive enhancement (forms work without JavaScript), built-in loading states, and co-located server logic. But there's a tension: form actions live in `+page.server.ts` route files, while your form UI belongs in a feature lib component.

The naive solution is to put the `<form>` tag and `use:enhance` directly in a feature lib component. This breaks for two reasons:
1. `use:enhance` requires access to the route's form action — which only exists in the route layer
2. Loading state, error handling, and redirect behavior need to be controlled by the route

The solution is to split responsibility: the feature lib component renders the inner fields, and the route's `+page.svelte` provides the `<form>` wrapper.


## The pattern: `*FormContent` components

Feature lib form components render **the inner fields only** — no `<form>` tag, no `use:enhance`, no `action` attribute. The suffix `FormContent` makes this constraint self-documenting: it's clear the component is form content, not a complete form.

### The feature lib component

```svelte
<!-- feature-account/src/components/AccountFormContent.svelte -->
<script lang="ts">
  let {
    handle,
    displayName,
    bio,
    loading = false,
  }: {
    handle: string;
    displayName: string;
    bio: string;
    loading?: boolean;
  } = $props();
</script>

<label>
  Handle
  <input name="handle" value={handle} disabled={loading} />
</label>
<label>
  Display name
  <input name="displayName" value={displayName} disabled={loading} />
</label>
<label>
  Bio
  <textarea name="bio" disabled={loading}>{bio}</textarea>
</label>
```

Notice: no `<form>`, no `use:enhance`, no `action`. The `input name` attributes match the keys the server action will read from `formData`. The `loading` prop flows in from the route.

### The route page

```svelte
<!-- apps/web/src/routes/account/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { AccountFormContent } from '@readership/feature-account';
  let { data, form } = $props();
  let loading = $state(false);
</script>

<form method="POST" use:enhance={() => {
  loading = true;
  return async ({ update }) => {
    await update();
    loading = false;
  };
}}>
  <AccountFormContent
    handle={data.author.handle}
    displayName={data.author.displayName}
    bio={data.author.bio}
    {loading}
  />
  <button type="submit" disabled={loading}>Save</button>
</form>
```

The route owns the `<form>` wrapper, controls loading state, and decides what happens after submission (`update()` refreshes the page data by default, or you can redirect). The feature component just renders inputs and responds to the `loading` prop.


## The server action

The form action in `+page.server.ts` reads from `formData` using the same names as the input `name` attributes:

```ts
// apps/web/src/routes/account/+page.server.ts
export const actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const handle = data.get('handle') as string;
    const displayName = data.get('displayName') as string;
    const bio = data.get('bio') as string;

    // ... validate and save
    return { success: true };
  },
};
```


## Showing form errors

If the action returns an error, it comes back as the `form` prop on the page. Pass it down to the form content component:

```svelte
<!-- +page.svelte -->
<form method="POST" use:enhance={...}>
  <AccountFormContent
    handle={data.author.handle}
    displayName={data.author.displayName}
    bio={data.author.bio}
    {loading}
    formResult={form}
  />
  <button type="submit" disabled={loading}>Save</button>
</form>
```

For typing `formResult` correctly, see `form-result-type.md`.


## Rules

- `*FormContent` components: no `<form>` tag, no `use:enhance`, no `action` attribute
- Input `name` attributes must match the keys the server action reads from `formData`
- Loading state flows down as a prop — the component does not manage its own loading state
- Export `*FormContent` from the feature lib's `index.ts`
- The submit button lives in the route, not in the FormContent component (it controls the button's type and disabled state)
