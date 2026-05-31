# Recipe: App Shell

## What belongs in the shell

The shell owns everything that frames the app — not the content of any feature.

| Shell concern       | Example                                                  |
| ------------------- | -------------------------------------------------------- |
| Navigation sidebar  | route links, account menu, logo                          |
| App-wide top bar    | logo, page title area, action bar                        |
| Global overlays     | command palette, shared sheet/drawer, notification panel |
| Page layout wrapper | scroll area, left/right gutters, responsive breakpoints  |
| Global stores       | sidebar open/closed, mobile menu, scroll lock            |
| Server helpers      | auth, session, logger (server-only utilities)            |

**Not shell**: feature-specific right sidebars (editor sidebar, reading sidebar), route-specific content, business logic.

---

## Content projection via snippets

Shell components must accept arbitrary content from routes/features via Svelte 5 snippets. Do not use writable stores to inject content into shell components — that creates invisible coupling. Pass content as props.

### Bad: store-based injection

```svelte
<!-- route/+page.svelte -->
<script>
  import { topBarContent } from '@readership/feature-shell/stores';
  // Invisible side-effect — easy to leak and hard to trace
  topBarContent.set(mySnippet);
</script>
```

### Good: snippet props

```svelte
<!-- feature-shell/src/components/PageLayout.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children,
    topbar,
    rightSidebar,
  }: {
    children: Snippet;
    topbar?: Snippet;
    rightSidebar?: Snippet;
  } = $props();
</script>

<!-- top bar -->
{#if topbar}
  <header class="fixed top-0 inset-x-0 z-50 h-14 border-b bg-background">
    {@render topbar()}
  </header>
{/if}

<!-- main content -->
<main class="pt-14 lg:pl-[250px]">
  {@render children()}
</main>

<!-- right panel -->
{#if rightSidebar}
  <aside class="fixed right-0 inset-y-0 w-[250px]">
    {@render rightSidebar()}
  </aside>
{/if}
```

```svelte
<!-- apps/web/src/routes/write/[id]/+page.svelte -->
<script lang="ts">
  import { PageLayout } from '@readership/feature-shell';
  import { EditorTopBar, EditorSidebar } from '@readership/feature-dashboard';
  let { data } = $props();
</script>

<PageLayout>
  {#snippet topbar()}
    <EditorTopBar series={data.series} />
  {/snippet}

  {#snippet rightSidebar()}
    <EditorSidebar series={data.series} />
  {/snippet}

  <!-- page body -->
  <Editor content={data.content} />
</PageLayout>
```

---

## Shared shell overlays

Shared overlays (sheet, drawer, command palette) live in `feature-shell`. They accept content via snippets so features can drive their content without owning the overlay chrome.

### AppSheet pattern

```svelte
<!-- feature-shell/src/components/AppSheet.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@readership/ui';

  let {
    open = $bindable(false),
    side = 'right',
    title,
    children,
  }: {
    open?: boolean;
    side?: 'left' | 'right' | 'bottom';
    title?: Snippet;
    children: Snippet;
  } = $props();
</script>

<Sheet bind:open>
  <SheetContent {side} class="w-[400px] sm:w-[540px]">
    {#if title}
      <SheetHeader>
        <SheetTitle>{@render title()}</SheetTitle>
      </SheetHeader>
    {/if}
    {@render children()}
  </SheetContent>
</Sheet>
```

Usage from a feature:

```svelte
<script lang="ts">
  import { AppSheet } from '@readership/feature-shell';
  let sheetOpen = $state(false);
</script>

<button onclick={() => sheetOpen = true}>Open filters</button>

<AppSheet bind:open={sheetOpen}>
  {#snippet title()}Filter Series{/snippet}
  <FilterForm ... />
</AppSheet>
```

---

## Layout variants

When a route needs a meaningfully different layout (e.g., a full-bleed reading view, a centred marketing page), create a named layout variant in `feature-shell` rather than bypassing `PageLayout` with routing conditionals in `+layout.svelte`.

```
feature-shell/src/components/
├── PageLayout.svelte        # standard: sidebar + gutters + scroll area
├── FullBleedLayout.svelte   # full-width: no gutters, own scroll container
└── CentredLayout.svelte     # marketing: narrow centred column, no sidebar
```

In `+layout.svelte`, prefer importing the right variant over an `{#if isReadPage}` branch:

```svelte
<!-- apps/web/src/routes/read/+layout.svelte -->
<script>
  import { FullBleedLayout } from '@readership/feature-shell';
  let { children } = $props();
</script>

<FullBleedLayout>
  {@render children()}
</FullBleedLayout>
```

---

## Rules

- Shell components are content-agnostic: they receive snippets, not domain types
- Never import from a feature lib in `feature-shell`
- Shared overlays (sheet, drawer) live in `feature-shell`, not in individual features
- Use snippet props for layout injection; avoid stores for content that is scoped to a single route
- One layout variant per visual archetype; don't accumulate `{#if}` branches in `+layout.svelte`
