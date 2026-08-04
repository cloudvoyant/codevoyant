# Validation Loop

> **Autonomy constraint:** All rounds run autonomously — do not prompt the user at any point during this loop.

> **Terminal outcome constraint:** A validation finding is not a completion state. Apply every deterministic repair before the next round. If one remaining blocker needs a user decision, return exactly `NEEDS_INPUT: {one concrete question}` to the caller; the caller must preserve completed safe edits and must not report the plan ready or update complete.

Run a minimum of 2 validation rounds autonomously (no user prompts). After each round that surfaces issues, apply all fixes before running the next round.

Within each round, launch one validation agent **per phase**, one plan-level agent, and one **code-completeness** agent — all in parallel. Merge results before applying fixes.

## Per-Round Execution

### a. Notify user

`🔍 Validation round {round} running ({N} agents in parallel)...`

### b. Launch parallel validation agents

**Plan-level agent** (`subagent_type: general-purpose`, `model: claude-haiku-4-5-20251001`, `run_in_background: true`):

```
prompt: [contents of references/validation-prompt.md with SCOPE=plan-level]
```

Validate:
- plan.md metadata (Task Runners field present, branch/worktree filled)
- user-guide.md exists and has non-TODO overview
- Phase names and task counts consistent across plan.md and implementation files
- Inter-phase dependencies identified
- A final validation phase exists

**Per-phase agents** — for each phase N from 1 to total phases, launch one agent (`subagent_type: general-purpose`, `model: claude-haiku-4-5-20251001`, `run_in_background: true`):

```
prompt: [contents of references/validation-prompt.md with SCOPE=phase, PHASE_N={N}]
```

Validate only `implementation/phase-{N}.md` against the plan.md tasks for that phase:
- Task specificity and actionability
- Implementation completeness (file paths, code examples, no ambiguity)
- Task runner commands listed and used (not raw npm/pytest/go test)
- fmt/lint/typecheck/test validation block present
- Test coverage and success criteria
- user-guide.md update instructions per task

**Code-completeness agent** — launch one agent (`subagent_type: general-purpose`, `model: claude-haiku-4-5-20251001`, `run_in_background: true`):

```
prompt: [contents of references/validation-prompt.md with SCOPE=code-completeness]
```

It scans every `implementation/phase-*.md` and fails any task whose code block is missing, empty, elided (`...`), a stub, a TODO/placeholder, or a prose-only description instead of the literal code. This is the gate that stops planners from shipping partial snippets.

Store all Task IDs: `[PLAN_LEVEL_TASK_ID, CODE_COMPLETENESS_TASK_ID, PHASE_1_TASK_ID, PHASE_2_TASK_ID, ...]`

### c. Collect results

Wait for all agents: `TaskOutput(id: X, block: true)` for each Task ID.

Parse each result — extract `### Status:`, issues, recommendations, missing details. Store the code-completeness agent's result as `VALIDATION_CODE_COMPLETENESS_STATUS`.

Merge into a single issue list tagged by source (`[plan-level]`, `[phase-1]`, `[phase-2]`, etc.).

Overall round status = `PASS` only if **all** agents return `PASS`. Any `NEEDS_IMPROVEMENT` = round is `NEEDS_IMPROVEMENT`.

### d. If `NEEDS_IMPROVEMENT`, auto-fix before next round

Work through every issue and recommendation from all agents:
- Edit the relevant `implementation/phase-N.md` files directly
- Rewrite vague plan.md tasks to be specific and actionable
- **For every code-completeness failure, replace the placeholder/stub with the complete literal code** — resolve the unknown now (read the codebase, search the web) and paste the real lines; never carry a `...`/`TODO`/prose stub into the next round
- Reconcile two-file inconsistencies from the plan, implementation files, and repository facts before asking a user to choose between alternatives
- Report: `🔧 Round {round} — fixed {N} issues across {M} files: [brief summary]`

### e. Loop control

- If `PASS` and round ≥ 2: break the loop
- Cap at 3 rounds only after the code-completeness agent returns `PASS`. After round 3, do not present general quality findings as remaining issues; repair deterministic findings, then return `PASS` or the required `NEEDS_INPUT:` escalation.
- If the code-completeness agent still returns `NEEDS_IMPROVEMENT` in round 3, repair and recheck every deterministic issue. If an unresolved issue needs a user decision, return the single `NEEDS_INPUT:` escalation naming its phase, task, and required implementation choice. Do not return `NEEDS_IMPROVEMENT` as a caller-visible terminal state or report the plan ready.
- If any unresolved blocker requires a user decision after deterministic repairs, return one `NEEDS_INPUT:` line that names the affected file or task and asks the concrete decision. Do not return a generic refusal, a bare issue list, or a success summary with unresolved blockers.

After the final round, return `VALIDATION_CODE_COMPLETENESS_STATUS=PASS` only when the final code-completeness agent result is `PASS`.

## Final Summary

```
✅ Plan validation complete ({N} rounds)
   Round 1: [PASS|NEEDS_IMPROVEMENT — X issues fixed across Y phases]
   Round 2: [PASS|NEEDS_IMPROVEMENT — X issues fixed across Y phases]
   Code completeness: [PASS | NEEDS_IMPROVEMENT]
   Final status: PASS
```
