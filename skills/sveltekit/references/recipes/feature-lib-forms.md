# Recipe: Feature Lib Form Components

## The Problem

SvelteKit form actions live in `+page.server.ts` and are invoked via `<form method="POST" use:enhance>` in the route page. A feature lib component cannot own the `<form>` tag because:

- Progressive enhancement (`use:enhance`) must be applied at the route level
- Form `action` attributes reference server-side actions defined in the route
- The route needs to control loading/pending state via `$props` from `enhance`

## The Pattern: `*FormContent` components

Feature lib components render **the inner fields only**. The `<form>` wrapper stays in `+page.svelte`.

**Naming:** suffix with `FormContent` to make the constraint self-documenting.

### Feature lib component (`feature-account/src/components/AccountFormContent.svelte`)

```svelte
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

### Route page (`apps/web/src/routes/account/+page.svelte`)

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { AccountFormContent } from '@readership/feature-account';
  let { data, form } = $props();
  let loading = $state(false);
</script>

<form method="POST" use:enhance={() => {
  loading = true;
  return async ({ update }) => { await update(); loading = false; };
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

## Rules

- `*FormContent` components: no `<form>` tag, no `use:enhance`, no `action` attribute
- Input `name` attributes must match the expected keys in the server action's `formData`
- Loading state flows down as a prop -- component does not manage its own loading state
- Export `*FormContent` from the feature lib's `index.ts`
