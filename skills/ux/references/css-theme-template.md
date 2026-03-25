# CSS Theme Template

Use for `docs/ux/style-research/{source}/theme.css`.

Comment each value as `/* observed */` if taken directly from a screenshot or computed style, or `/* approximated */` if estimated.

---

```css
/*
 * {SOURCE_NAME} Theme
 * Synthesized from: {SOURCE_URL}
 * Date: {YYYY-MM-DD}
 *
 * Usage: copy into your project's app.css or import it.
 * Adjust shadcn-svelte variables below to match your component library.
 */

/* ------------------------------------------------
 * Font imports
 * Replace with the actual Google Fonts URL for the
 * families identified in the style report.
 * ------------------------------------------------ */
/* @import url('https://fonts.googleapis.com/css2?family={heading-font}:wght@400;500;600;700&family={body-font}:wght@400;500;600&display=swap'); */

:root {
  /* -- Colors ----------------------------------- */
  --color-background: {#hex};
  --color-surface: {#hex};
  --color-border: {#hex};
  --color-text-primary: {#hex};
  --color-text-secondary: {#hex};
  --color-text-muted: {#hex};
  --color-brand: {#hex};
  --color-brand-hover: {#hex};
  --color-success: {#hex};
  --color-error: {#hex};
  --color-warning: {#hex};

  /* -- Typography ------------------------------- */
  --font-heading: '{heading-font}', sans-serif;
  --font-body: '{body-font}', sans-serif;
  --font-mono: '{mono-font}', monospace;
  --font-size-base: {size};
  --line-height-base: {lh};

  /* -- Spacing ---------------------------------- */
  --spacing-xs: {value};
  --spacing-sm: {value};
  --spacing-md: {value};
  --spacing-lg: {value};
  --spacing-xl: {value};

  /* -- Radii ------------------------------------ */
  --radius-sm: {value};
  --radius-md: {value};
  --radius-lg: {value};

  /* -- Shadows ---------------------------------- */
  --shadow-sm: {value};
  --shadow-md: {value};

  /* -- Layout ----------------------------------- */
  --container-max-width: {value};
  --container-padding: {value};

  /* =============================================
   * shadcn-svelte variable overrides
   * Map the above tokens to shadcn's expected vars.
   * These use HSL channel format: H S% L%
   * ============================================= */
  --background: {h} {s}% {l}%;
  --foreground: {h} {s}% {l}%;
  --card: {h} {s}% {l}%;
  --card-foreground: {h} {s}% {l}%;
  --popover: {h} {s}% {l}%;
  --popover-foreground: {h} {s}% {l}%;
  --primary: {h} {s}% {l}%;
  --primary-foreground: {h} {s}% {l}%;
  --secondary: {h} {s}% {l}%;
  --secondary-foreground: {h} {s}% {l}%;
  --muted: {h} {s}% {l}%;
  --muted-foreground: {h} {s}% {l}%;
  --accent: {h} {s}% {l}%;
  --accent-foreground: {h} {s}% {l}%;
  --destructive: {h} {s}% {l}%;
  --destructive-foreground: {h} {s}% {l}%;
  --border: {h} {s}% {l}%;
  --input: {h} {s}% {l}%;
  --ring: {h} {s}% {l}%;
  --radius: {value};
}

/* ------------------------------------------------
 * Dark mode overrides
 * Only include if the source site supports dark mode.
 * ------------------------------------------------ */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: {#hex};
    --color-surface: {#hex};
    --color-border: {#hex};
    --color-text-primary: {#hex};
    --color-text-secondary: {#hex};
    --color-text-muted: {#hex};
    --color-brand: {#hex};
    --color-brand-hover: {#hex};

    /* shadcn-svelte dark overrides */
    --background: {h} {s}% {l}%;
    --foreground: {h} {s}% {l}%;
    --card: {h} {s}% {l}%;
    --card-foreground: {h} {s}% {l}%;
    --popover: {h} {s}% {l}%;
    --popover-foreground: {h} {s}% {l}%;
    --primary: {h} {s}% {l}%;
    --primary-foreground: {h} {s}% {l}%;
    --secondary: {h} {s}% {l}%;
    --secondary-foreground: {h} {s}% {l}%;
    --muted: {h} {s}% {l}%;
    --muted-foreground: {h} {s}% {l}%;
    --accent: {h} {s}% {l}%;
    --accent-foreground: {h} {s}% {l}%;
    --destructive: {h} {s}% {l}%;
    --destructive-foreground: {h} {s}% {l}%;
    --border: {h} {s}% {l}%;
    --input: {h} {s}% {l}%;
    --ring: {h} {s}% {l}%;
  }
}
```
