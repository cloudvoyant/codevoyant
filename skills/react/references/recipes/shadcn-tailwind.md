# Building UI with shadcn/ui and Tailwind CSS

## Why this matters

UI component libraries come in two flavors: packages you install and packages you own. Most libraries (`@mui/material`, `antd`) live in `node_modules` — you import them but can't change them without forking. That creates friction whenever your design diverges from what the library provides.

shadcn/ui takes a different approach: `npx shadcn@latest add button` copies the component's source code directly into your repo. You own it. You can modify it, add variants, and extend it without forking a package or fighting `!important` overrides.

Tailwind CSS v4 is the foundation. It dropped the JavaScript config file entirely — theming is now pure CSS variables. This means:

- Dark mode is a CSS class, not a media query.
- Rebranding means changing one CSS variable value, not a global find-and-replace.
- No build-time configuration overhead.

**What goes wrong without this setup:**
- Hardcoding color values like `bg-blue-500` means theming is a search-and-replace across hundreds of files.
- Without `cn()`, conditional class composition produces duplicate/conflicting utilities that the browser can't resolve predictably.
- Without `cva()`, variant logic leaks into components as long chains of ternaries.


Tailwind v4 (CSS-first, no `tailwind.config.js`) is the foundation; shadcn/ui generates components on top of it. Both depend on `cn()` and `cva()` from `conventions.md`.

## 1. Install Tailwind v4

```bash
pnpm add tailwindcss @tailwindcss/vite
pnpm add tw-animate-css
```

Only these packages. Do **not** install `postcss`, `autoprefixer`, or a `tailwindcss` CLI — v4 handles all of that.

## 2. Vite plugin — `vite.config.ts`

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

## 3. CSS entry — `src/styles.css`

One import replaces v3's three `@tailwind` directives:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));
```

`@custom-variant dark` makes the `dark:` prefix activate when an ancestor has `.dark`, controlled in JS rather than the OS media query.

Import once at the entry:

```ts
// src/main.tsx
import "./styles.css";
```

## 4. `shadcn@latest init`

```bash
npx shadcn@latest init
```

Choose **Neutral** base color. The CLI writes `components.json`, the `cn()` util at the `utils` alias, and the theming token blocks into `styles.css`.

Resulting `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "~/shared/components",
    "utils": "~/shared/lib/utils",
    "ui": "~/shared/components/ui",
    "lib": "~/shared/lib",
    "hooks": "~/shared/hooks"
  }
}
```

Field by field:
- `style: "new-york"` — current default (tighter spacing, `lucide` icons).
- `rsc: false` — client React (Vite SPA), not RSC. Set `true` only for Next.js App Router.
- `tailwind.config: ""` — empty on purpose. v4 has no JS config file.
- `tailwind.cssVariables: true` — components reference semantic utilities (`bg-primary`), not literal palette colors.
- `aliases` — point to your `~/shared/...` layout so `add button` writes `src/shared/components/ui/button.tsx`.

## 5. Theme tokens — the two-layer pattern

See the [shadcn/ui theming docs](https://ui.shadcn.com/docs/theming) for the full token reference. Here's what matters for our setup:

The CLI writes raw `oklch` values on `:root` / `.dark`, then aliases them into Tailwind utilities via `@theme inline`. You get class names like `bg-primary` that swap automatically on `.dark` — no component changes needed. The token block comes from `shadcn@latest init --base-color neutral` and should not be edited by hand after init (re-run `init` to regenerate).

Three extension patterns we actually use:

**Add a semantic token** (e.g. `success`):
```css
/* :root and .dark blocks */
:root { --success: oklch(0.65 0.15 145); }
.dark  { --success: oklch(0.55 0.12 145); }

/* @theme inline block */
@theme inline { --color-success: var(--success); }
```
Then use `bg-success`, `text-success`, etc.

**Rebrand**: only `--primary` (and its `-foreground`) needs to change. Everything else follows.

**Dark mode class**: `@custom-variant dark (&:is(.dark *))` means `.dark` on an ancestor — not a media query — controls dark mode. The JS theme toggle adds/removes `.dark` on `<html>`.

## 6. Dark mode toggle — light / dark / system

```tsx
import { useEffect, useState } from "react";

type Preference = "light" | "dark" | "system";

