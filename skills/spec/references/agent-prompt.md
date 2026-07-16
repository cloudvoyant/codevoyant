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
{Discover by reading mise.toml/justfile/Makefile/package.json directly}

## Completed phases (summary only)
{One line per completed phase: "Phase 1 (Setup) ✅ — 4/4 tasks, tests passing"}

## Annotations to apply first

Before starting any task, scan plan.md and implementation/phase-{N}.md for inline HTML-comment annotations (scan `<!-- >>` before `<!-- >`):

- **`<!-- > instruction -->`** — minor annotation, standalone comment applying to the block below it
- **`content <!-- >> instruction -->`** — major annotation, inline suffix applying to that specific line

Apply each annotation (mark done, remove task, rewrite content, etc.) and delete the entire `<!-- ... -->` comment from the file. Log what you applied. If none found, continue silently.

## Your tasks — Phase {N}

{Paste Phase {N} task list from plan.md verbatim}

## Implementation spec — Phase {N}

{Full content of .codevoyant/plans/{plan-name}/implementation/phase-{N}.md}

## File paths

- Plan: .codevoyant/plans/{plan-name}/plan.md
- Execution log: .codevoyant/plans/{plan-name}/execution-log.md
- Registry: .codevoyant/README.md

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
Commit completed tasks with conventional commit messages. If a remote/upstream is configured, push the phase.

After committing (and pushing) the phase, run the OPTIONAL CI-green check — this is best-effort and must never block or fail the phase:
- GitHub repo → `/gh ci --silent` for this branch; GitLab repo → `/glab ci --silent`.
- Skip silently if there is no remote, no CI configured, or no `gh`/`glab` CLI installed.
- If CI reports failure, note it in execution-log.md and report it in your summary, but do NOT auto-fix here — leave fixes to `/git commit --fix` or the user. A failing or absent CI does not mark the phase incomplete.
{endif}

Execute Phase {N} now. Report a summary when done.
```
