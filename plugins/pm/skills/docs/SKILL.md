---
description: "Use when generating or updating product documentation from pm artifacts. Triggers on: \"pm docs\", \"generate product docs\", \"publish prd\", \"document product\", \"update docs product\". Produces stakeholder-friendly roadmap, feature pages from PRDs, and product overview in docs/product/."
argument-hint: "[plan-slug] [--bg] [--silent]"
disable-model-invocation: true
context: fork
model: claude-sonnet-4-6
---

Generate product documentation from pm plan artifacts.

## Step 0: Parse arguments

Parse the user's input for:
- A plan slug (e.g. `quarter-2026-q2`) — used to locate `PLAN_DIR=".codevoyant/pm/plans/{slug}"`
- If no slug provided, default to the most recently modified plan directory under `.codevoyant/pm/plans/`
- Flags: `--bg` (background notification on completion), `--silent` (suppress output)

Set output directory: `docs/product/`. Create if it does not exist.

## Step 1: Read plan artifacts

Read `{PLAN_DIR}/roadmap.md` and all `{PLAN_DIR}/prds/*.md`.

If `roadmap.md` does not exist, report an error and stop: `No roadmap found at {PLAN_DIR}/roadmap.md. Run pm:plan first.`

## Step 2: Generate documentation

Generate three types of docs files:

### docs/product/roadmap.md
A stakeholder-readable roadmap:
- No internal estimates or team capacity details
- Focus on themes, timelines, and user value
- Phased structure matching the roadmap but cleaned for external audiences

### docs/product/{feature-slug}.md
One page per feature (one per PRD found):
- Problem statement
- User stories (P0/P1/P2)
- Success metrics
- Out-of-scope items
- Sourced from the PRD, cleaned up for external audiences (remove internal notes, engineering jargon)

### docs/product/README.md
Product overview page:
- Brief product description
- Link to the roadmap page
- Links to all individual feature pages
- Organized by roadmap phase/theme

## Step 3: Write files and notify

Write all generated files to `docs/product/`.

If `--bg`, notify:

```bash
npx @codevoyant/agent-kit notify --title "pm:docs complete" --message "Product docs written to docs/product/"
```

Report: `Product docs written to docs/product/ ({N} feature pages + roadmap + overview)`
