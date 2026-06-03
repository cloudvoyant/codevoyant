# ux

UX design workflows for quick wireframe explorations, full SvelteKit prototype scaffolding, and CSS design token synthesis from live sites.

## Requirements

- `mcp__claude-in-chrome__*` — browser automation required for `style-synthesize`

## Workflows

### explore — create a wireframe

Produce a self-contained `.html` file using Tailwind CDN — no build step, opens directly in a browser.

```bash
/ux explore "onboarding flow"                          # single self-contained wireframe
/ux explore "sidebar vs top nav" --slideshow           # compare approaches side-by-side in one file
/ux explore "checkout flow" --output path/to/file.html # write to a specific path
```

### prototype — scaffold a SvelteKit prototype

Scaffold a full SvelteKit + Tailwind + shadcn-svelte prototype with feature-slice architecture, fake data, and a responsive layout.

```bash
/ux prototype "admin dashboard"                        # interactive scaffold (in-repo or out-of-repo)
/ux prototype "admin dashboard" --bg                   # run scaffold in background, notify when done
/ux prototype "admin dashboard" --silent               # suppress desktop notification
```

Works in-repo (single package or pnpm workspace) or out-of-repo in `.codevoyant/[project]/prototypes/[name]/`. All data is hard-coded; fake auth accepts any valid input.

### style-synthesize — extract a site's visual style

Screenshot a URL at three breakpoints, analyze typography, color, and layout patterns, and write a Markdown report plus CSS custom-property theme file.

```bash
/ux style-synthesize https://linear.app               # synthesize from URL
/ux style-synthesize https://linear.app --name linear  # override the output slug
/ux style-synthesize https://linear.app --bg           # run in background, notify when done
/ux style-synthesize https://linear.app --silent       # suppress desktop notification
```

Output is written to `docs/ux/style-research/{slug}/`: `style-report.md` (palette, typography, spacing, component patterns) and `theme.css` (CSS custom properties, shadcn-svelte overrides, dark mode block). Breakpoints: 375px, 768px, 1440px.

### allow — pre-approve permissions

Write the allow entries needed for `style-synthesize` to run without permission prompts.

```bash
/ux allow                                              # write to project .claude/settings.json
/ux allow --global                                     # write to ~/.claude/settings.json
```

### help — list commands

```bash
/ux help                                               # list all ux commands
```
