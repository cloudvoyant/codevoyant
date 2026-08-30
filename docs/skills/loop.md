---
title: loop
---

# loop

Repeat a task until its objective is met or a max iteration count is reached. A loop is not a saved artifact like a flow — `/loop` creates a tracking doc and runs immediately, with every iteration executed by a single background loop agent that performs the task and judges the objective.

## Usage

```bash
/loop fix the failing lint errors --until "mise run lint exits 0" --max 5
/loop keep triaging the backlog --until "all P0 issues are closed" --check "gh issue list --label P0 --state open | wc -l | grep -qx 0"
/loop continue the earlier pass --resume fix-lint-errors
```

- **task** (required) — what to repeat each iteration: a skill command, shell command, or agent instruction.
- **--until** (required) — the objective: the verifiable condition that ends the loop, phrased as an outcome.
- **--max N** (default 3) — the hard upper bound; the loop stops at N iterations even if the objective is not met.
- `--check <command>` (optional) — a deterministic check that exits 0 when the objective is met; when present it overrides the agent's verdict.
- `--resume <slug>` — continue an existing loop's tracking doc instead of starting a new one.

## How a run works

Each invocation writes `.codevoyant/loops/{slug}/loop.md` — the tracking doc holding the task, objective, check, bound, status, and one row per iteration — then runs: for each iteration it spawns one `loop-agent` background agent that performs the task and strictly judges the objective from the actual repo state (never from its own claim). On a MET verdict (or a zero-exit `--check`) the loop stops with status `complete`; at the bound it stops with `max-reached`. If an iteration needs input, the question is escalated to the user and the same iteration re-runs without consuming the bound twice.
