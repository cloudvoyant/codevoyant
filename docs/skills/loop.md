---
title: loop
---

# loop

Repeat-until-objective orchestration — run a task repeatedly until its objective is met or a caller-specified max iteration count is reached. Every iteration runs in a background agent, and the loop always terminates at the bound.

## Workflows

### new — define a loop

Collect a Task (what to repeat each iteration — a skill command, shell command, or agent instruction), an Objective (the verifiable condition that ends the loop), an optional Check (a shell command that exits 0 when the objective is met; otherwise a judge agent decides), and Max Iterations (a positive integer upper bound). Writes the definition to `.codevoyant/loops/{name}/loop.md`.

```bash
/loop new fix-lint                     # prompts for task, objective, check, max
```

### go — run a loop

Run the Task in a `loop-runner` background agent, then evaluate the objective — the Check command when defined, otherwise a `loop-judge` agent. Repeat until the verdict is MET (status `complete`) or the iteration bound is hit (status `max-reached`). Each iteration and its verdict are appended to the run instance's `run.md` under `.codevoyant/loops/{name}-{run-id}/`. If the runner needs input, the question is escalated, answered, and the same iteration re-runs (it still counts once toward the bound). `--max N` overrides the definition's bound for one run; any other flag is forwarded to the task the loop runs.

```bash
/loop go fix-lint                      # run until objective met or max reached
/loop go fix-lint --max 10             # override Max Iterations for this run
```

### list — list loops

Show every loop definition with its max iterations, latest run, and run status.

```bash
/loop list                             # all loops + latest run state
```

### status — inspect a loop

Print a loop's definition (Task, Objective, Check, Max Iterations) and its latest run-instance state: status, iteration count, and the last iteration's result.

```bash
/loop status fix-lint                  # definition + latest run state
```

### help — list commands

```bash
/loop help                             # show usage reference
```
