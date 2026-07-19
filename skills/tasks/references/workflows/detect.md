# detect (reference)

`/task detect` runs `scripts/task.sh detect` in a single Bash call. This file documents that contract; it is **not** transcribed or executed on the hot path.

## Detection order

1. `mise.toml` or `.mise.toml` → mise (`mise run`, list: `mise tasks ls`)
2. `justfile` or `Justfile` → just (`just`, list: `just --list`)
3. `Taskfile.yml` or `Taskfile.yaml` → task (`task`, list: `task --list`)
4. `package.json` with a `scripts` field → `pnpm run` (or `npm run` if pnpm is absent)
5. None found → `none`; recommend adding a `mise.toml` with a `[tasks]` table

## Output (machine-readable lines from `task.sh detect`)

- `RUNNER_NAME=` — `mise` | `just` | `task` | `package.json` | `none`
- `RUNNER=` — the run prefix (e.g. `mise run`, `just`, `pnpm run`), empty when none
- `LIST_CMD=` — the command that lists tasks, empty when none

Source of truth: `skills/task/scripts/task.sh`.
