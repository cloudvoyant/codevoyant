# Recipe: Composable Components

## Goal

A component should read like a description of what users see -- not like a data pipeline.

## Bad: data logic mixed into template

```svelte
{#each series.filter(s => s.type === 'post' && s.status === 'published') as post}
  <div class="flex gap-2">
    <img src={post.coverImage?.url} ... />
    <span>{post.title}</span>
  </div>
{/each}
```

## Good: named sub-components

```svelte
<PostList posts={publishedPosts} />
```

```ts
const publishedPosts = $derived(
  series.filter((s) => s.type === "post" && s.status === "published"),
);
```

## Guidelines

1. **One visual concern per component.** If you can name the section, extract it.
2. **Props mirror VM fields.** Components accept typed VM props -- no raw DB objects.
3. **Derived state in script, not in template.** Filter/transform in `$derived`, not inline in `{#each}`.
4. **No business logic in templates.** No fetch calls, no service imports -- data arrives via props.
5. **Named snippets for structural slots.** Use Svelte 5 `{#snippet}` for areas with distinct visual roles.

## When large HTML blocks are acceptable

Avoid writing large inline HTML chunks — extract named subcomponents instead. The exception is **complex UI components**: highly custom, feature-specific UI where the HTML cannot be meaningfully broken into independently reusable parts (e.g., a drag-and-drop editor surface, a rich reading sidebar, a cover image cropper). These are fine to keep as a single component file.

If a complex UI component grows to the point where its subcomponents are logically distinct but not reusable elsewhere, group them in a subfolder and export only the public-facing component:

```
feature-series/src/components/
├── ReadingSidebar.svelte        ← public API (exported from index.ts)
└── reading-sidebar/
    ├── SeriesNav.svelte         ← internal subcomponent
    └── SeriesReader.svelte      ← internal subcomponent
```

Only `ReadingSidebar.svelte` is exported from `feature-series/src/index.ts`. The subfolder components are implementation details.

## Component naming

- PascalCase: `SeriesCard.svelte`, `PostReader.svelte`
- Name describes what the user sees, not how it works: `PublicationHeader` yes not `PublicationDataDisplay` no

## Props pattern (Svelte 5)

```svelte
<script lang="ts">
  import type { SeriesCardViewModel } from '@readership/feature-series';

  let { series, onSelect }: {
    series: SeriesCardViewModel;
    onSelect?: (id: string) => void;
  } = $props();
</script>
```
