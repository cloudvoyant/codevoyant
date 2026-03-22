---
description: 'Use when reviewing a spec plan before execution. Triggers on: "spec review", "review plan", "check plan", "plan review", "audit plan", "is this plan ready". Checks for ambiguous tasks, missing validation, unrealistic ordering, dependency gaps, and plan-vs-implementation mismatches.'
name: spec:review
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline. Core functionality preserved on all platforms.'
argument-hint: '[plan-name] [--bg] [--silent]'
context: fork
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially. The `context: fork` and `agent:` frontmatter fields are Claude Code-specific — on OpenCode and VS Code Copilot they are ignored and the skill runs inline using the current model.

Review a spec plan for quality issues before running `/spec:go`.

## Overview

This skill reads a plan's files and checks for: ambiguous tasks, unrealistic phase ordering, missing validation steps, dependency gaps, and mismatches between plan.md and implementation files. It produces a structured review report and optionally auto-fixes mechanical issues.

## Step 0: Parse Args

Extract plan name from the argument (e.g., `/spec:review my-plan`).

If no plan name provided, auto-select the most recently updated active plan:

1. Get active plans from registry:
   ```bash
   npx @codevoyant/agent-kit plans migrate
   npx @codevoyant/agent-kit plans list --status Active
   ```
2. Sort by last updated (most recent first)
3. Auto-select the first one
4. Report: "Reviewing plan: {plan-name}"

Extract flags:

```
BG_MODE  = true if --bg present
SILENT   = true if --silent present
```

## Step 1: Locate and Read Plan Files

```
PLAN_DIR=".codevoyant/plans/{plan-name}"
```

1. Read `{PLAN_DIR}/plan.md` — store full contents for review agents.
2. List all `{PLAN_DIR}/implementation/phase-*.md` files. Count phases.
3. Read each implementation file — store full contents for review agents.

**If no implementation files found**, warn and stop:

```
No implementation files found — run /spec:new to generate them before reviewing.
```

**Additional checks:**

- If `plan.md` references a `TODOS.md` file, read `{PLAN_DIR}/TODOS.md` and note any deferred work that is NOT covered by a phase file. Flag each as a CRITICAL issue.
- If any implementation file mentions modifying a file that lives under `docs/`, check whether the corresponding `docs/` entry was updated in that same phase file. If not, flag as INFORMATIONAL (docs staleness).

## Step 2 — Pass 1 (CRITICAL): Parallel Review Agents

Run four review agents in parallel using Task agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`). Each agent focuses only on findings that would **block safe autonomous execution**. Mark every finding as CRITICAL.

Provide each agent with the full contents of `plan.md` and all `implementation/phase-N.md` files.

### Agent A — Plan-level scope challenge (CRITICAL pass)

First, apply a scope challenge before any other review:

- Does this plan introduce more complexity than needed? Could a simpler existing mechanism achieve the same outcome? (Boring by Default)
- Are the changes reversible? For each phase, classify tasks as one-way doors (hard to undo: schema migrations, published APIs, deleted files) or two-way doors (safe to reverse). Flag any one-way door that is not called out explicitly in plan.md. (Reversibility Preference)
- Does the plan reach for new technology, new abstractions, or a new "hero" system when an existing utility would do? Flag if yes.

Then review `plan.md` for CRITICAL structural issues:

- Objective is clear and bounded (not "improve everything")
- Phases have logical ordering and phase dependencies are explicitly called out
- Each phase header is descriptive (not just "Phase N")
- No tasks that sound like meta-tasks ("review codebase" without specifics)
- Design decisions section is present and filled (not a blank placeholder)

Include a "What Already Exists" callout: list any codebase mechanisms, utilities, or patterns this plan should leverage but does not appear to reference.

### Agent B — Implementation completeness (CRITICAL pass)

For each `phase-N.md`, flag as CRITICAL if:

- A task in plan.md has no corresponding section in the implementation file
- A task has no concrete validation/verification step
- A task says "implement X" without specifying files, APIs, or acceptance criteria
- Task runner commands are missing or vague ("run tests" without a `just` recipe)
- A task modifies a file that is documented in `docs/` but the phase does not update that doc entry

For each CRITICAL finding, also tag it as either:

- `AUTO-FIX` — the fix is mechanical (e.g., add a missing validation step, fill a blank section, add a `just test` line). State the exact fix.
- `ASK` — the fix requires a judgment call (e.g., which API to use, whether a task is in scope). Do NOT attempt to answer yet; just tag it.

### Agent C — Ordering and dependencies (CRITICAL pass)

Across all phases, flag as CRITICAL if:

- Phase N uses artifacts that are only produced in Phase N+1 or later
- Tasks that share state or write to the same files are marked as parallelizable
- The final phase does not include `just test` or an equivalent end-to-end validation

For each dependency issue, classify the affected task as a one-way door or two-way door. One-way doors with dependency problems are highest severity.

### Agent D — Codebase alignment (CRITICAL pass)

- Do the file paths in implementation files actually exist (for files being modified, not created)?
- Do referenced patterns, APIs, or libraries match what is in the repo?
- Are there existing tests covering the areas being changed? Flag if none exist.

Wait for all four agents to complete (TaskOutput `block: true`).

## Step 2b — Pass 2 (INFORMATIONAL)

In a single agent (`model: claude-haiku-4-5-20251001`), review the same files for quality and clarity issues that do not block execution. Examples: unclear task names, missing context in a phase header, a phase that could be split for clarity, docs staleness flagged in Step 1. Tag all findings as INFORMATIONAL.

## Step 3: Fix-First Classification

Collect all findings from both passes. For each finding:

1. Classify as `AUTO-FIX` or `ASK` (Agents A/B/C/D may have pre-tagged; confirm or assign for any untagged findings from Pass 2).

2. Execute all `AUTO-FIX` items immediately: make the mechanical correction in the plan files (add the missing validation step, fill the blank section, insert `just test`, etc.). Log each fix with: `[AUTO-FIXED] {description}`.

3. For each `ASK` item, issue a **separate** AskUserQuestion in this mandatory format — **one question per issue, never batched**:

```
AskUserQuestion:
  (1) Re-ground: Project = claudevoyant, Plan = {plan-name}. {1-2 sentence description of what this plan is trying to do and where in the plan this issue appears.}
  (2) Simplify: {Explain the problem to a smart 16-year-old with no jargon. What goes wrong if we ignore this?}
  (3) Recommend: Preferred fix = {option letter}. Reason: {one sentence}. Completeness: {X}/10 with this fix.
  Options:
    (A) {description} — Human time: ~{T}  |  CC time: ~{T}
    (B) {description} — Human time: ~{T}  |  CC time: ~{T}
    (C) Skip / defer — Human time: 0  |  CC time: 0
