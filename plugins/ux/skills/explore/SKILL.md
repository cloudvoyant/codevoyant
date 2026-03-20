---
description: "Use when creating a quick wireframe, proof-of-concept, or approach comparison. Triggers on: \"ux explore\", \"quick wireframe\", \"wireframe this\", \"explore approach\", \"compare approaches\", \"single file prototype\", \"html mockup\". Produces a single self-contained HTML file with Tailwind CDN. No build step. Wireframe aesthetic."
argument-hint: "[exploration-name] [--slideshow] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-opus-4-6
---

# ux:explore

Create a single self-contained HTML wireframe or approach comparison. No build step. Tailwind via CDN. Wireframe aesthetic by default.

## Step 0: Parse Args

Extract from arguments:

- `EXPLORATION_NAME` = first non-flag argument. If absent, ask: "What are we exploring?"
- `EXPLORATION_SLUG` = slugified name (see `references/utils.md` for slug derivation)
- `SLIDESHOW_MODE = true` if `--slideshow` is present
- `BG_MODE = true` if `--bg` is present
- `SILENT = true` if `--silent` is present

Output file: `{EXPLORATION_SLUG}.html` in current directory (or user-specified path).

## Step 1: Understand the Exploration

Ask the user to scope the exploration. Adapt the question to the mode.

**Default mode:**

```
AskUserQuestion:
  question: "What is this exploration for?"
  header: "Scope"
  options:
    - label: "Single screen or flow"
      description: "One concept, one file -- e.g. a dashboard, a form, a landing section"
    - label: "Multi-step flow"
      description: "Several screens linked together in one HTML file (anchor nav)"
    - label: "Switch to slideshow mode"
      description: "Compare multiple approaches side-by-side"
```

If the user selects "Switch to slideshow mode", set `SLIDESHOW_MODE = true` and continue with the slideshow flow below.

**Slideshow mode (`--slideshow`):**

Ask: "What approaches or states should the slideshow compare?" (free text)

Parse the response into `SLIDES[]` -- a list of named sections. Each entry becomes one slide in the output.

## Step 2: Gather Content Requirements

Ask:

1. "What content/interactions should this wireframe show?" (free text -- describe screens, flows, key elements)
2. "Any placeholder images needed?"

```
AskUserQuestion:
  question: "Include placeholder images?"
  header: "Images"
  options:
    - label: "Yes"
      description: "Use picsum.photos for placeholder images"
    - label: "No"
      description: "Text-only wireframe, no images"
```

## Step 3: Build the HTML File

Use the template from `references/html-template.md` as the base.

### Default mode rules

- Single scrollable HTML page
- Tailwind CDN for styling (script tag from template)
- Wireframe aesthetic: gray scale, simple borders, placeholder text, no animations
- If multi-step flow: use `id` anchors and a simple sticky nav with `<a href="#step-2">Next</a>` links
- Use semantic elements: `<section>`, `<header>`, `<main>`, `<aside>`
- External images OK (`picsum.photos` for placeholders, real CDN images if user specified)
- No local assets: no `<script src="./...">` or `<link href="./...">` pointing to local files

### Slideshow mode rules

- One `<section class="slide">` per item in `SLIDES[]`
- Sticky top nav listing slide names with anchor links
- Simple tab-like UI: Tailwind classes only, no JS frameworks
- Each slide labeled with `<h2>` matching the slide name
- See `references/html-template.md` for slideshow-specific markup patterns

## Step 4: Write File

Write the complete HTML to `{EXPLORATION_SLUG}.html`.

Open it in the browser (see `references/utils.md` for cross-platform open command):

```bash
open {EXPLORATION_SLUG}.html 2>/dev/null || xdg-open {EXPLORATION_SLUG}.html 2>/dev/null || echo "Open {EXPLORATION_SLUG}.html in your browser"
```

## Step 5: Report + Notify

Print the result summary:

```
Exploration written: {EXPLORATION_SLUG}.html
  Mode: {default | slideshow (N slides)}
  Open: open {EXPLORATION_SLUG}.html
```

If `BG_MODE=true` and `SILENT=false`, send a desktop notification (see `references/utils.md`):

```bash
npx @codevoyant/agent-kit notify --title "ux:explore complete" --message "Exploration '{EXPLORATION_SLUG}' written"
```
