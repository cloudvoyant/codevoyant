# run (reference)

`/task run <query> [args…]` (and any unrecognised first token) runs `scripts/task.sh run <query> [args…]` in a single Bash call. This file documents that contract; it is **not** transcribed or executed on the hot path.

## Matching

`<query>` is resolved against the runner's task names in order: exact → case-insensitive exact → unique case-insensitive prefix → unique case-insensitive substring. The first unique match wins.

## Argument pass-through

Everything after `<query>` is forwarded to the runner verbatim (including `--` and quoting).

## Exit markers (last output line)

- `NO_MATCH:<query>` (exit 3) — no unique match; the listing is printed. The skill then offers to create a runner-native task entry (see SKILL.md Step 2).
- `NO_QUERY` (exit 2) — `run` called with no task name; the skill presents the listing and asks which task.
- `NO_RUNNER` (exit 4) — no runner configured; the skill offers to scaffold a `mise.toml`.

Source of truth: `skills/task/scripts/task.sh`.
