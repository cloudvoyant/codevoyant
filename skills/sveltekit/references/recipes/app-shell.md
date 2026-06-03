# Building the App Shell

## Why this matters

Every app has UI that wraps all pages: the navigation sidebar, the top bar, the page layout with gutters and scroll areas. It's tempting to put this directly in `+layout.svelte` and drive it with shared state. But when each route needs different content in the top bar (the editor has a different toolbar than the reader), you end up with either a sprawling `{#if}` chain or invisible global state mutations that are hard to trace.

The app shell pattern solves this cleanly: layout components live in `feature-shell`, they define slots for route-specific content, and each route fills those slots via Svelte 5 snippets. The shell stays content-agnostic; the route stays in control of what it renders.


## What belongs in the shell

The shell owns everything that **frames** the app — not the content of any feature:

| Shell concern       | Example                                                  |
| ------------------- | -------------------------------------------------------- |
| Navigation sidebar  | route links, account menu, logo                          |
| App-wide top bar    | logo, page title area, action bar                        |
| Global overlays     | command palette, shared sheet/drawer, notification panel |
| Page layout wrapper | scroll area, left/right gutters, responsive breakpoints  |
| Global stores       | sidebar open/closed, mobile menu, scroll lock            |
| Server helpers      | auth, session, logger (server-only utilities)            |

**Not shell**: feature-specific right sidebars (editor sidebar, reading sidebar), route-specific content, business logic.

If you're asking "does the editor sidebar belong in the shell?", the answer is no — it's specific to the editor feature. The shell provides the slot; the editor feature fills it.


## Content projection with Svelte 5 snippets

Routes need to inject content into the shell (a custom top bar, a sidebar). The wrong way to do this is a writable store — it creates invisible coupling where the route mutates global state and the shell reads it, making the data flow impossible to follow.

The right way is snippet props: the layout component declares what slots it accepts, and routes pass content as props.

### What goes wrong with store-based injection

```svelte
<!-- route/+page.svelte -->
<script>
  import { topBarContent } from '@readership/feature-shell/stores';
  // Sets global state as a side-effect of rendering — easy to leak,
  // hard to trace, doesn't clean up when the route unmounts.
  topBarContent.set(mySnippet);
</script>
```

The problem: the shell is now implicitly coupled to the route. There's no way to know from looking at the shell what content it might receive. And if the route forgets to clean up the store, stale content persists.

### The correct approach: snippet props

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

<!-- top bar — only renders if the route provides it -->
{#if topbar}
  <header class="fixed top-0 inset-x-0 z-50 h-14 border-b bg-background">
    {@render topbar()}
  </header>
{/if}

<!-- main content -->
<main class="pt-14 lg:pl-[250px]">
  {@render children()}
</main>

<!-- right panel — only renders if the route provides it -->
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

The data flow is explicit and readable: the route decides what fills each slot. The shell has no knowledge of `EditorTopBar` or `EditorSidebar`.


## Shared overlays (sheet, drawer, command palette)

Global overlays live in `feature-shell` so every feature can use them without reimplementing the chrome. Features drive the content via snippets, not by owning the overlay component.

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

Using it from a feature:

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

The feature controls when the sheet opens and what content it shows. The shell provides the animation, backdrop, and close behavior.


## Layout variants

Some routes need a fundamentally different layout (a full-bleed reading view, a centered marketing page). Create named layout variants in `feature-shell` rather than adding `{#if isReadPage}` branches to `+layout.svelte`. Each variant is a separate component with its own structure.

```
feature-shell/src/components/
├── PageLayout.svelte        # standard: sidebar + gutters + scroll area
├── FullBleedLayout.svelte   # full-width: no gutters, own scroll container
└── CentredLayout.svelte     # marketing: narrow centred column, no sidebar
```

In `+layout.svelte`, import the right variant:

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

This keeps each layout variant focused and testable in isolation. The alternative — a single `PageLayout` with boolean flags and `{#if}` branches — becomes unmaintainable once you have three or four layout types.


## Rules

- Shell components are content-agnostic: they receive snippets, not domain types
- Never import from a feature lib in `feature-shell` — the dependency flows outward only
- Shared overlays (sheet, drawer) live in `feature-shell`, not in individual features
- Use snippet props for layout injection; never use stores for content scoped to a single route
- One layout variant per visual archetype; don't accumulate `{#if}` branches in `+layout.svelte`
