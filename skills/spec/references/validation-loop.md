# Validation Loop

> **Autonomy constraint:** All rounds run autonomously — do not prompt the user at any point during this loop.

Run a minimum of 2 validation rounds autonomously (no user prompts). After each round that surfaces issues, apply all fixes before running the next round.

Within each round, launch one validation agent **per phase** plus one plan-level agent — all in parallel. Merge results before applying fixes.

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

Store all Task IDs: `[PLAN_LEVEL_TASK_ID, PHASE_1_TASK_ID, PHASE_2_TASK_ID, ...]`

### c. Collect results

Wait for all agents: `TaskOutput(id: X, block: true)` for each Task ID.

Parse each result — extract `### Status:`, issues, recommendations, missing details.

Merge into a single issue list tagged by source (`[plan-level]`, `[phase-1]`, `[phase-2]`, etc.).

Overall round status = `PASS` only if **all** agents return `PASS`. Any `NEEDS_IMPROVEMENT` = round is `NEEDS_IMPROVEMENT`.

### d. If `NEEDS_IMPROVEMENT`, auto-fix before next round

Work through every issue and recommendation from all agents:
- Edit the relevant `implementation/phase-N.md` files directly
- Rewrite vague plan.md tasks to be specific and actionable
- Report: `🔧 Round {round} — fixed {N} issues across {M} files: [brief summary]`

### e. Loop control

- If `PASS` and round ≥ 2: break the loop
- Cap at 3 rounds. After round 3, proceed regardless and note remaining issues in the final summary.

## Final Summary

```
✅ Plan validation complete ({N} rounds)
   Round 1: [PASS|NEEDS_IMPROVEMENT — X issues fixed across Y phases]
   Round 2: [PASS|NEEDS_IMPROVEMENT — X issues fixed across Y phases]
   Final status: [PASS | X issues remain (see below)]
   [If issues remain: list them]
```
