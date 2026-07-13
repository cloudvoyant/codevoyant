# Validation Agent Prompt

> **Variables:** `{PLAN_DIR}` and `{N}` are substituted by the calling skill (Step 5.6 of `new/SKILL.md`) before these prompts are injected into agents.

Three prompt variants — one per agent type launched in Step 5.6.

---

## Plan-Level Agent Prompt (`SCOPE=plan-level`)

```
You are validating a software development plan for autonomous execution quality. Focus on plan-wide concerns only.

Read these files:
1. {PLAN_DIR}/plan.md
2. {PLAN_DIR}/user-guide.md (if it exists)
3. All files in {PLAN_DIR}/implementation/ (headers only — check file exists and phase names match plan.md)

Validate the following quality criteria:

**Metadata**
- Does plan.md have a "Task Runners" field with actual commands?
- Are branch/worktree fields filled (or "(none)" explicitly)?

**User Guide**
- Does user-guide.md exist?
- Does the overview section have real content (not all TODO)?

**Consistency**
- Do phase names and task counts in plan.md match what implementation files cover?
- Is there a final validation phase (e.g., "Phase N - Testing" or "Phase N - Validation")?
- Are inter-phase dependencies called out?

**Dependencies & Risks**
- Are external package/library dependencies noted?
- Are potential failure points or edge cases addressed?

Respond ONLY in this exact format:

## Validation Report

### Status: [PASS | NEEDS_IMPROVEMENT]

### Issues
[plan-level] Description of specific issue
(write "none" if no issues)

### Recommendations
- Specific actionable improvement with the exact file and section to change
(write "none" if no recommendations)

### Missing Details
- What is absent that would block autonomous execution
(write "none" if nothing is missing)
```

---

## Per-Phase Agent Prompt (`SCOPE=phase`, `PHASE_N={N}`)

```
You are validating a software development plan for autonomous execution quality. Focus only on Phase {N}.

Read these files:
1. {PLAN_DIR}/plan.md — extract only the task list for Phase {N}
2. {PLAN_DIR}/implementation/phase-{N}.md — full content
3. {PLAN_DIR}/user-guide.md — check if phase tasks reference user-guide updates

Validate the following quality criteria for Phase {N} only:

**Task Quality**
- Are all tasks specific and actionable (not vague phrases like "implement X", "update Y")?
- Does each task have an implied or explicit success criterion?
- Are tasks appropriately scoped (not so large they require sub-planning)?

**Implementation Completeness**
- Does phase-{N}.md have concrete, step-by-step implementation instructions?
- Are file paths specific and unambiguous (not "relevant files" or "appropriate location")?
- Are code examples present for non-trivial logic?
- Is there enough detail for an autonomous agent to execute without asking clarifying questions?

**Task Runner Usage**
- Does phase-{N}.md list applicable task runner commands in a "Task Runner Commands" section covering build/test/lint/format/typecheck?
- Are all build/test/lint/format/typecheck/run commands using the project's task runners (not raw `npm test`, `python -m pytest`, `go test ./...` when a task runner wraps them)?
- Does every task's validation checklist include lint, format, and typecheck steps — not just tests?
- Is there a "Phase Validation" block at the end with all five checks (fmt, lint, typecheck, test, build)?
- Is there a note that lint/format/typecheck must run after every task, not only at phase end?

**User Guide**
- Does each task in phase-{N}.md specify what to update in user-guide.md once complete?

**Consistency**
- Does phase-{N}.md cover all tasks listed in plan.md for Phase {N}?
- Are task descriptions consistent between plan.md and phase-{N}.md?

**Test Coverage**
- Does each task specify what tests to write or run using the task runner?
- Are acceptance/success criteria testable?

Respond ONLY in this exact format:

## Validation Report

### Status: [PASS | NEEDS_IMPROVEMENT]

### Issues
[phase-{N}, task-X] Description of specific issue
(write "none" if no issues)

### Recommendations
- Specific actionable improvement with the exact file and section to change
(write "none" if no recommendations)

### Missing Details
- What is absent from phase-{N}.md that would block autonomous execution
(write "none" if nothing is missing)
```

---

## Code-Completeness Agent Prompt (`SCOPE=code-completeness`)

```
You are validating that a software development plan contains COMPLETE, ready-to-write code for every implementation task. Spec planners often stub, summarize, or leave placeholders — your entire job is to catch that.

Read every file matching:
{PLAN_DIR}/implementation/phase-*.md

For each task in each phase file, find its code block (the `**Code:**` / `**Code (required...)**` block, or any fenced code block that represents what the task produces).

The canonical list of placeholder/stub markers that make a code block incomplete lives in `references/code-completeness-blocklist.md` — read it before validating. It also tells you to judge **intent, not blind substring matching**: only fail a block when a marker stands in for code the author declined to write; do not fail complete, working code that legitimately contains one of these substrings (e.g. a `...` spread operator or an `e.g.` inside a real string/comment). Fail the task if its code block:
- Is missing or empty where the task clearly writes or edits a file.
- Contains a placeholder or elision from the blocklist (used as a stand-in for missing code, not as a legitimate token).
- Shows only a signature, a comment, or a heading where a real body belongs.
- Describes the code in prose instead of showing the literal lines.
- For an edit, does not show the exact old→new lines or a unified diff (a vague "change X to Y" is a fail).

A task passes only if every line the execution agent will write appears verbatim in its code block. New files show full contents; edits show exact old→new lines or a unified diff.

Respond ONLY in this exact format:

## Validation Report

### Status: [PASS | NEEDS_IMPROVEMENT]

### Issues
[code-completeness, phase-N, task-X] Description of the incomplete/placeholder code block and what is missing
(write "none" if every task's code is complete)

### Recommendations
- The exact phase file, task, and what concrete code must replace the placeholder
(write "none" if no recommendations)

### Missing Details
- Any task whose real code cannot be determined from the plan (the planner must resolve it now)
(write "none" if nothing is missing)
```
