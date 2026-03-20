---
description: "Use when writing a PRD for a single feature or initiative. Triggers on: \"write prd\", \"create prd\", \"product requirements\", \"requirements doc\", \"pm prd\", \"feature spec\". Produces PRD with problem statement, goals, requirements tables, acceptance criteria, and non-goals. Can seed from a ticket URL."
argument-hint: "[ticket-url|feature-description] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-opus-4-6
---

Generate a structured PRD for a single feature or initiative.

## Step 0: Parse arguments

Parse the user's input for:
- A URL (Linear, GitHub, Notion) — if detected, fetch via the ticket-fetch pattern (same as spec:new Step 0.8)
- A feature description string
- Flags: `--bg` (background notification on completion), `--silent` (suppress output)

Derive:
- `DATE_PREFIX = $(date +%y%m%d)` (YYMMDD format)
- `SCOPE` = slugified feature/initiative name (from ticket title or user input, lowercase, hyphens, no special chars)
- `OUTPUT_FILE = docs/prd/{DATE_PREFIX}-{SCOPE}-prd.md`

Create directory: `mkdir -p docs/prd/`

## Step 1: Load feature context

If a ticket URL was provided, use the fetched ticket content as the feature context.

Otherwise, ask the user:
> Describe the feature or problem this PRD addresses.

## Step 2: Clarify requirements (standalone only)

**Skip this step if called from pm:plan's inline PRD generation with sufficient context.**

Ask the user with AskUserQuestion:
> A few quick questions to shape the PRD:

Then ask as follow-ups:
1. "Who is the primary user?" (free-text answer)
2. "Engineering scope?" — options: `Small (days)` | `Medium (weeks)` | `Large (months)`
3. "Requirement confidence?" — options: `High` | `Medium (some unknowns)` | `Low (exploratory)`

## Step 3: Draft the PRD

Generate a PRD document using the structure from `references/prd-template.md`:

### Problem
What problem does this solve, for whom, and why now? (1-3 sentences)

### Goals
Measurable outcomes. Include baseline and target where known.

### Non-Goals
Explicit out-of-scope items with rationale — one line each.

### Users
Primary user persona in one sentence. Secondary personas if relevant.

### Requirements — Functional
Table with columns: #, Requirement, Priority (P0/P1/P2), Notes.

### Requirements — Non-Functional
Table with columns: #, Requirement, Target (measurable).

### Acceptance Criteria
Checklist of verifiable conditions.

### Open Questions
Table with columns: Question, Owner, Due.

### Dependencies
Upstream and downstream systems, teams, and external services.

## Step 4: Preview and confirm (standalone only)

**If called from pm:plan's inline PRD generation, skip this step and write directly.**

Show a one-paragraph summary of the PRD and ask with AskUserQuestion:
> Does this PRD capture the requirements?

Options:
- `Looks good — write it`
- `Adjust problem statement`
- `Adjust requirements`
- `Adjust non-goals`

If the user requests adjustments, revise the relevant section and re-present. Loop until "Looks good — write it".

## Step 5: Write the PRD

Write the PRD to `{OUTPUT_FILE}` using the structure from `references/prd-template.md`.

Report: `PRD written to {OUTPUT_FILE}`

## Step 5.5: Linear Attachment (standalone only)

Skip this step if called from pm:plan's inline PRD generation.

AskUserQuestion:
  question: "Attach PRD to Linear?"
  header: "Linear"
  multiSelect: false
  options:
    - label: "Yes — attach to a project"
      description: "Attach to an existing or new Linear project"
    - label: "Yes — attach to an initiative"
      description: "Attach to an existing Linear initiative"
    - label: "No — repo only"

If "Yes — attach to a project":
  1. `mcp__claude_ai_Linear__list_projects` — user selects or creates new
  2. If creating new: `mcp__claude_ai_Linear__save_project` — store PROJECT_ID
  3. `mcp__claude_ai_Linear__create_document`:
       title: "{DATE_PREFIX} {SCOPE} PRD"
       content: (full Markdown content of OUTPUT_FILE)
       projectId: PROJECT_ID

If "Yes — attach to an initiative":
  1. `mcp__claude_ai_Linear__list_initiatives` — user selects — store INITIATIVE_ID
  2. `mcp__claude_ai_Linear__create_document`:
       title: "{DATE_PREFIX} {SCOPE} PRD"
       content: (full Markdown content of OUTPUT_FILE)
       initiativeId: INITIATIVE_ID

If "No — repo only": skip. Report: "PRD saved to {OUTPUT_FILE}."

## Step 6: Notify

If `--bg`, notify:

```bash
npx @codevoyant/agent-kit notify --title "pm:prd complete" --message "PRD written to {OUTPUT_FILE}"
```
