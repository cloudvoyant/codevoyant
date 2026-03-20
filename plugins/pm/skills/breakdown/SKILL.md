---
description: "Use when breaking down a product feature into a full PRD. Triggers on: \"pm breakdown\", \"break down feature\", \"feature breakdown\", \"design feature\", \"pm prd for feature\". Called automatically by pm:plan, or invoke directly for a single feature PRD."
argument-hint: "[feature-name|ticket-url] [--bg] [--silent]"
disable-model-invocation: true
context: fork
model: claude-sonnet-4-6
---

Break down a feature from the product roadmap into a full PRD.

## Step 0: Parse arguments and determine invocation mode

Two invocation modes:

**From pm:plan (internal):**
- `PLAN_DIR` is passed in context
- Feature name and roadmap context are also passed
- PRD will be written to `{PLAN_DIR}/prds/{feature-slug}.md`

**Standalone:**
- Locate the most recently modified plan directory under `.codevoyant/pm/plans/`
- If no plan exists, derive a slug from the feature name and create `.codevoyant/pm/plans/{SLUG}/prds/`

Parse flags: `--bg` (background notification), `--silent` (suppress output).

## Step 1: Gather feature context

**If from pm:plan:**
Extract the feature's section from `{PLAN_DIR}/roadmap.md` as the context seed. Include the feature name, description, rationale, and any dependencies listed in the roadmap.

**If standalone:**
If a ticket URL was provided, fetch via the ticket-fetch pattern. Otherwise, ask the user to describe the feature.

## Step 2: Invoke pm:prd

Call `pm:prd` with the gathered feature context. Pass:
- The feature description and any ticket context
- `PLAN_DIR` so the PRD is written to the correct location
- `--no-preview` flag to suppress the interactive preview step (the breakdown caller handles review)

## Step 3: Report completion

Output: `PRD written to {PLAN_DIR}/prds/{feature-slug}.md`

## Step 4: Notify (standalone only)

If `--bg` and standalone, notify:

```bash
npx @codevoyant/agent-kit notify --title "pm:breakdown complete" --message "PRD written to {PLAN_DIR}/prds/{feature-slug}.md"
```
