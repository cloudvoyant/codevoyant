# shadcn-svelte, bits-ui, and tailwind-variants

## Why this matters

UI component libraries save enormous time, but only when you use them correctly. shadcn-svelte is the component foundation for this project — it provides accessible, composable primitives (buttons, dialogs, tabs, inputs, and more) built on top of bits-ui headless components, styled with Tailwind CSS.

Three mistakes people make with this stack:
1. **Copying from React shadcn/ui** — the APIs are different. Data attributes, animation syntax, and Tailwind conventions diverge significantly. Code copied from the React version won't work.
2. **Using CSS classes for component variants** — this project uses `tailwind-variants` (`tv()`) for all variant logic, not global CSS classes. This keeps style logic co-located with the component and avoids `globals.css` bloat.
3. **Reinventing components** — before writing a new UI primitive, check shadcn-svelte. Most common components already exist.


## Registry priority

When you need a UI component, check in this order:

1. **shadcn-svelte** (`shadcn-svelte.com`) — always prefer this over the React shadcn/ui registry. The implementations diverge significantly: different primitives, different CSS architecture, different animation syntax.
2. **bits-ui** (`bits-ui.com`) — the underlying headless Svelte primitive library. A valid reference when shadcn-svelte lacks a component you need.
3. **Community / third-party registries** — check with the team before using components from other registries.
4. **React shadcn/ui** — do NOT copy directly. The `data-open:` vs `data-[state=open]:` attribute syntax, animation classes, and CSS architecture all differ.


## Installing and updating components

See the [shadcn-svelte component list](https://next.shadcn-svelte.com/docs/components) for what's available.

```bash
pnpx shadcn-svelte@latest add button
```

Components land in `libs/ui/src/components/{component}/` and must be exported from `libs/ui/src/index.ts`.

**Ownership model:** there is no `@shadcn-svelte` package to upgrade. `add` copies source into your repo and you own it — edit freely. To update a component, re-run `add` and use `git diff` to reconcile your customizations. Keep custom variants in clearly-delimited sections of the `tv()` map so that diff is readable.


## Component variants with `tailwind-variants`

Use `tailwind-variants` (`tv()`) for all shadcn-svelte component variants. This is the officially endorsed pattern for this project.

### Setting up variants

Export the variants object and its prop types from the `<script lang="ts" module>` block so they're accessible without instantiating the component:

```ts
// libs/ui/src/components/input/Input.svelte
<script lang="ts" module>
  import { tv, type VariantProps } from "tailwind-variants";

  export const inputVariants = tv({
    base: "w-full text-foreground",
    variants: {
      variant: {
        default: "bg-input border border-border rounded-md px-3 py-1.5 focus-visible:ring-1",
        inplace: "bg-transparent border-none rounded-none px-0 py-0 shadow-none outline-none focus-visible:ring-0",
      },
    },
    defaultVariants: { variant: "default" },
  });

  export type InputVariant = VariantProps<typeof inputVariants>["variant"];
</script>
```

### Rules for variants

- Express all visual variants as **direct Tailwind utility classes** — do not delegate to global CSS classes or `@layer components`
- Do not use `!important` (`!` prefix) in variant classes; if overrides are needed, remove the conflicting global rule instead
- Export `{Component}Variants` and the corresponding VariantProps types from the module block


## Global CSS rules

Keep `globals.css` minimal:

- **Allowed in `globals.css`**: CSS variables, `@layer base` resets, and theme tokens
- **Not allowed**: component-specific styles
- **Specifically**: any "global" input/textarea base styling belongs in the component's `default` variant, not in `input[type="text"]` selectors in global CSS

The reason: component-specific rules in `globals.css` create invisible coupling between the stylesheet and the component. When the component changes, the global rule often lingers. When you're debugging a style issue, you have to check two places. Keep component styles with the component.


## Referencing docs

When working with shadcn-svelte or bits-ui components, reference these LLM-friendly docs:

- shadcn-svelte: https://www.shadcn-svelte.com/llms.txt
- bits-ui: https://bits-ui.com/llms.txt
