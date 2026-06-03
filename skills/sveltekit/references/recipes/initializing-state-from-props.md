# Reactive State from Props in Svelte 5

## Why this is a common mistake

In Svelte 5, `$props()` and `$state()` are reactive signals. When you initialize a `$state` variable directly from a `$props()` value, the compiler detects that a reactive signal's initial value comes from another reactive signal. It warns with `state_referenced_locally` because this is almost always a mistake.

Why is it usually a mistake? Because the two signals are now disconnected. The `$state` variable gets the initial value from the prop, but if the prop changes later (the parent passes a new value), the `$state` variable doesn't update — it keeps the stale copy.

However, there's a legitimate case where you want exactly this behavior: **editable form fields**. A form field is initialized from the current value (so it shows the existing data), but then the user edits it and the field value diverges from the prop. You want the local copy to be mutable and independent.

The compiler can't tell these cases apart by looking at the signal types alone. The solution is to make your intent explicit.


## What goes wrong

```ts
// Warns: state_referenced_locally
let displayName = $state(publication?.displayName ?? "");
```

The compiler sees that `publication` is from `$props()` and warns that `displayName` is a local copy that may go stale.

### The wrong fix: `$derived`

Using `$derived` silences the warning but creates a different problem — `$derived` creates a read-only computed value that **resets every time the prop changes**:

```ts
let displayName = $derived(publication?.displayName ?? ""); // read-only, resets on prop change
```

This is wrong for a form field. As soon as the parent re-renders and passes a new `publication` prop (even if the same data), the user's in-progress edits would be wiped out.


## The correct fix

Introduce an intermediate `const` to break the reactive chain. A `const` is not reactive — it's a plain JavaScript value snapshot — so `$state` no longer tracks a prop source:

```ts
// Before (warns):
let displayName = $state(publication?.displayName ?? "");

// After (no warning, intended semantics):
const initialDisplayName = publication?.displayName ?? "";
let displayName = $state(initialDisplayName);
```

The `const` converts the reactive prop value into a plain JavaScript string. By the time `$state(initialDisplayName)` runs, there is no reactive signal to track — just a plain value. The compiler is satisfied, and the behavior is exactly what you want: seeded from the prop's initial value, then editable independently.


## Why this works

Think of it in JavaScript terms: `$state(someValue)` creates a reactive variable initialized to `someValue`. If `someValue` is a plain string like `"Alice"`, the state starts as `"Alice"` and future changes to that state are independent. If `someValue` is a reactive expression that could change later, the compiler warns because the connection is implicitly broken.

Using `const initialDisplayName = publication?.displayName ?? ""` evaluates the expression once to a plain string. That plain string then seeds the state. No ongoing reactive dependency.


## Full example: a form field component

```svelte
<script lang="ts">
  import type { AuthorViewModel } from '@readership/feature-account';

  let { author }: { author: AuthorViewModel } = $props();

  // Seed state from props once — user edits diverge from here
  const initialDisplayName = author.displayName ?? "";
  const initialBio = author.bio ?? "";

  let displayName = $state(initialDisplayName);
  let bio = $state(initialBio);
</script>

<label>
  Display name
  <input bind:value={displayName} />
</label>
<label>
  Bio
  <textarea bind:value={bio}></textarea>
</label>
```


## See also

- `feature-lib-forms.md` — how FormContent components receive and pass down initial values
- `form-result-type.md` — typing the form action result that updates these fields after save
