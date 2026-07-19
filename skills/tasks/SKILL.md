---
name: tasks
description: 'Unified task runner dispatcher: auto-detects mise, just, task.dev, or package.json scripts and provides commands to run, list, or detect the project task runner. Triggers on: "/tasks", "run task", "list tasks", "detect task runner", "what tasks", "mise run", "just run", "pnpm run", "package.json scripts".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# tasks

Unified task runner skill dispatcher. Auto-detects the project's task runner and provides a consistent interface for listing, detecting, and running tasks. All detection, listing, and running is done by one shipped script (`scripts/task.sh`) invoked in a **single Bash call** — never by reading multiple markdown files.

## Critical Rules

- **Do the work in one Bash call** — dispatch every verb to `scripts/task.sh`; never transcribe its logic into chat or re-read the workflow docs to run bash.
- **Step 0 always runs first** — no exceptions.
- **Unknown verb is a run query** — a first token that is not `detect`/`list`/`run` (or an alias) is treated as a task to run.
- **Pass all remaining args through** — everything after the task name is forwarded to the runner unchanged.
- **Before running raw build/test/lint/format commands** (`tsc`, `vitest`, `eslint`, `prettier`, etc.) in any other workflow, first call `/task list` (alias: `/tasks list`) to check whether a task wraps the command. If a task exists, use it. Never bypass the task runner.

## Step 0: Parse Arguments

```bash
VERB="[first non-flag token, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

# Aliases
case "$VERB" in
  r)  VERB="run" ;;
  ls) VERB="list" ;;
  d)  VERB="detect" ;;
esac
```

`SKILL_DIR` is the directory containing this SKILL.md (resolve it from this file's own path so the script is found from any working directory).

## Step 1: Dispatch to the script (one Bash call)

Run exactly one command based on `VERB`:

| Invocation | Command to run |
|---|---|
| no verb / no args | `bash "$SKILL_DIR/scripts/task.sh" list` |
| `list` (or `ls`) | `bash "$SKILL_DIR/scripts/task.sh" list` |
| `detect` (or `d`) | `bash "$SKILL_DIR/scripts/task.sh" detect` |
| `run <query> [args…]` (or `r …`) | `bash "$SKILL_DIR/scripts/task.sh" run <query> [args…]` |
| any other first token `<query> [args…]` | `bash "$SKILL_DIR/scripts/task.sh" run <query> [args…]` |

Stream the output. The script prints a `RUNNER: <name>` header and the task listing for `list`; runner variables for `detect`; and for `run` it `exec`s the matched task, forwarding extra args.

## Step 2: Handle the script's markers

The `run` subcommand may exit non-zero with a marker on the last line. Act on it:

- **`NO_MATCH:<query>`** — no task matched. Offer to create a task-runner-compatible entry for the detected runner, naming the exact file and showing the snippet, then create it only on user confirmation:
  - **mise** → add to `mise.toml`:
    ```toml
    [tasks.<name>]
    description = "<what it does>"
    run = "<command>"
    ```
  - **just** → add to `justfile`:
    ```
    <name>:
        <command>
    ```
  - **task** → add to `Taskfile.yml` under `tasks:`:
    ```yaml
      <name>:
        desc: "<what it does>"
        cmds:
          - <command>
    ```
  - **package.json** → add to the `scripts` object: `"<name>": "<command>"`.
- **`AMBIGUOUS:<query>`** — 2+ tasks matched the query. The candidate names are printed above the marker. Do **not** offer to create anything — present the candidates and ask which one to run (or have the user retype a more specific query).
- **`ENUM_FAILED:<query>`** — a runner is configured but its task list could not be enumerated (e.g. an untrusted mise config on a fresh clone, or a runner error). The runner's error is printed above the marker. Do **not** offer to create a task — surface the error and, for mise, suggest `mise trust`, then retry. Never treat this as "no such task."
- **`NO_RUNNER`** — no runner configured. Offer to scaffold a minimal `mise.toml`:
  ```toml
  [tasks.<name>]
  run = "<command>"
  ```
- **`NO_QUERY`** — `run` was called with no task name; present the listing and ask which task to run.

Never silently edit build config — offer the snippet and target file, and only write it after the user confirms.

## Workflow Index (reference docs — not executed on the hot path)

- **detect** (`references/workflows/detect.md`) — describes the `task.sh detect` contract and variables.
- **list** (`references/workflows/list.md`) — describes the `task.sh list` contract.
- **run** (`references/workflows/run.md`) — describes the `task.sh run` contract and matching rules.

## Help

```
/task <verb|query> [args]

Verbs:
  detect              Detect which task runner this project uses
  list                List all available tasks (default when no args given)
  run <task> [args]   Run a named task via the detected runner

Any other first token is treated as a task to run:
  /task test          → run the "test" task
  /task build -- --release

Aliases:
  r  → run
  ls → list
  d  → detect

Examples:
  /task               # list all tasks
  /task list
  /task test          # run the test task
  /task run build -- --release
  /task detect
```

## Usage Note for Other Skills

Other workflows should call `/task detect` at the start (or run `scripts/task.sh detect`) and use the resulting `RUNNER` / `LIST_CMD` variables instead of hard-coding shell commands. `/tasks …` is an accepted alias for `/task …` and resolves to the same script.
