# task

Unified task runner skill that auto-detects mise, just, task.dev, or package.json scripts and provides a consistent interface for listing and running tasks.

## Commands

### detect — Identify the task runner

Probe the project for a task runner and report which one is active.

```bash
/tasks detect
```

### list — List available tasks

List all tasks with descriptions from the detected task runner.

```bash
/tasks list    # list all tasks
/tasks         # same as /tasks list
```

Alias: `/tasks ls`.

### run — Run a task

Run a named task via the detected task runner, with optional extra arguments.

```bash
/tasks run test                  # run the test task
/tasks run build -- --release    # pass extra args after --
```

Alias: `/tasks r`.
