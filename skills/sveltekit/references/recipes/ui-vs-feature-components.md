# UI Components vs Feature Components

## Why this matters

Every component you write has to live somewhere. Put it in the wrong place and you get coupling that's hard to break: feature code leaking into shared utilities, or the same component copied three times because it "kind of" belongs to multiple features.

The rule here is simple: **if a component knows about a domain concept (a Series, a Publication, a User), it's a feature component. If it could be dropped into any project unchanged, it's a UI component.**

What goes wrong when you mix them:
- A `Button` in `libs/ui/` that imports `SeriesStatus` from a feature lib — now `libs/ui/` depends on `feature-series`, and you can't use the button without the feature
- A `SeriesCard` in `libs/ui/` — it doesn't belong to any feature, so when the Series data model changes, no one knows where to update it
- The same `PublicationHeader` copied into three feature libs because "it's shared but also knows about publications"


## The decision table

| Question                                                                           | Answer         |
| ---------------------------------------------------------------------------------- | -------------- |
| Does this component know about a domain concept (Series, Publication, Post, User)? | Feature lib    |
| Is this component reusable across any feature without modification?                | `ui` lib       |
| Does this component import from a view model or feature service?                   | Feature lib    |
| Is this pure layout, styling, or interaction with no domain data?                  | `ui` lib       |

Quick gut-check: if you could copy this component into a completely different project and it would still make sense, it belongs in `libs/ui/`.


## Always check shadcn-svelte first

Before writing any new UI primitive, check shadcn-svelte. This project uses shadcn-svelte as its component foundation. If the component exists there, install it — don't reinvent it.

```bash
# Install a component from shadcn-svelte into libs/ui
pnpm dlx shadcn-svelte@latest add button
pnpm dlx shadcn-svelte@latest add dialog
pnpm dlx shadcn-svelte@latest add scroll-area
```

Installed components land in `libs/ui/src/components/<name>/` and are exported from `libs/ui/src/index.ts`.

Only write a custom component in `libs/ui/` when shadcn-svelte genuinely doesn't cover the need (for example, `ImageUploader` or `UnderlineTabs` — no shadcn equivalent exists). Custom components follow the same domain-agnostic rule: no feature types, no service imports.

**Reference docs:**
- shadcn-svelte: https://www.shadcn-svelte.com/llms.txt
- bits-ui primitives (what shadcn-svelte is built on): https://bits-ui.com/llms.txt


## UI lib (`libs/ui/`)

Feature-agnostic, domain-unaware components. Import only from `@readership/ui` — never from feature libs.

```
libs/ui/src/components/
├── Tabs.svelte          # tab bar + panels, no domain data
├── Button.svelte        # styled button variants
├── Avatar.svelte        # image with fallback initial — accepts `src` and `name`, not a User
├── Badge.svelte         # status/label pill — accepts a string, not a SeriesStatus
├── Modal.svelte         # overlay shell
└── Card.svelte          # generic card frame
```

Note how the `Avatar` accepts `src` and `name` (plain strings), not an `Author` object. Domain types must not enter `libs/ui/`:

```svelte
<!-- Correct: domain-agnostic -->
<Avatar src={author.avatar} name={author.displayName} />

<!-- Wrong: domain type leaked into ui lib -->
<AuthorAvatar author={author} />  <!-- "Author" is a domain concept -->
```


## Feature lib (`libs/feature-X/src/components/`)

Domain-aware components. Props are typed to view models from the same feature.

```svelte
<!-- feature component: SeriesCardViewModel is a domain type -->
<script lang="ts">
  import type { SeriesCardViewModel } from '../view-models/series';
  let { series }: { series: SeriesCardViewModel } = $props();
</script>

<!-- Uses UI primitives for atoms, domain knowledge stays here -->
<Card>
  <Avatar src={series.author.avatar} name={series.author.displayName} />
  <h2>{series.title}</h2>
  <Badge label={series.status} />
</Card>
```

`SeriesCard` knows about `SeriesCardViewModel`. `Card`, `Avatar`, and `Badge` stay clean — they just receive strings. The domain knowledge lives in exactly one place.


## Keeping feature components readable

Feature components should read as a description of what the user sees. When layout details take over the template, extract them into named sub-components:

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


## Cross-feature imports

Feature libs must not import from other feature libs. If two features need the same component, you have two options:

1. **If it's domain-agnostic** → move it to `libs/ui/`
2. **If it's domain-aware** → it belongs to one feature; the other feature gets its own version, or the shared type is extracted to `@readership/models`

There is no "shared feature component" — that's a sign that the component belongs in `libs/ui/` or that two features are being conflated into one.
