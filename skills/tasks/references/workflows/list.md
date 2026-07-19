# list (reference)

`/task list` (and the no-arg default `/task`) runs `scripts/task.sh list` in a single Bash call. This file documents that contract; it is **not** transcribed or executed on the hot path.

## Behaviour

- Detects the runner (same order as `detect`), prints a `RUNNER: <name> (<run prefix>)` header, then the runner's native task listing.
- If no runner is found, prints a short "no task runner" message recommending a `mise.toml` with a `[tasks]` table.

Native listings are shown as-is (mise: name+description columns; just: recipes grouped by module; task: tasks with `desc`; package.json: the `scripts` object).

Source of truth: `skills/task/scripts/task.sh`.
