# Writing Composable Svelte 5 Components

## Why this matters

A component should read like a description of what a user sees, not like a data-processing script. When components mix filtering, conditional logic, and layout all in the same template, they become hard to read, hard to test, and impossible to reuse.

The principle here is the same as in good prose: each paragraph (each component) has one subject. If you can name a section of a component's template — "the post list", "the author header", "the filter bar" — that's a signal it should be its own component.

What goes wrong without composability:
- A template with `{#each series.filter(s => s.type === 'post' && ...) as post}` inside a `{#if}` inside a mapping is unreadable on first glance
- Business logic in templates can't be unit tested without rendering
- Deeply nested template logic is copy-pasted rather than extracted


## Starting simple: the problem

Here's what an uncomposed component looks like. Everything is inline:

```svelte
{#each series.filter(s => s.type === 'post' && s.status === 'published') as post}
  <div class="flex gap-2">
    <img src={post.coverImage?.url} alt={post.title} />
    <span>{post.title}</span>
  </div>
{/each}
```

This seems fine until the filter gets more complex, the card layout changes, or you need this same list in another feature. Then you copy-paste it and maintain two versions.


## The composable version

Extract the filtering into `$derived`, extract the card rendering into a named subcomponent:

```svelte
<script lang="ts">
  import { PostCard } from './PostCard.svelte';
  let { series } = $props();

  const publishedPosts = $derived(
    series.filter((s) => s.type === 'post' && s.status === 'published')
  );
</script>

<PostList posts={publishedPosts} />
```

Now the template reads as: "show a PostList of published posts". The filtering logic lives in a named `$derived`, which can be reasoned about in isolation. The `PostCard` component can be tested and styled independently.


## Guidelines

### 1. One visual concern per component

If you can name the section, extract it. "Publication header", "series tab panel", "filter bar" — each should be its own component.

### 2. Props mirror view model fields

Components accept typed view model props, not raw DB objects:

```svelte
<script lang="ts">
  import type { SeriesCardViewModel } from '@readership/feature-series';

  let { series, onSelect }: {
    series: SeriesCardViewModel;
    onSelect?: (id: string) => void;
  } = $props();
</script>
```

Never pass a raw Firestore document to a component. If the DB schema changes, you should only have to update the view model and service — not every component.

### 3. Derived state in script, not in template

Filter, transform, and compute in `$derived`, not inline in `{#each}` or `{#if}`:

```ts
// Good: named, testable, separate from the template
const publishedPosts = $derived(
  series.filter((s) => s.type === 'post' && s.status === 'published')
);

// Bad: mixed into the template, invisible to tests
{#each series.filter(s => s.type === 'post' && s.status === 'published') as post}
```

### 4. No business logic in templates

No fetch calls, no service imports, no DB queries in components. Data arrives via props. Components render; services fetch.

### 5. Named snippets for structural slots

Use Svelte 5 `{#snippet}` for areas with distinct visual roles within a component (a card's header vs its body, a tab panel's content):

```svelte
<Card>
  {#snippet header()}
    <h2>{series.title}</h2>
  {/snippet}
  {#snippet body()}
    <p>{series.description}</p>
  {/snippet}
</Card>
```


## When large HTML blocks are acceptable

Avoid writing large inline HTML chunks — extract named subcomponents instead. The exception is **complex, highly custom UI** where the HTML cannot be meaningfully broken into independently reusable parts: a drag-and-drop editor surface, a rich reading sidebar, a cover image cropper.

When a complex component grows and its subcomponents are logically distinct but not reusable outside this context, group them in a subfolder and export only the top-level component:

```
feature-series/src/components/
├── ReadingSidebar.svelte        ← public API (exported from index.ts)
└── reading-sidebar/
    ├── SeriesNav.svelte         ← internal, not exported
    └── SeriesReader.svelte      ← internal, not exported
```

Only `ReadingSidebar.svelte` is exported from `index.ts`. The subfolder components are implementation details invisible to the rest of the app.


## Naming conventions

- PascalCase filenames: `SeriesCard.svelte`, `PostReader.svelte`
- Name describes what the user sees, not how it works:
  - `PublicationHeader` — yes (what the user sees)
  - `PublicationDataDisplay` — no (describes implementation)
  - `SeriesCard` — yes
  - `SeriesListItemRenderer` — no


## Putting it together

A well-composed feature component reads as a description of the UI:

```svelte
<!-- Good: reads like a UI description -->
<PublicationHeader {publication} {author} {isPersonal} />
<Tabs {tabs} bind:active>
  {#snippet panel('series')}
    <SeriesTab {series} {isPersonal} />
  {/snippet}
</Tabs>

<!-- Bad: layout details obscure the structure -->
<div class="flex flex-col gap-4 px-6 max-w-3xl mx-auto">
  <div class="flex items-center gap-3">
    <img src={publication.logo} class="w-12 h-12 rounded-full" />
    ...
  </div>
</div>
```

In the good version, you can understand the page structure at a glance. In the bad version, you have to parse the layout to understand what the page is showing.
