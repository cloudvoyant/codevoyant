# Dynamic Components in Svelte 5

## Why `<svelte:component>` was deprecated

In Svelte 4, rendering a component stored in a variable required a special syntax: `<svelte:component this={MyComponent} />`. There was no other way — component variables weren't usable as tags directly.

Svelte 5 runes mode changed this. Component constructors stored in variables can now be used as JSX-like tags directly: if the variable is capitalized (follows the component naming convention), Svelte treats it as a component tag. `<svelte:component>` became unnecessary — it was a workaround for what is now native syntax.

Using `<svelte:component>` in Svelte 5 runes mode triggers the `svelte_component_deprecated` warning. It still works for now but will be removed in a future version.


## The simple case: top-level script variable

If the component variable is declared in the `<script>` block, use it as a tag directly:

```svelte
<script lang="ts">
  import FooComponent from './FooComponent.svelte';
  import BarComponent from './BarComponent.svelte';

  let { useBar }: { useBar: boolean } = $props();
  const Comp = useBar ? BarComponent : FooComponent;
</script>

<!-- Comp is capitalized — Svelte renders it as a component -->
<Comp />
```

This is straightforward. The variable `Comp` holds a component constructor; Svelte renders it.


## The loop case: `{@const}` inside a template block

When the component variable is computed per-iteration inside an `{#each}` loop, `{@const}` creates a block-scoped binding. Svelte treats capitalized `{@const}` bindings as component constructors when used as tags:

```svelte
<!-- Before (deprecated): -->
{#each links as link}
  <svelte:component this={getIcon(link.type)} class="h-5 w-5" />
{/each}

<!-- After (Svelte 5 native syntax): -->
{#each links as link}
  {@const Icon = getIcon(link.type)}
  <Icon class="h-5 w-5" />
{/each}
```

`{@const}` is block-scoped — `Icon` only exists within the `{#each}` block. Svelte recognizes `Icon` as a component constructor because it starts with a capital letter.


## The conditional case: `{#if}` block

The same pattern works inside `{#if}` blocks:

```svelte
{#if isLoading}
  {@const StatusIcon = SpinnerIcon}
  <StatusIcon class="animate-spin" />
{:else}
  {@const StatusIcon = CheckIcon}
  <StatusIcon class="text-success" />
{/if}
```

Though in this case, it's often cleaner to use two separate `{#if}` blocks with direct component imports.


## Why `{@const}` works for this

`{@const}` creates a constant binding scoped to the current template block. Svelte 5's template compiler recognizes uppercase variable names as component constructors — the same rule that distinguishes `<div>` (HTML element) from `<Div>` (component). `{@const Icon = ...}` followed by `<Icon />` is idiomatic Svelte 5.

The old `<svelte:component this={...}>` was a Svelte 4 workaround for the absence of this native capability.


## See also

- [Svelte 5 migration guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- [Svelte 5 component basics](https://svelte.dev/docs/svelte/basic-markup#Component-syntax)
