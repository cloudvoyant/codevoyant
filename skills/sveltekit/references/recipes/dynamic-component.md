# Recipe: Dynamic component in Svelte 5 runes mode

## Problem

`<svelte:component this={X} />` is deprecated in Svelte 5 runes mode. It triggers the `svelte_component_deprecated` warning.

## Wrong Fix

Keeping `<svelte:component>` — it still works but will be removed in a future version.

## Correct Fix

Use `{@const}` to bind the component to a local name, then use it as a tag directly. This only works inside template blocks (`{#each}`, `{#if}`, etc.) — the binding is scoped to the block.

```svelte
<!-- Before (deprecated): -->
{#each links as link}
  <svelte:component this={getIcon(link.type)} class="h-5 w-5" />
{/each}

<!-- After: -->
{#each links as link}
  {@const Icon = getIcon(link.type)}
  <Icon class="h-5 w-5" />
{/each}
```

If the component variable is at the top level of the script block (not inside a template block), just use it directly as a tag:

```svelte
<script>
  import DynamicComp from './DynamicComp.svelte';
  let Comp = condition ? FooComp : BarComp;
</script>

<Comp />
```

## Why

In Svelte 5 runes mode, component constructors stored in variables are renderable as tags directly. `{@const}` creates a block-scoped binding that Svelte treats as a component constructor when used as a tag (uppercase convention). The old `<svelte:component>` API was a Svelte 4 workaround for what is now native syntax.
