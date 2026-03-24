# Validation Agent Prompt

> **Variables:** `{PLAN_DIR}` and `{N}` are substituted by the calling skill (Step 5.6 of `new/SKILL.md`) before these prompts are injected into agents.

Two prompt variants — one per agent type launched in Step 5.6.

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
