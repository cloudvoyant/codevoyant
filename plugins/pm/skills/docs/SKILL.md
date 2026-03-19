---
description: Generate or update product documentation in docs/product/ from pm plan artifacts. Produces a stakeholder-friendly roadmap, individual feature pages from PRDs, and a product overview. Triggers on: pm docs, generate product docs, update docs product, publish prd, document product, product documentation.
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

```
for _c in "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/pm/scripts/notify.sh" "$HOME/.claude/plugins/pm/scripts/notify.sh"; do [ -f "$_c" ] && bash "$_c" "pm:docs complete" "Product docs written to docs/product/" && break; done
```

Report: `Product docs written to docs/product/ ({N} feature pages + roadmap + overview)`
