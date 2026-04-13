# review

Review a spec plan for quality issues before running `/spec go`. Checks for ambiguous tasks, unrealistic phase ordering, missing validation, dependency gaps, and codebase misalignment.

## Variables

- `PLAN_NAME` — plan to review (auto-selected if not provided)
- `BG_MODE` — true if `--bg` present
- `SILENT` — true if `--silent` present

## Step 1: Select Plan

If `PLAN_NAME` not provided:

```bash
npx @codevoyant/agent-kit plans migrate
npx @codevoyant/agent-kit plans list --status Active
```

Sort by last updated; auto-select the most recently updated active plan. Report: "Reviewing plan: {plan-name}"

## Step 2: Locate and Read Plan Files

```
PLAN_DIR=".codevoyant/plans/{plan-name}"
```

1. Read `{PLAN_DIR}/plan.md`
2. List all `{PLAN_DIR}/implementation/phase-*.md` files. Count phases.
3. Read each implementation file.

If no implementation files found, warn and stop:
```
No implementation files found — run /spec new to generate them before reviewing.
```

Additional checks:
- If plan.md references a `TODOS.md` file, read it and flag any deferred work not covered by a phase file as CRITICAL
- If any implementation file mentions modifying a `docs/` file, check whether that phase also updates the doc entry; if not, flag as INFORMATIONAL

## Step 3: Parallel Review Agents (Pass 1 — CRITICAL)

Run four review agents in parallel (`model: claude-haiku-4-5-20251001`, `run_in_background: true`). Each marks every finding as CRITICAL.

**Agent A — Plan-level scope challenge:**
- Complexity challenge: is this more complex than needed? Could a simpler mechanism work?
- Reversibility: classify tasks as one-way doors (hard to undo) or two-way doors. Flag uncalled-out one-way doors.
- Hero systems: flag if plan reaches for new technology when existing utility would do.
- Structural issues: objective clarity, phase ordering, phase headers, meta-tasks, design decisions section.
- "What Already Exists" callout: codebase mechanisms this plan should leverage.

**Agent B — Implementation completeness:**
For each phase-N.md, flag as CRITICAL if:
- A task has no corresponding section in the implementation file
- A task has no concrete validation/verification step
- A task says "implement X" without specifying files, APIs, or acceptance criteria
- Task runner commands are missing or vague
- A task modifies a `docs/` file without updating the doc entry

Tag each finding as `AUTO-FIX` (mechanical fix) or `ASK` (judgment call required).

**Agent C — Ordering and dependencies:**
Flag as CRITICAL if:
- Phase N uses artifacts only produced in Phase N+1 or later
- Tasks sharing state or writing the same files are marked parallelizable
- The final phase does not include an end-to-end validation step

Classify affected tasks as one-way or two-way doors.

**Agent D — Codebase alignment:**
- Do file paths in implementation files actually exist (for files being modified, not created)?
- Do referenced patterns, APIs, or libraries match what's in the repo?
- Are there existing tests covering the areas being changed?

Wait for all four agents to complete.

## Step 3b: Pass 2 — INFORMATIONAL

Single agent (`model: claude-haiku-4-5-20251001`) reviews for quality and clarity issues that do not block execution: unclear task names, missing context in phase headers, phases that could be split, docs staleness. Tag all findings as INFORMATIONAL.

## Step 4: Fix-First Classification

Collect all findings. For each:

1. Classify as `AUTO-FIX` or `ASK`
2. Execute all `AUTO-FIX` items immediately. Log each: `[AUTO-FIXED] {description}`
3. For each `ASK` item, issue a **separate** AskUserQuestion (never batched):
   ```
   (1) Re-ground: Project = {project}, Plan = {plan-name}. {1-2 sentence context}
   (2) Simplify: {explain the problem plainly}
   (3) Recommend: Preferred fix = {option}. Reason: {one sentence}. Completeness: {X}/10
   Options:
     (A) {description} — Human time: ~{T}  |  CC time: ~{T}
     (B) {description} — Human time: ~{T}  |  CC time: ~{T}
     (C) Skip / defer
   ```
   Wait for answer before moving to the next `ASK` item.

## Step 5: Produce Review Report

Write to `{PLAN_DIR}/review.md`:

```markdown
## Plan Review: N issues (X critical, Y informational) — {plan-name} — {date}

### Verdict
{Ready to execute | Needs minor fixes | Significant gaps — address before /spec go}

### Scope Challenge
### One-Way Doors
### What Already Exists
### AUTO-FIXED
### Blocking (fix before running /spec go)
### Informational (quality / clarity)
### Looks Good
### Review Readiness Dashboard
| Section | Status | Verdict |
...
### Checklist
- [ ] All blocking issues resolved
- [ ] ASK items answered and applied
- [ ] Run /spec go when ready
```

## Step 6: Display and Offer Next Steps

Display the review report inline.

Only if verdict = "Ready to execute" and zero unresolved blocking issues, offer:

```
question: "Plan looks good. Run it?"
options:
  - label: "Yes — run /spec go now"
  - label: "Yes — run /spec go --bg"
  - label: "No — I'll address issues first"
```

If "run now" or "--bg", invoke the appropriate go flow.
