# Style Report Template

Use for `docs/ux/style-research/{source}/style-report.md`.

---

# {SOURCE_NAME} Style Report

**URL:** {SOURCE_URL}
**Analyzed:** {YYYY-MM-DD}
**Breakpoints:** 375px / 768px / 1440px

## Overall Aesthetic
{3-5 adjectives + one paragraph describing the design language}

## Color Palette

| Role | Value | Notes |
|---|---|---|
| Background | `{#hex}` | Primary page bg |
| Surface | `{#hex}` | Card, panel bg |
| Border | `{#hex}` | Dividers, input borders |
| Text primary | `{#hex}` | Headings, body |
| Text secondary | `{#hex}` | Captions, labels |
| Text muted | `{#hex}` | Placeholder, disabled |
| Brand | `{#hex}` | Primary action, links |
| Brand hover | `{#hex}` | Hover state of brand |
| Success | `{#hex}` | |
| Error | `{#hex}` | |

## Typography

| Element | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Heading 1 | {font} | {size} | {weight} | |
| Heading 2 | {font} | {size} | {weight} | |
| Body | {font} | {size} | {weight} | Line height: {lh} |
| Label | {font} | {size} | {weight} | Tracking: {tracking} |
| Code/mono | {font} | {size} | {weight} | |

## Spacing & Layout

- **Container max-width:** {value}
- **Horizontal padding:** {value}
- **Section vertical gap:** {value}
- **Card padding:** {value}
- **Border radius (default):** {value}
- **Border radius (large):** {value}

## Component Patterns

### Buttons
{description of filled, outlined, ghost variants}

### Form Inputs
{border style, focus ring, label position}

### Navigation
{sticky/fixed, blur, mobile behavior}

### Cards
{flat/raised/bordered, shadow treatment}

### Badges / Tags
{shape, color treatment}

## Responsive Behavior

| Breakpoint | Key Changes |
|---|---|
| 375px | {observations} |
| 768px | {observations} |
| 1440px | {observations} |

## Motion & Interaction

- **Hover transitions:** {duration, property, easing}
- **Page transitions:** {none / fade / slide}
- **Animations:** {any notable animations}

## How to Apply This Style

{1-2 paragraphs: Tailwind config changes, shadcn-svelte variable overrides, Google Fonts to load}
