# list

List all available tasks in the project using the detected task runner.

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
  TASK_RUNNER_LIST_CMD=""
  TASK_RUNNER_NAME="none"
fi
```

## Step 2: List Tasks

If `TASK_RUNNER_NAME` is `none`:

```
No task runner found in this project.
Recommended: add a mise.toml with a [tasks] table.
```

Otherwise:

```bash
$TASK_RUNNER_LIST_CMD
```

Present output as-is — each runner has good built-in formatting:

- **mise** — `mise tasks ls` shows name + description columns
- **just** — `just --list` shows recipes grouped by `mod` with descriptions
- **task** — `task --list` shows tasks with their `desc` field
- **package.json** — `pnpm run` / `npm run` shows scripts; for package.json fall back to `jq '.scripts' package.json` if the bare command does not list scripts

## Output

Report the listing as final agent text. Mention the detected runner at the top, then the list.