export function useTheme() {
  const [preference, setPreference] = useState<Preference>(
    () => (localStorage.getItem("theme") as Preference) ?? "system",
  );

  useEffect(() => {
    localStorage.setItem("theme", preference);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function apply(next: "light" | "dark") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(next);
    }

    const resolved = preference === "system" ? (mq.matches ? "dark" : "light") : preference;
    apply(resolved);

    if (preference !== "system") return;
    const onChange = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  return { preference, setPreference };
}
```

To avoid a flash on first paint, set `.dark` on `<html>` synchronously via an inline script in your HTML head reading the same `localStorage` key, before React mounts.

For persisted preference, swap `useState` for a Zustand store with `persist` (see `zustand.md`).

## 7. The `cn()` helper

`init` writes `src/shared/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- **`clsx`** flattens conditional class inputs.
- **`tailwind-merge`** resolves conflicting Tailwind utilities, last one wins.

```ts
cn("px-4 py-2", "px-6");                // → "py-2 px-6"
cn("text-red-500", cond && "text-blue-500");
```

This is what lets callers pass `className` to override component defaults rather than fight them.

## 8. Adding components

```bash
npx shadcn@latest add button card dialog input label
```

The CLI reads `components.json`, writes each component to your `ui` alias (`src/shared/components/ui/button.tsx`), and installs missing peer deps (`radix-ui`, `class-variance-authority`, etc).

**Ownership model:** there's no `@shadcn/ui` package. `add` copies source into your repo and you own it. Edit freely. "Updating" = re-running `add` and reconciling the diff with `git diff`, not bumping a version.

## 9. The cva variant pattern

Generated `src/shared/components/ui/button.tsx`:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "~/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? SlotPrimitive.Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

Three load-bearing patterns:

1. **`data-slot="button"`** — stable attribute other components target for styling (e.g. button group: `in-data-[slot=button-group]:rounded-lg`). Add one to every component.
2. **`asChild` + `Slot`** — merge styles onto the caller's child element instead of rendering a `<button>`: `<Button asChild><a href="/">Home</a></Button>`.
3. **`cn(buttonVariants({ variant, size, className }))`** — passing `className` *into* `buttonVariants` lets cva place it last so caller overrides win, then `cn` de-conflicts.
4. Variant class strings reference **theme tokens** (`bg-primary`), never literal colors — that's what makes theming work.

To add a project variant, extend the `cva` map directly (you own the file):

```tsx
variant: {
  // ...
  success: "bg-success text-white shadow-xs hover:bg-success/90",
}
```

Then add `--success` to `:root` and `.dark`, plus `--color-success: var(--success);` in `@theme inline`. Consumers get `<Button variant="success">` with full type safety.

## 10. Updating a component

There's no auto-upgrade:

```bash
git add -A && git commit -m "checkpoint before shadcn update"
npx shadcn@latest add button   # overwrite
git diff src/shared/components/ui/button.tsx
```

Keep custom variants in clearly-separated blocks in the `cva` map so the diff is easy to reconcile.

## v3 → v4 migration cheatsheet

| v3 (`tailwind.config.js`)            | v4 (CSS)                                            |
|--------------------------------------|-----------------------------------------------------|
| `content: [...]`                     | (gone) — sources auto-detected                       |
| `theme.extend.colors.primary`        | `@theme { --color-primary: ... }` (or `@theme inline`) |
| `theme.extend.fontFamily.sans`       | `@theme { --font-sans: ... }`                        |
| `theme.extend.borderRadius`          | `@theme { --radius-*: ... }`                         |
| `plugins: [require("@tailwindcss/forms")]` | `@plugin "@tailwindcss/forms";` in CSS          |
| `darkMode: "class"`                  | `@custom-variant dark (&:is(.dark *));` in CSS       |
| `@tailwind base/components/utilities` | `@import "tailwindcss";`                            |

Delete `postcss.config.js` and `tailwind.config.js`. Update `prettier.config.js` to use `tailwindStylesheet: "./src/styles.css"`.

## Monorepo: `@acme/ui` package (optional)

Lift the shadcn layer into a `libs/ui` workspace package so multiple apps share it. Layout:

```
libs/ui/
  components.json     # aliases use relative names: "components", "lib/utils", ...
  package.json
  index.ts            # barrel re-exports
  lib/utils.ts        # the one cn()
  styles/theme.css    # owns the token blocks
  components/ui/      # generated primitives
  hooks/
```

`libs/ui/package.json`:

```json
{
  "name": "@acme/ui",
  "version": "0.0.0",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": "./index.ts",
    "./theme.css": "./styles/theme.css"
  },
  "scripts": {
    "shadcn": "pnpm dlx shadcn@latest"
  }
}
```

Consuming app imports both the components and the theme:

```css
@import "tailwindcss";
@import "@acme/ui/theme.css";
```

```tsx
import { Button } from "@acme/ui";
```

Add components from any package directory: `pnpm --filter @acme/ui shadcn add button card`.

## Verify

```tsx
<Button>Default</Button>
<Button variant="outline" size="sm">Small outline</Button>
<Button className="w-full">Caller override wins</Button>
<Button asChild><a href="/">Link styled as button</a></Button>
```

Toggle `.dark` on `<html>` in devtools — background, text, border, and primary colors flip with no component changes.