```

Wait for the user's answer before moving to the next `ASK` item.

## Step 4: Produce Review Report

Write a structured review report to `{PLAN_DIR}/review.md`:

```markdown
## Plan Review: N issues (X critical, Y informational) — {plan-name} — {date}

### Verdict

{Ready to execute | Needs minor fixes | Significant gaps — address before /spec:go}

### Scope Challenge

{Summary of scope challenge findings from Agent A — or "No concerns" if clean.}

### One-Way Doors

{List of irreversible tasks identified across all phases, with phase reference.}

### What Already Exists

{Callout from Agent A: codebase mechanisms this plan should leverage.}

### AUTO-FIXED

- [Phase N, Task M]: {description of what was corrected}

### Blocking (fix before running /spec:go)

- [Phase N, Task M]: {issue} — {why it matters for autonomous execution}

### Informational (quality / clarity)

- [Phase N]: {issue} — {suggested fix}

### Looks Good

- {Specific positive callouts anchored to plan content}

### Review Readiness Dashboard

| Section                     | Status   | Verdict            |
| --------------------------- | -------- | ------------------ |
| Objective clarity           | {status} | {one-line verdict} |
| Phase ordering              | {status} | {one-line verdict} |
| Implementation completeness | {status} | {one-line verdict} |
| Validation steps            | {status} | {one-line verdict} |
| Codebase alignment          | {status} | {one-line verdict} |
| Scope / reversibility       | {status} | {one-line verdict} |
| Deferred work (TODOS)       | {status} | {one-line verdict} |
| Docs staleness              | {status} | {one-line verdict} |

### Checklist

- [ ] All blocking issues resolved
- [ ] ASK items answered and applied
- [ ] Concerns acknowledged or addressed
- [ ] Run /spec:go when ready
```

## Step 5: Display Review and Offer Next Steps

Display the review report inline.

Only if the Review Readiness Dashboard shows no failures and there are zero unresolved blocking issues (verdict = "Ready to execute"), offer:

```
question: "Plan looks good. Run it?"
options:
  - label: "Yes — run /spec:go now"
  - label: "Yes — run /spec:go --bg"
  - label: "No — I'll address issues first"
```

If "run /spec:go now" or "--bg", invoke the appropriate spec:go flow.

If verdict is anything other than "Ready to execute", display the report and dashboard, then exit without offering to run.

## Step 6: Notification

If `--bg` or `--silent` not set, no notification (review is fast and inline). If `--silent` is set and `--bg` was used, suppress output entirely.
