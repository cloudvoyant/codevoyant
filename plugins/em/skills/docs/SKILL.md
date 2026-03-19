---
description: Generate or update planning documentation in docs/planning/ from em plan artifacts. Produces architecture diagrams, roadmap summaries, and epic breakdowns in a format suitable for team wikis or GitHub Pages. Triggers on: em docs, generate planning docs, update docs planning, publish roadmap, document roadmap.
argument-hint: "[plan-slug] [--bg] [--silent]"
disable-model-invocation: true
context: fork
model: claude-sonnet-4-6
---

> **Compatibility**: If `Task` is unavailable, run parallel steps sequentially.

Generate or update planning documentation in `docs/planning/` from em plan artifacts.

## Step 0: Parse Args and Setup

Extract plan slug from the first argument. If not provided, default to the most recently modified plan under `.codevoyant/em/plans/`.

Extract flags:
```
BG_MODE = true if --bg present
SILENT  = true if --silent present
```

Set `PLAN_DIR=".codevoyant/em/plans/{slug}"`. Verify `{PLAN_DIR}/roadmap.md` exists — if not, report error and exit.

Set output directory: `docs/planning/`. Create if it does not exist:
```bash
mkdir -p docs/planning
```

## Step 1: Read Plan Artifacts

Read all plan artifacts:
- `{PLAN_DIR}/roadmap.md` — phases, themes, deliverables, architecture sections
- All `{PLAN_DIR}/breakdowns/*.md` — epic breakdowns with sub-tasks, estimates, and definitions of done
- `{PLAN_DIR}/review.md` — review findings (if present)

## Step 2: Generate Documentation

Generate the following files:

### docs/planning/roadmap.md

A clean, stakeholder-friendly version of the roadmap:
- Remove internal notes, implementation details, and working comments
- Keep: phases, themes, key deliverables, timelines, dependencies
- Add a header with plan name, date generated, and horizon
- Format for readability by non-engineers (clear headings, no jargon)

### docs/planning/architecture.md

Extract all ASCII architecture diagrams from breakdowns and the roadmap:
- Group by epic with context
- Include data flow descriptions
- Include API surface summaries
- Add a table of contents at the top

### docs/planning/{epic-slug}.md

One file per epic, containing:
- Epic summary paragraph
- Task list with estimates (T-shirt sizes)
- Dependencies between tasks
- Definition of Done
- Technical risks (if documented)

## Step 3: Write Files and Notify

Write all generated files to `docs/planning/`.

Report: list of files written with line counts.

If `BG_MODE=true`, send a desktop notification:

```
for _c in "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/em/scripts/notify.sh" "$HOME/.claude/plugins/em/scripts/notify.sh"; do [ -f "$_c" ] && bash "$_c" "em:docs complete" "Planning docs written to docs/planning/" && break; done
```
