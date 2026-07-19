# task

Unified task runner skill that auto-detects mise, just, task.dev, or package.json scripts and provides a consistent interface for listing and running tasks. All work runs in a single shell call, so it is fast even on hot paths. Invoke as `/task` (or the alias `/tasks`).

## Commands

### list — List available tasks (default)

With no arguments, `/task` detects the runner and lists all available tasks in one fast call.

```bash
/task           # list all tasks (same as /task list)
/task list
```

Alias: `/task ls`.

### run — Run a task (or just name it)

Any first token that is not a known verb is treated as a task to run. Extra arguments are passed through to the runner.

```bash
/task test                  # run the "test" task
/task run test              # explicit form
/task build -- --release    # pass extra args after --
```

The query is matched against task names by exact match, then case-insensitive exact, then unique prefix, then unique substring. If no task matches, `/task` offers to create a task-runner-compatible entry (a mise `[tasks.*]` block, a just recipe, a `Taskfile.yml` task, or a `package.json` script) — or, if no runner is configured, to scaffold a `mise.toml`. It only writes the change after you confirm.

Alias: `/task r`.

### detect — Identify the task runner

Probe the project for a task runner and report which one is active.

```bash
/task detect
```

Alias: `/task d`.
