---
name: loop
description: "Repeat a task until its objective is met or a max iteration count is reached. Creates a tracking doc and runs immediately — every iteration executes in one background loop agent that performs the task and judges the objective. Triggers on: 'loop', 'run loop', 'repeat until', 'keep going until'."
license: MIT
compatibility: Works on Claude Code and OpenCode. Uses background agents.
---

# loop

A loop is not a saved artifact like a flow. It is a **tracking doc plus a run**: `/loop` writes `.codevoyant/loops/{slug}/loop.md` (task, objective, bound, and a per-iteration log) and immediately executes iterations, appending each result to the doc, until the objective is met or the bound is reached. There is nothing to define ahead of time and no separate run command.

**Markdown output: soft-wrap prose, never hard-wrap** — when this skill writes a `.md` artifact (the tracking doc or any generated document), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

## Usage

```
/loop <task to repeat> --until <objective> [--max N] [--check <command>] [--resume <slug>]
```

- **task** (required positional) — what to repeat each iteration: a skill command, shell command, or agent instruction. Runs in a background agent.
- **--until** (required) — the objective: the verifiable condition that ends the loop, phrased as an outcome, not an activity.
- **--max N** (default 3, must be ≥ 1) — the hard upper bound. The loop stops after N iterations even if the objective is not met.
- **--check <command>** (optional) — a deterministic check that exits 0 when the objective is met. When present it is the authoritative signal and overrides the agent's verdict.
- **--resume <slug>** (optional) — continue an existing tracking doc (append iterations under its existing task/objective/max) instead of starting a new one.

## Procedure

All of it is here — there are no workflow files.

1. **Parse args.** Error out if the task or `--until` is missing, or `--max` is not a positive integer.
2. **Initialize the shared store** before any mkdir (a fresh clone must get the symlink, not a real dir):
   ```bash
   # {SKILL_ROOT} = this skill's package root (the directory containing this SKILL.md) — substitute the real path.
   python3 "{SKILL_ROOT}/scripts/cv_init_store.py" >/dev/null
   ```
3. **Slug the task** (lowercase, spaces → hyphens, `[a-z0-9-]`, ≤ 50 chars); suffix `-2`, `-3`, … if `.codevoyant/loops/{slug}/` already exists, unless `--resume` names it. `mkdir -p .codevoyant/loops/{slug}`.
4. **Write the tracking doc** `.codevoyant/loops/{slug}/loop.md` (or reuse it under `--resume`):
   ```markdown
   # Loop: {slug}

   - **Task:** {task}
   - **Objective:** {objective}
   - **Check:** {command | (none — the loop agent judges)}
   - **Max iterations:** {N}
   - **Status:** running

   | # | Result | Verdict | Reason |
   | --- | --- | --- | --- |
   {one row appended per iteration}
   ```
5. **Run iterations** for `i` in `1..N`:
   - Spawn ONE `loop-agent` background agent (`agents/loop-agent.md`, `run_in_background: true`) with the task, the objective, the iteration number, and the previous iteration's result line. It performs the task AND judges whether the objective is now met — strictly, from the actual repo state, never from its own claim. Collect with a blocking wait.
   - If it returns `NEEDS_INPUT: {question}`: ask the user on the main thread, fold the answer in, and re-run the same iteration (it still counts once toward the bound).
   - If `--check` is set, run the check command after the agent returns: exit 0 → MET (the check overrides the agent's verdict); non-zero → NOT_MET.
   - Append the iteration row to the tracking doc (result summary, verdict, reason). On MET: set `Status: complete` and stop. Otherwise continue.
6. **Report.** If the loop exits at the bound without MET, set `Status: max-reached`. Print:
   ```
   ✓ Loop '{slug}' {complete | max-reached} — {i}/{N} iterations
     Final: {last verdict reason}
     Tracking doc: .codevoyant/loops/{slug}/loop.md
   ```
   On `max-reached`, add: re-run with a higher `--max`, tighten the task, or `--resume {slug}` to continue the same loop later.

## Guarantees

- The task never runs inline on the main thread — every iteration is a `loop-agent` background run.
- The loop always terminates: at the bound at the latest.
- A `NEEDS_INPUT` re-run does not consume extra iterations beyond the bound.

## Agent

- **loop-agent** (`agents/loop-agent.md`) — performs one iteration of the task and judges the objective from the actual repo state; returns STATUS/RESULT/EVIDENCE/VERDICT.
