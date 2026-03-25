# SvelteKit + Tailwind + shadcn-svelte Setup Guide

Step-by-step reference for scaffolding the prototype's tech stack. Used by the ux:prototype skill in Steps 4 and 6.

## 1. Create SvelteKit Project

```bash
cd {PARENT_DIR}
npx sv create {PROTOTYPE_SLUG} --template minimal --types ts --no-add-ons
cd {PROTOTYPE_SLUG}
pnpm install
```

This creates a minimal SvelteKit project with TypeScript support and no additional add-ons (we add them manually for control).

## 2. Install Tailwind CSS

Use the official SvelteKit Tailwind integration:

```bash
pnpm dlx sv add tailwindcss
```

This automatically:
- Installs `tailwindcss`, `@tailwindcss/vite`
- Creates/updates `src/app.css` with Tailwind directives
- Configures the Vite plugin

## 3. Install shadcn-svelte

```bash
pnpm dlx shadcn-svelte@latest init
```

Accept defaults when prompted. This creates:
- `src/lib/components/ui/` -- directory for shadcn component files
- `components.json` -- shadcn-svelte configuration
- Updates `src/lib/utils.ts` with the `cn()` utility

### Adding components

Install individual components as needed:

```bash
pnpm dlx shadcn-svelte@latest add button
pnpm dlx shadcn-svelte@latest add card
pnpm dlx shadcn-svelte@latest add input
pnpm dlx shadcn-svelte@latest add dialog
```

Components are copied into `src/lib/components/ui/` as source files -- they are fully customizable.

### Version note

Use the stable release of shadcn-svelte. If the project uses Svelte 5 and compatibility issues arise, try `shadcn-svelte@next` instead.

## 4. Add Google Fonts

Edit `src/app.html` to add font links in the `<head>`:

```html
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="%sveltekit.assets%/favicon.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family={FONT_FAMILY}:wght@400;500;600;700&display=swap" rel="stylesheet" />

  %sveltekit.head%
</head>
```

Common font choices by style direction:
- **Linear / Vercel**: `JetBrains+Mono` (monospace accents) + `Inter` (body)
- **Notion / Craft**: `Inter` or `Source+Serif+4`
- **Stripe / Resend**: `Inter`
- **Shadcn default**: System font stack (no Google Font needed)

## 5. Configure CSS Custom Properties for Theming

Edit `src/app.css` to define theme variables. Place these after the Tailwind directives:

```css
@import 'tailwindcss';

:root {
  --color-primary: #3b82f6;
  --color-primary-foreground: #ffffff;
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-muted: #f5f5f5;
  --color-muted-foreground: #737373;
  --color-accent: #f5f5f5;
  --color-accent-foreground: #171717;
  --color-border: #e5e5e5;
  --color-input: #e5e5e5;
  --color-ring: #3b82f6;

  --radius: 0.5rem;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

Adjust values based on the chosen style direction.

## 6. Configure Tailwind to Use CSS Custom Properties

In Tailwind v4 (used by SvelteKit's integration), extend the theme in `src/app.css` using `@theme`:

```css
@theme {
  --color-primary: var(--color-primary);
  --color-primary-foreground: var(--color-primary-foreground);
  --color-background: var(--color-background);
  --color-foreground: var(--color-foreground);
  --color-muted: var(--color-muted);
  --color-muted-foreground: var(--color-muted-foreground);
  --color-accent: var(--color-accent);
  --color-accent-foreground: var(--color-accent-foreground);
  --color-border: var(--color-border);
  --color-input: var(--color-input);
  --color-ring: var(--color-ring);
  --radius: var(--radius);
}
```

This allows using classes like `bg-primary`, `text-foreground`, `border-border`, `rounded-[var(--radius)]` throughout the app.

## 7. Path Aliases in svelte.config.js

Add path aliases for the feature-slice architecture:

```js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      '$app': './src/app',
      '$libs': './src/libs',
      '$features': './src/libs/features',
      '$ui': './src/libs/ui',
      '$layout': './src/libs/layout',
      '$factories': './src/libs/factories',
      '$validators': './src/libs/validators',
    },
  },
};

export default config;
```

These aliases enable clean imports like:
```ts
import { Container, Stack } from '$layout';
import { createUserVM } from '$factories/user';
import type { DashboardItem } from '$features/feature-dashboard';
```

## 8. Validation Commands

After setup, run these to verify everything works:

```bash
pnpm run check   # runs svelte-check for type errors
pnpm run build   # full production build
pnpm run dev     # start dev server (default: http://localhost:5173)
```

Fix any errors before proceeding to feature implementation.
