# Workflow: loop go

Run a loop: repeat the Task in background agents until the Objective is met or the max iteration count is reached. The orchestrator runs on the main thread; the task and the objective evaluation are always subagents.

## Step 0: Parse arguments

```
LOOP_NAME = first positional arg (required)
--max N   = override the definition's Max Iterations for this run
```

If `LOOP_NAME` is missing, error: "Usage: /loop go <name> [--max N]. A loop name is required."

## Step 1: Resolve the definition

Initialize the shared store, then load `.codevoyant/loops/{LOOP_NAME}/loop.md`:

```bash
# {SKILL_ROOT} = the loop skill's package root (substitute the real path)
python3 "{SKILL_ROOT}/scripts/cv_init_store.py" >/dev/null
```

If not found, error: "Loop '{LOOP_NAME}' not found. Run /loop new {LOOP_NAME} first."

Extract `TASK`, `OBJECTIVE`, `CHECK` (may be absent), and `MAX`. If `--max` was passed, `MAX = --max`. Validate `MAX` is a positive integer; otherwise error.

## Step 2: Create the run instance

```bash
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR=".codevoyant/loops/{LOOP_NAME}-${RUN_ID}"
mkdir -p "$RUN_DIR"
```

Write `$RUN_DIR/run.md`:

```markdown
# Run: {LOOP_NAME} — {RUN_ID}

loop: {LOOP_NAME}
status: running
max: {MAX}

## Iterations

{appended per iteration}
```

## Step 3: The iteration loop

For `i` in `1..MAX`:

1. **Run the task in a background agent.** Spawn one `loop-runner` agent (`run_in_background: true`) with `TASK`, the iteration number `i`, and the previous iteration's RESULT (empty on iteration 1). Collect its result with `TaskOutput(id: RUNNER_TASK_ID, block: true)`. Parse `STATUS`, `RESULT`, `EVIDENCE`.
   - If `STATUS: NEEDS_INPUT`: ask the user the question in RESULT (AskUserQuestion), fold the answer into the task context, and re-run this same iteration (it still counts once toward `MAX`).
   - Append the iteration to `run.md` (see Step 4).
2. **Evaluate the objective.**
   - If `CHECK` is defined: run it. Exit 0 → `VERDICT=MET`. Non-zero → `VERDICT=NOT_MET`. Record the command's output as the reason.
   - Else spawn one `loop-judge` agent (`run_in_background: true`, `model-tier: light`) with `OBJECTIVE`, `i`, and the runner's RESULT + EVIDENCE. Collect with `TaskOutput(id: JUDGE_TASK_ID, block: true)`. Parse `VERDICT`, `REASON`, `MISSING`.
3. **Decide.**
   - `VERDICT=MET` → set the run status to `complete`, record the final iteration, and break.
   - Otherwise continue to the next iteration.

If the loop exits because `i` reached `MAX` without MET, set the run status to `max-reached`. If a runner returned `FAILED` on every remaining path with no progress, you may still continue to `MAX` — record each failure.

## Step 4: Record each iteration

Append to `run.md` `## Iterations`:

```markdown
### Iteration {i}

runner: {STATUS}
result: {RESULT}
verdict: {MET | NOT_MET}
reason: {REASON or check output}
```

Then update the run.md header `status` field as the loop progresses.

## Step 5: Report

```
✓ Loop '{LOOP_NAME}' finished ({run-id})
  Status: {complete | max-reached}
  Iterations: {count}/{MAX}
  Final: {the REASON or check output of the last iteration}
  Run log: {RUN_DIR}/run.md
```

If `max-reached`, add: "Objective not met within {MAX} iterations — re-run with a higher `--max` or tighten the Task."

## Guarantees

- The Task never runs inline on the main thread — every iteration is a `loop-runner` background agent.
- The loop always terminates: at `MAX` iterations at the latest.
- A `NEEDS_INPUT` re-run does not silently consume extra iterations beyond `MAX`.
