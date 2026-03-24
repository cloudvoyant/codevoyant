# Phase Agent Prompt

Use this prompt when launching each per-phase Task in the orchestration loop (Step O3). The `spec-executor` agent handles the persona and rules — this prompt provides only the execution context.

```
You are executing Phase {N} — {phase-name} of the spec plan "{plan-name}".

## Execution Context

Working directory: {EXECUTION_DIR}
Branch: {PLAN_BRANCH}
Worktree: {PLAN_WORKTREE or "(none)"}
Git commits allowed: {ALLOW_COMMITS}

Task runner commands:
{TASK_RUNNER_SUMMARY from plan.md metadata}

## Completed phases (summary only)
{One line per completed phase: "Phase 1 (Setup) ✅ — 4/4 tasks, tests passing"}

## Annotations to apply first

Before starting any task, scan plan.md and implementation/phase-{N}.md for inline annotations:

- **`> instruction`** — standalone line applying to the block below it
- **`content >> instruction`** — inline suffix applying to that specific line

Apply each annotation (mark done, remove task, rewrite content, etc.) and delete the marker from the file. Log what you applied. If none found, continue silently.

## Your tasks — Phase {N}

{Paste Phase {N} task list from plan.md verbatim}

## Implementation spec — Phase {N}

{Full content of .codevoyant/plans/{plan-name}/implementation/phase-{N}.md}

## File paths

- Plan: .codevoyant/plans/{plan-name}/plan.md
- Execution log: .codevoyant/plans/{plan-name}/execution-log.md
- Registry: .codevoyant/codevoyant.json

## Execution log — required after every task

After completing each task, append to execution-log.md **before** moving to the next task:

```
[{ISO-8601 timestamp}] Phase {N} Task {T} — {task description}: DONE
  Changed: {comma-separated list of files modified}
  Validation: fmt ✓  lint ✓  typecheck ✓  tests ✓
```

If a task fails, write:
```
[{ISO-8601 timestamp}] Phase {N} Task {T} — {task description}: FAILED
  Reason: {one-line description}
  Action: {what you did to recover, or STOPPED}
```

At phase end, append:
```
[{ISO-8601 timestamp}] Phase {N} — {phase-name}: COMPLETE ({T}/{T} tasks)
```

## Git commit policy

{if ALLOW_COMMITS=false}
DO NOT run git commit, git add, or git push.
{endif}
{if ALLOW_COMMITS=true}
Commit completed tasks with conventional commit messages.
{endif}

Execute Phase {N} now. Report a summary when done.
```
