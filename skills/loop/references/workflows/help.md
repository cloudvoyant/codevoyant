# loop — usage reference

Repeat a task until its objective is met or a max iteration count is reached. Every iteration runs in a background agent.

## Commands

| Command | Purpose |
| --- | --- |
| `/loop new {name}` | Define a loop: task, objective, optional check command, max iterations |
| `/loop go {name} [--max N]` | Run the loop until the objective is met or max iterations (`--max` overrides the definition's bound for this run) |
| `/loop list` | List all loops and their latest run state |
| `/loop status {name}` | Print a loop's definition and latest run-instance state |
| `/loop help` | This reference |

## How a run works

1. Load `.codevoyant/loops/{name}/loop.md`.
2. Create a run instance `.codevoyant/loops/{name}-{run-id}/run.md`.
3. For iteration `i` in `1..max`:
   - Spawn the `loop-runner` background agent to perform the Task. Collect its result.
   - Evaluate the objective: if a `## Check` command is defined, run it (exit 0 = met); otherwise spawn the `loop-judge` background agent to evaluate the Objective against the current state.
   - If met → record `complete`, stop. Otherwise record the iteration and continue.
4. If the loop reaches `max` without meeting the objective, record `max-reached` and stop.

A loop never runs the task inline on the main thread — the runner and the judge are always subagents.
