# review

Review a spec plan for code completeness before running `/spec go`, then assess remaining quality issues. A plan cannot receive a ready verdict while any implementation task lacks complete, ready-to-write literal code (for lite plans, complete `**Contract:**` blocks).

## Variables

- `PLAN_NAME` — plan to review (auto-selected if not provided)
- `BG_MODE` — true if `--bg` present
- `SILENT` — true if `--silent` present

## Step 1: Select Plan

If `PLAN_NAME` not provided:

```bash
grep "| Active |" .codevoyant/README.md 2>/dev/null || echo "No active plans"
```

Sort by last updated; auto-select the most recently updated active plan. Report: "Reviewing plan: {plan-name}"

## Step 2: Locate and Read Plan Files

```
PLAN_DIR=".codevoyant/spec/{plan-name}"
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

## Step 3: Code-Completeness Gate (Pass 1 — CRITICAL)

Before launching scope, ordering, or codebase-alignment review agents, launch one code-completeness agent (`model-tier: light`, `run_in_background: true`) with the `SCOPE=code-completeness` prompt from `references/validation-prompt.md` and `{PLAN_DIR}` substituted, and — in the same message — one requirements agent with the `SCOPE=requirements` prompt. The code-completeness agent must read `references/code-completeness-blocklist.md` and inspect every implementation task for a complete literal `**Code:**` block; the requirements agent judges plan.md's Requirements section against R1–R7 (see `references/validation-prompt.md`).

**Lite plans skip the code-completeness gate.** A plan whose metadata carries `Lite: true` has no `**Code:**` blocks (tasks carry `**Contract:**` instead) — skip the code-completeness agent for lite plans and treat its result as PASS. The requirements, tabulation, scope, ordering, and codebase-alignment passes still run.

Wait for both reports. Add every `NEEDS_IMPROVEMENT` finding to the critical finding set. Classify a finding as `AUTO-FIX` only when the reviewer can determine and paste the complete literal code (code-completeness) or the domain-phrased requirement rewrite (requirements) from the repository and plan context; otherwise classify it as `ASK`. Do not allow later review findings, AUTO-FIX work, or a report verdict to mark the plan ready until both gates return `PASS` with no unresolved findings.

Launch the tabulation gate in the same message as the other two (`SCOPE=tabulation` prompt from `references/validation-prompt.md`). Treat its failures like code-completeness failures: `AUTO-FIX` when the reviewer can enumerate the missing rows from the codebase (re-run the table's Source command, add the rows, assign them to tasks, update plan.md `## Tables`), otherwise `ASK`. The plan is not ready while the tabulation gate has unresolved findings.

## Step 4: Parallel Review Agents (Pass 2 — CRITICAL)

Run four review agents in parallel (`model-tier: light`, `run_in_background: true`). Each marks every finding as CRITICAL.

**Agent A — Plan-level scope challenge:**
- Complexity challenge: is this more complex than needed? Could a simpler mechanism work?
- Reversibility: classify tasks as one-way doors (hard to undo) or two-way doors. Flag uncalled-out one-way doors.
- Hero systems: flag if plan reaches for new technology when existing utility would do.
- Structural issues: objective clarity, phase ordering, phase headers, meta-tasks, design decisions section.
- "What Already Exists" callout: codebase mechanisms this plan should leverage.
- Boundary audit (doc-aware plans — the plan.md carries a `Doc Globs:` line): for every task that writes outside its phase's declared globs or touches a module another phase owns, verify a `## Doc Scope` boundary callout exists with a justification and a rejected restructure. A crossing with no callout, or a callout with no justification, is CRITICAL (doc-aware.md Rule 7). Also flag crossings that a phase restructure could have avoided — move the task, split the phases, or sequence them.

**Agent B — Implementation completeness after the code gate:**
For each phase-N.md, flag as CRITICAL if:
- A task has no corresponding section in the implementation file
- A task has no concrete validation/verification step
- A task says "implement X" without specifying files, APIs, or acceptance criteria
- A phase file carries old-shape boilerplate (a Requirements process block, a Task Runner Commands section, or a Design section) or validation steps that name raw tool invocations instead of the task skill
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

## Step 4b: Pass 3 — INFORMATIONAL

Single agent (`model-tier: light`) reviews for quality and clarity issues that do not block execution: unclear task names, missing context in phase headers, phases that could be split, docs staleness. Tag all findings as INFORMATIONAL.

## Step 5: Fix-First Classification

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

After applying every code-completeness `AUTO-FIX`, rerun the code-completeness gate. If it does not return `PASS`, retain each finding as blocking and do not report the plan ready.

## Step 6: Produce Review Report

Write to `{PLAN_DIR}/review.md`:

```markdown
## Plan Review: N issues (X critical, Y informational) — {plan-name} — {date}

### Verdict
{Ready to execute | Needs minor fixes | Significant gaps — address before /spec go}

A `Ready to execute` verdict is allowed only when the code-completeness gate passed and no code-completeness findings remain unresolved.

### Scope Challenge
### Code-Completeness Gate
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

## Step 7: Display and Offer Next Steps

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
