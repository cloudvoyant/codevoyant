# detect

Detect the task runner used by this project and export `TASK_RUNNER`, `TASK_RUNNER_LIST_CMD`, and `TASK_RUNNER_NAME` for downstream use.

## Detection Priority

1. `mise.toml` or `.mise.toml` → `mise run`
2. `justfile` or `Justfile` → `just`
3. `Taskfile.yml` or `Taskfile.yaml` → `task`
4. `package.json` with a `scripts` field → `pnpm run` (fallback to `npm run` if pnpm not on PATH)
5. None found → report and suggest adding a `mise.toml`

## Step 1: Detect in Order

```bash
if [ -f mise.toml ] || [ -f .mise.toml ]; then
  TASK_RUNNER="mise run"
  TASK_RUNNER_LIST_CMD="mise tasks ls"
  TASK_RUNNER_NAME="mise"
elif [ -f justfile ] || [ -f Justfile ]; then
  TASK_RUNNER="just"
  TASK_RUNNER_LIST_CMD="just --list"
  TASK_RUNNER_NAME="just"
elif [ -f Taskfile.yml ] || [ -f Taskfile.yaml ]; then
  TASK_RUNNER="task"
  TASK_RUNNER_LIST_CMD="task --list"
  TASK_RUNNER_NAME="task"
elif [ -f package.json ] && jq -e '.scripts' package.json > /dev/null 2>&1; then
  if command -v pnpm > /dev/null 2>&1; then
    TASK_RUNNER="pnpm run"
    TASK_RUNNER_LIST_CMD="pnpm run"
  else
    TASK_RUNNER="npm run"
    TASK_RUNNER_LIST_CMD="npm run"
  fi
  TASK_RUNNER_NAME="package.json"
else
  TASK_RUNNER=""
  TASK_RUNNER_LIST_CMD=""
  TASK_RUNNER_NAME="none"
fi
```

## Step 2: Report

If `TASK_RUNNER` is set, report:

```
Task runner: {TASK_RUNNER_NAME} ({TASK_RUNNER})
List command: {TASK_RUNNER_LIST_CMD}
```

If `TASK_RUNNER_NAME` is `none`, report:

```
No task runner found in this project.
Recommended: add a mise.toml with a [tasks] table to declare your build/test/lint commands.
```

## Output

When another workflow calls this one, expose the three variables:

- `TASK_RUNNER` — e.g. `mise run`, `just`, `task`, `pnpm run`, `npm run`
- `TASK_RUNNER_LIST_CMD` — command that lists tasks for this runner
- `TASK_RUNNER_NAME` — short identifier: `mise`, `just`, `task`, `package.json`, or `none`
