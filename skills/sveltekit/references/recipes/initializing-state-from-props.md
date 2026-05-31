# Recipe: Initializing $state from $props

## Problem

Svelte 5 warns `state_referenced_locally` when `$state()` is initialized directly from a `$props()` value. The compiler tracks the reactive source and suspects the developer intended the local value to stay in sync with the prop.

## Wrong Fix

Using `$derived` — this creates a read-only computed value that resets whenever the prop changes. Form fields need to diverge from the prop as the user types.

```ts
let displayName = $derived(publication?.displayName ?? ""); // ✗ read-only
```

## Correct Fix

Introduce an intermediate `const` to break the direct prop reference. The const is not reactive — it's a plain value snapshot — so `$state` no longer tracks a prop source.

```ts
// Before (warns):
let displayName = $state(publication?.displayName ?? "");

// After (no warning, identical semantics):
const initialDisplayName = publication?.displayName ?? "";
let displayName = $state(initialDisplayName);
```

## Why

`$state` and `$props` are reactive signals. The compiler detects when a `$state` variable's initial value comes from a signal and warns because this is almost always a mistake (the copy goes stale). Using an intermediate `const` converts the prop value into a plain JavaScript value before passing to `$state`, which is what you actually want for an editable form field that seeds from a prop then diverges.

## See Also

- `feature-lib-forms.md` — typing the form prop that feeds these fields
