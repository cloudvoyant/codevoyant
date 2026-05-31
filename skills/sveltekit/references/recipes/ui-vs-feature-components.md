# Recipe: UI Lib vs Feature Lib Components

## The Rule

| Question                                                                           | Answer      |
| ---------------------------------------------------------------------------------- | ----------- |
| Does this component know about a domain concept (Series, Publication, Post, User)? | Feature lib |
| Is this component reusable across any feature without modification?                | `ui` lib    |
| Does this component import from a view model or feature service?                   | Feature lib |
| Is this pure layout, styling, or interaction (no domain data)?                     | `ui` lib    |

When in doubt: if you could copy this component into a different project unchanged, it belongs in `ui`.

## Prefer external UI components

**Before writing any new UI primitive, check shadcn-svelte first.**
This project uses shadcn-svelte as its component foundation. If the component exists there, install it — don't reinvent it.

```bash
# Install a component from shadcn-svelte into libs/ui
pnpm dlx shadcn-svelte@latest add button
pnpm dlx shadcn-svelte@latest add dialog
pnpm dlx shadcn-svelte@latest add scroll-area
```

Installed components land in `libs/ui/src/components/<name>/` and are exported from `libs/ui/src/index.ts`.

Only write a custom component in `libs/ui/` when shadcn-svelte genuinely doesn't cover the need (e.g., `ImageUploader`, `UnderlineTabs` — no shadcn equivalent). Custom components follow the same domain-agnostic rule: no feature types, no service imports.

**shadcn-svelte component reference**: https://www.shadcn-svelte.com/llms.txt
**bits-ui primitives** (shadcn-svelte is built on these): https://bits-ui.com/llms.txt

## UI lib (`libs/ui/`)

Feature-agnostic, domain-unaware components. Import only from `@readership/ui` -- never from feature libs.

```
libs/ui/src/components/
├── Tabs.svelte          # tab bar + panels, no domain data
├── Button.svelte        # styled button variants
├── Avatar.svelte        # image with fallback initial -- accepts `src` and `name`, not a User
├── Badge.svelte         # status/label pill -- accepts a string, not a SeriesStatus
├── Modal.svelte         # overlay shell
└── Card.svelte          # generic card frame
```

```svelte
<!-- ui component: no domain types -->
<Avatar src={author.avatar} name={author.displayName} />

<!-- wrong: domain type leaked into ui lib -->
<AuthorAvatar author={author} />   <!-- "Author" is a domain concept -->
```

## Feature lib (`libs/feature-X/src/components/`)

Domain-aware components. Props are typed to view models from the same feature.

```svelte
<!-- feature component: SeriesCardViewModel is a domain type -->
<script lang="ts">
  import type { SeriesCardViewModel } from '../view-models/series';
  let { series }: { series: SeriesCardViewModel } = $props();
</script>

<Card>
  <Avatar src={series.author.avatar} name={series.author.displayName} />
  <h2>{series.title}</h2>
  <Badge label={series.status} />
</Card>
```

Note: `SeriesCard` uses `Card`, `Avatar`, and `Badge` from `@readership/ui`. The UI components stay clean; the domain knowledge lives only in `SeriesCard`.

## Keeping feature components readable

Feature components should read as a description of what the user sees:

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

Extract layout-heavy sections into named components. Use `ui` primitives for the atoms.

## Cross-feature imports

Feature libs **must not** import from other feature libs. If two features need the same component:

1. If it is domain-agnostic -> move it to `ui`
2. If it is domain-aware -> it belongs to one feature; the other feature gets its own version or the shared type lives in `@readership/models`
