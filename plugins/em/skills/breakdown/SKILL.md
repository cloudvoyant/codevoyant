---
description: "Use when breaking down an epic into detailed sub-tasks. Triggers on: \"em breakdown\", \"break down epic\", \"task breakdown\", \"estimate epic\", \"decompose feature\", \"what are the tasks for\". Produces sub-tasks with estimates, acceptance criteria, dependencies, and T-shirt sizing."
argument-hint: "[ticket-url|epic-description] [--bg] [--silent]"
disable-model-invocation: true
context: fork
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Produce a detailed task breakdown for an epic with sub-tasks, estimates, acceptance criteria, and T-shirt sizing.

## Step 0: Parse Args and Invocation Mode

Extract flags:
```
BG_MODE  = true if --bg present
SILENT   = true if --silent present
```

Two invocation modes:

**Standalone** (`/em:breakdown my-epic`): Derive `SLUG` from the argument (ticket ID or slugified name). Locate most recently active plan dir: check `.codevoyant/em/plans/*/roadmap.md` sorted by mtime; if found, use `PLAN_DIR` from it. If none found, create a standalone plan dir: `PLAN_DIR=".codevoyant/em/plans/{SLUG}"` with `breakdowns/` subdir.

**From em:plan** (called internally): `PLAN_DIR` is passed in the prompt context. `SLUG` is the epic slug. Write output to `{PLAN_DIR}/breakdowns/{SLUG}.md`.

If a URL is detected in the argument, fetch via the ticket-fetch pattern:
- **Linear**: `mcp__claude_ai_Linear__get_issue` with the issue ID
- **GitHub**: `gh issue view {number} --json title,body,labels,milestone,assignees`

Save fetched content to `{PLAN_DIR}/research/{SLUG}.md`.

### Work-Style Detection

Check for cached team configuration:
```bash
CONFIG_FILE=".codevoyant/em/team-config.json"
if [ -f "$CONFIG_FILE" ]; then
  WORK_STYLE=$(jq -r '.workStyle' "$CONFIG_FILE")  # "epic-based" | "project-based"
  TRACKER=$(jq -r '.tracker' "$CONFIG_FILE")        # "linear" | "github" | "notion" | "none"
  TRACKER_IDIOMS=$(jq -r '.idioms' "$CONFIG_FILE")  # free-form notes on team conventions
fi
```

If no config file exists, ask once and persist:

```
AskUserQuestion:
  question: "How does your team structure work?"
  multiSelect: false
  options:
    - label: "Epic-based (Linear, Jira)"
      description: "Work lives in Epics with child issues; planning = filling epics"
    - label: "Project-based (Linear Projects, Notion)"
      description: "Work lives in Projects with milestones; epics are optional groupings"
    - label: "Milestone-based (GitHub)"
      description: "Issues live in milestones; no formal epic concept"
    - label: "We use a custom system — I'll describe it"
```

Follow up: "Which tracker?" -> Linear / GitHub / Notion / GitLab / None (local only)

If Linear: ask "Do you use Cycles?" and "How do you model epics — as Issues with children, or as Projects?"

Write responses to `.codevoyant/em/team-config.json` (create `.codevoyant/em/` dir if needed):
```json
{
  "workStyle": "{epic-based|project-based|milestone-based|custom}",
  "tracker": "{linear|github|notion|gitlab|none}",
  "idioms": "{free-form notes on team conventions}"
}
```

Use `WORK_STYLE` and `TRACKER_IDIOMS` to shape task structure and naming conventions in the breakdown.

## Step 1: Gather Epic Description

If no context was provided (no ticket URL and no prompt context from em:plan), ask:

```
AskUserQuestion:
  question: "Describe the epic or paste the ticket URL."
  multiSelect: false
  textInput: true
```

## Step 2: Codebase Scan

Launch a Task agent (`model: claude-haiku-4-5-20251001`, `run_in_background: true`) to scan the codebase for:
- Existing code and systems affected by this epic
- Current patterns in those areas (naming conventions, architecture style)
- Test coverage in affected files

Save findings to a context variable for use in Step 4.

## Step 3: Detail Level

Use AskUserQuestion:

```
question: "How much detail do you need?"
options:
  - label: "Full breakdown — sub-tasks with estimates + AC"
    description: "Every task, who does what, acceptance criteria"
  - label: "Skeleton — task list only"
    description: "Fast: just the task names and T-shirt sizes"
  - label: "Spike first"
    description: "There's too much unknown — produce a spike task instead"
```

## Step 4: Produce Structured Breakdown

Based on the detail level selected, produce the breakdown:

### Epic Summary

One paragraph: what it is, why it matters, and what success looks like.

### T-shirt Sizing

| Component | XS (<1d) | S (1-3d) | M (3-10d) | L (2-4w) | XL (1m+) |
|---|---|---|---|---|---|
| [Component 1] | | | X | | |
| [Component 2] | | X | | | |
| **Total** | | | **M** | | |

### Sub-tasks

Numbered, ordered by dependency:

```
1. [Task name] — S
   Acceptance criteria: ...
   Depends on: (none | task N)
   Notes: ...

2. [Task name] — M
   Acceptance criteria: ...
   Depends on: task 1
   Notes: ...
```

### Technical Risks

Specific unknowns that could change the estimate. Each risk should name:
- What the risk is
- How it could affect the estimate (direction and magnitude)
- What would resolve it (spike, prototype, conversation with another team)

### Definition of Done

Explicit criteria for the whole epic to be considered complete:
- All sub-tasks done
- Tests passing (unit + integration)
- Documentation updated
- Deployed to staging / production
- Any additional criteria specific to this epic

## Step 5: Confirmation (Standalone Only)

If invoked **standalone** (not from em:plan), show summary and ask:

```
AskUserQuestion:
  question: "Does this breakdown look right?"
  options:
    - label: "Yes, save it"
    - label: "Some tasks are missing"
    - label: "Estimates seem off"
```

Iterate until "Yes, save it" is selected.

If invoked **from em:plan** (no interactive context), skip this step and write directly.

## Step 6: Write Breakdown

Write `{PLAN_DIR}/breakdowns/{SLUG}.md` with the full structured breakdown.

If `BG_MODE=true` and invoked standalone, send a desktop notification:

```bash
npx @codevoyant/agent-kit notify --title "em:breakdown complete" --message "Breakdown for {SLUG} written to {PLAN_DIR}/breakdowns/{SLUG}.md"
```
