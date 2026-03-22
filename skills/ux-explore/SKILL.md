---
description: "Use when creating a quick wireframe, proof-of-concept, or approach comparison. Triggers on: \"ux explore\", \"quick wireframe\", \"wireframe this\", \"explore approach\", \"compare approaches\", \"single file prototype\", \"html mockup\". Produces a single self-contained HTML file with Tailwind CDN. No build step. Wireframe aesthetic."
name: ux:explore
license: MIT
compatibility: "Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline. Core functionality preserved on all platforms."
argument-hint: "[exploration-name] [--slideshow] [--bg] [--silent]"
context: fork
agent: general-purpose
model: claude-opus-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially. The `context: fork` and `agent:` frontmatter fields are Claude Code-specific — on OpenCode and VS Code Copilot they are ignored and the skill runs inline using the current model.

---

## Critical Principles

- "Wireframes fail at the edges, not the happy path." — Every wireframe that shows only idealized data is incomplete. Before finishing any screen, ask: what does this look like with zero items (empty state), with an error, and with maximum content? These are not optional — they are the most design-critical states.
- "Schematic until the interaction model is validated." — Wireframes exist to test ideas, not to demonstrate visual polish. Color choices, font weights, and spacing precision are noise at this stage. If the wireframe is beautiful but the interaction model is unresolved, the wrong thing has been optimized.
- "Specify what the developer would otherwise guess." — Any element that is ambiguous in the wireframe will be implemented with the developer's best guess. Click targets, form validation behavior, loading states, and navigation transitions must be described in comments or labeled annotations — not left implicit.

## Anti-Patterns

- ❌ **Designing only for ideal-case data**: Rendering lists with exactly 3 well-named items, forms with short inputs, and tables with uniform row heights. → Ask the user: "How many items at maximum? What's the longest realistic text string? What happens at zero?" Add at least one empty state and one overflow/error state per screen.
- ❌ **Omitting loading and error states**: Showing only the success path through a flow. → Any screen that involves data fetching, form submission, or async action must include a loading variant and an error variant. These states determine the actual UX quality more than the happy path.
- ❌ **Adding brand colors and visual polish prematurely**: Using specific hex values, custom fonts, or drop shadows in an early-exploration wireframe. → The wireframe aesthetic (gray scale, simple borders, no shadows) is a constraint, not a default style. Premature visual fidelity anchors stakeholders to a visual direction before the interaction model is validated.
- ❌ **Multi-step flows without transition labels**: Building anchor-linked multi-step flows where the link between screens is a button label but the navigation semantics are unspecified. → Each navigation action between screens must be labeled with its trigger (button, link, swipe) and its condition (always available, disabled until form is valid, only on mobile). Unlabeled transitions produce ambiguous prototypes.
- ❌ **No content scale constraints gathered**: Building the wireframe before asking about real data volumes. → Before Step 3 (Build), confirm: max list items, character limits for labels and body text, and whether any field can be absent/null. A wireframe that breaks at real data sizes wastes a review cycle.

---

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
