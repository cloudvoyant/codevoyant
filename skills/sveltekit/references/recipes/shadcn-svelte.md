# shadcn-svelte Components

Rules and recipes for working with shadcn-svelte components.

## Registry Priority

1. **shadcn-svelte** (`shadcn-svelte.com`) — always prefer this over the React shadcn/ui registry; implementations diverge significantly (different primitives, CSS architecture, animation syntax)
2. **bits-ui** (`bits-ui.com`) — the underlying Svelte primitive library; valid reference when shadcn-svelte lacks a component
3. **Community / third-party registries** — ask the user before using components from registries other than shadcn-svelte or bits-ui
4. **React shadcn/ui** — do NOT copy directly; Tailwind variant attribute syntax (`data-open:` vs `data-[state=open]:`), animation classes, and CSS architecture all differ

## Component Variants

Use `tailwind-variants` (`tv()`) for all shadcn-svelte component variants. This is the officially endorsed pattern.

```ts
// Module-level export (accessible without component instantiation)
export const inputVariants = tv({
  base: "w-full text-foreground ...",
  variants: {
    variant: {
      default: "bg-input border border-border rounded-md px-3 py-1.5 ...",
      inplace:
        "bg-transparent border-none rounded-none px-0 py-0 shadow-none outline-none focus-visible:ring-0 focus-visible:outline-none",
    },
  },
  defaultVariants: { variant: "default" },
});

export type InputVariant = VariantProps<typeof inputVariants>["variant"];
```

- Export `{Component}Variants` and `{Component}VariantProps` types from the `<script lang="ts" module>` block
- Express all visual variants as **direct Tailwind utility classes** — do not delegate to global CSS classes or `@layer components`
- Do not use `!important` (`!` prefix) in variant classes; if overrides are needed, remove the conflicting global rule instead

## Global CSS Rules

- Do **not** add component-specific styles to `globals.css`
- `globals.css` should only contain: CSS variables, `@layer base` resets, and theme tokens
- Any "global" input/textarea base styling belongs in the component's `default` variant, not in `input[type="text"]` selectors in global CSS

## Adding New Components

```bash
# Install via shadcn-svelte CLI
pnpx shadcn-svelte@latest add <component>
# Components land in libs/ui/src/components/{component}/
# Export from libs/ui/src/index.ts
```
