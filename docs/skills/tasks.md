---
title: tasks
---

# tasks

Unified task runner skill. Auto-detects whether your project uses mise, just, task.dev, or package.json scripts and provides a consistent interface for listing and running tasks.

## Installation

```bash
npx skills add cloudvoyant/codevoyant
```

## Usage

```bash
/tasks                       # list all available tasks (default)
/tasks list                  # same as above
/tasks detect                # show which task runner was detected
/tasks run <task>            # run a named task
/tasks run build -- --watch  # pass extra args after --
```

Aliases: `r` → `run`, `ls` → `list`, `d` → `detect`.

## Detection Order

The skill probes for task runners in this order and uses the first match:

1. **mise** — `mise.toml` or `.mise.toml` present
2. **just** — `justfile` or `Justfile` present
3. **task.dev** — `Taskfile.yml` or `Taskfile.yaml` present
4. **npm scripts** — `package.json` with a `scripts` field

```bash
/tasks detect
# → Detected: mise (mise.toml found)
# → List command: mise tasks
```

## How Other Skills Use It

The `/tasks` skill is a building block used internally across the skills system. Before running raw build commands (`tsc`, `vitest`, `eslint`, etc.), other workflows call `/tasks list` to check whether a task already wraps that command. If one exists, it's used instead of the raw binary — ensuring the project's own conventions are followed.

## Examples

```bash
/tasks run test
# → mise run test

/tasks run build -- --release
# → mise run build -- --release

/tasks list
# → install    Install dependencies
# → build      Build the project
# → test       Run tests
# → lint       Run linter
# → format     Format source files
```
