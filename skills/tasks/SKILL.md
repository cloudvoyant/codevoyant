---
name: tasks
description: 'Unified task runner dispatcher: auto-detects mise, just, task.dev, or package.json scripts and provides commands to run, list, or detect the project task runner. Triggers on: "/tasks", "run task", "list tasks", "detect task runner", "what tasks", "mise run", "just run", "pnpm run", "package.json scripts".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# tasks

Unified task runner skill dispatcher. Auto-detects the project's task runner and provides a consistent interface for listing, detecting, and running tasks. Enforces task runner usage, discourages ad-hoc bash usage.

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged
- **Before running raw build/test/lint/format commands** (`tsc`, `vitest`, `eslint`, `prettier`, etc.) in any other workflow, first call `/tasks list` to check whether a task wraps the command. If a task exists, use it. Never bypass the task runner.

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

# Aliases
case "$VERB" in
  r)  VERB="run" ;;
  ls) VERB="list" ;;
  d)  VERB="detect" ;;
  "") VERB="list" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, print the Help section below and note the unknown verb.

## Workflow Index

- **detect** (`references/workflows/detect.md`) — detect which task runner the project uses; sets `TASK_RUNNER` and `TASK_RUNNER_LIST_CMD`
- **list** (`references/workflows/list.md`) — list all available tasks with descriptions
- **run** (`references/workflows/run.md`) — run a named task with optional extra args

## Help

```
/tasks <verb> [args]

Verbs:
  detect              Detect which task runner this project uses
  list                List all available tasks (default when no verb given)
  run <task> [args]   Run a named task via the detected runner

Aliases:
  r  → run
  ls → list
  d  → detect

Examples:
  /tasks list
  /tasks run test
  /tasks run build -- --release
  /tasks detect
```

## Usage Note for Other Skills

Other workflows in the skills system should call `/tasks detect` at the start (or read its logic inline) and use the resulting `TASK_RUNNER` / `TASK_RUNNER_LIST_CMD` variables instead of hard-coding shell commands. This enforces a single source of truth for build/test/lint commands per project.
