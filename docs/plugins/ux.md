<script setup>
import { withBase } from 'vitepress'
</script>

# UX Plugin *(Experimental)*

UX prototyping and style research — scaffold SvelteKit prototypes, create lightweight wireframe explorations, and synthesize visual styles from live sites.

## Installation

**Claude Code:**
```bash
/plugin marketplace add cloudvoyant/codevoyant
/plugin install ux
```

**OpenCode / VS Code Copilot:** See the [installation guide](/installation).

## Typical Workflows

### Prototype a new product feature

```bash
/ux:prototype "admin dashboard"
```

Scaffolds a full SvelteKit + Tailwind + shadcn-svelte prototype with feature-slice architecture, fake data, and a responsive layout. Works in-repo (single package or pnpm workspace) or out-of-repo in `.codevoyant/[project]/prototypes/[name]/`.

### Explore layout ideas before committing

```bash
/ux:explore "onboarding flow"                # single HTML wireframe
/ux:explore "sidebar vs top nav" --slideshow # compare approaches side-by-side
```

Outputs a self-contained `.html` file — no build step, opens directly in a browser.

### Extract a site's visual style

```bash
/ux:style-synthesize https://linear.app --name linear
```

Screenshots the site at three breakpoints, analyzes typography, color, and layout patterns, and writes a Markdown report + CSS custom-property theme file to `docs/ux/style-research/linear/`.

## Skills

### Scaffold Prototype

```bash
/ux:prototype "<description>"
```

**What happens:**
1. Asks whether to scaffold in-repo (single package or monorepo) or out-of-repo
2. Asks for a style direction (minimal, bold, dashboard, etc.)
3. Lists key features to implement
4. Runs `npx sv create` + installs Tailwind and shadcn-svelte
5. Creates feature-slice directory structure under `src/libs/features/`
6. Implements the layout shell first, then each feature in order
7. All data is hard-coded; fake auth accepts any valid input

**Architecture:**
- `src/app/` — app shell, layouts, routing
- `src/libs/features/feature-[name]/` — components, view-models, state, actions
- `src/libs/ui/` `src/libs/layout/` `src/libs/factories/` `src/libs/validators/` — shared libs
- shadcn-svelte for all UI components; zod + factory pattern for data shapes

**Flags:**
- `--bg` — run scaffold in background, notify when done
- `--silent` — suppress desktop notification

### Wireframe Explorer

```bash
/ux:explore "<description>" [--slideshow] [--output path]
```

Creates a single `.html` file using Tailwind CDN — no build step required. Open directly in a browser for fast iteration.

**Modes:**
- Default — self-contained prototype of one approach
- `--slideshow` — multiple sections in one file for comparing approaches side-by-side

**Flags:**
- `--slideshow` — compare multiple approaches in a single file
- `--output <path>` — write to a specific file path (default: current directory)

### Style Synthesize

```bash
/ux:style-synthesize <url> [--name name]
```

Uses browser automation (`mcp__claude-in-chrome__*`) to visit a URL, screenshot across breakpoints, and synthesize the visual design into reusable artifacts.

**Output** (written to `docs/ux/style-research/{source}/`):
- `style-report.md` — color palette, typography, spacing, component patterns, responsive behavior
- `theme.css` — CSS custom properties for colors, radius, and spacing; shadcn-svelte variable overrides; dark mode block

**Breakpoints:** 375px (mobile) · 768px (tablet) · 1440px (desktop)

**Flags:**
- `--name <name>` — override the source slug (default: derived from URL domain)
- `--bg` — run in background, notify when done
- `--silent` — suppress desktop notification

### List All Commands

```bash
/ux:help
```
