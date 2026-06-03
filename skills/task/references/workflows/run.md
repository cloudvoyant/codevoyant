# run

Run a named task using the project's detected task runner.

## Step 1: Detect Runner

Run the detection logic from `detect.md` inline:

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
  TASK_RUNNER_NAME="none"
fi
```

If `TASK_RUNNER_NAME` is `none`, abort and tell the user no task runner is configured (suggest `mise.toml`).

## Step 2: Resolve Task Name

Parse `$REMAINING_ARGS`:

- First token is `TASK_NAME`
- Everything after the first token is `EXTRA_ARGS` (preserve `--` and quoting as-is)

If `REMAINING_ARGS` is empty:

1. Run `$TASK_RUNNER_LIST_CMD` to enumerate available tasks
2. Ask the user via `AskUserQuestion`: "Which task?" — present up to 4 task names as options plus "Other" (let the user type a name)
3. Set `TASK_NAME` to the chosen value; `EXTRA_ARGS` remains empty

## Step 3: Execute

Run:

```bash
$TASK_RUNNER $TASK_NAME $EXTRA_ARGS
```

Stream output live.

## Step 4: Handle Failure

If the exit code is non-zero:

1. Show the last 20 lines of output
2. Suggest checking the task definition file (`mise.toml`, `justfile`, `Taskfile.yml`, or `package.json`)
3. If the task name was not recognized by the runner, suggest running `/tasks list` to see available tasks

## Output

Report success or failure as final agent text — do not call any notification command.
