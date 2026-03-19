---
description: Generate a structured PRD (Product Requirements Document) for a single feature or initiative. Produces a PRD.md with problem statement, goals, user stories, success metrics, and explicit out-of-scope items. Can be seeded from a Linear/GitHub/Notion ticket URL. Triggers on: write prd, create prd, product requirements, requirements doc, spec out feature, pm prd, feature spec.
argument-hint: "[ticket-url|feature-description] [--bg] [--silent]"
disable-model-invocation: true
context: fork
model: claude-opus-4-6
---

Generate a structured PRD for a single feature or initiative.

## Step 0: Parse arguments

Parse the user's input for:
- A URL (Linear, GitHub, Notion) — if detected, fetch via the ticket-fetch pattern (same as spec:new Step 0.8)
- A feature description string
- Flags: `--bg` (background notification on completion), `--silent` (suppress output)

Derive `SLUG`: use ticket ID (e.g. `ENG-42`) or slugify the feature name (lowercase, hyphens, no special chars).

Determine `PLAN_DIR`:
- If called from `pm:breakdown`, `PLAN_DIR` is passed in context — use it directly.
- If standalone, locate the most recently modified plan under `.codevoyant/pm/plans/`. If none exists, create `.codevoyant/pm/plans/{SLUG}/prds/`.

## Step 1: Load feature context

If a ticket URL was provided, use the fetched ticket content as the feature context.

Otherwise, ask the user:
> Describe the feature or problem this PRD addresses.

## Step 2: Clarify requirements (standalone only)

**Skip this step if called from pm:breakdown with sufficient context.**

Ask the user with AskUserQuestion:
> A few quick questions to shape the PRD:

Then ask as follow-ups:
1. "Who is the primary user?" (free-text answer)
2. "Engineering scope?" — options: `Small (days)` | `Medium (weeks)` | `Large (months)`
3. "Requirement confidence?" — options: `High` | `Medium (some unknowns)` | `Low (exploratory)`

## Step 3: Draft the PRD

Generate a PRD document with these sections:

### Problem Statement
What problem does this solve, for whom, and why now?

### Goals & Success Metrics
Measurable outcomes in OKR-style format. Include 2-4 metrics with baselines and targets where possible.

### User Stories
Formatted as: `As a [persona], I want [action] so that [outcome]`
Prioritized as P0 (must-have), P1 (should-have), P2 (nice-to-have).

### Functional Requirements
Numbered list of what the system must do.

### Non-functional Requirements
Performance, security, scale, and accessibility considerations.

### Out of Scope
Explicit deferrals with rationale for why each item is not included in this iteration.

### Open Questions
Unknowns that need resolution before or during implementation.

### Dependencies
Upstream and downstream systems, teams, and external services.

## Step 4: Preview and confirm (standalone only)

**If called from pm:breakdown, skip this step and write directly.**

Show a one-paragraph summary of the PRD and ask with AskUserQuestion:
> Does this PRD capture the requirements?

Options:
- `Looks good — write it`
- `Adjust problem statement`
- `Adjust user stories`
- `Adjust out of scope`

If the user requests adjustments, revise the relevant section and re-present. Loop until "Looks good — write it".

## Step 5: Write the PRD

Write the PRD to `{PLAN_DIR}/prds/{SLUG}.md`.

If `--bg` and standalone, notify:

```
for _c in "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/pm/scripts/notify.sh" "$HOME/.claude/plugins/pm/scripts/notify.sh"; do [ -f "$_c" ] && bash "$_c" "pm:prd complete" "PRD written to {PLAN_DIR}/prds/{SLUG}.md" && break; done
```

Report: `PRD written to {PLAN_DIR}/prds/{SLUG}.md`
