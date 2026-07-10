# Workflow: flow go

Execute all pending (unchecked) steps of a named flow sequentially. Each step runs as a blocking foreground subagent. Parameters (`{{placeholders}}`) are resolved from user input before running, and each step's key outputs are threaded forward into later steps as **flow context**. After each step completes, mark it `[x]` in `flow.md` before proceeding.

Steps run **non-interactively** — a subagent cannot prompt the user. When a step genuinely needs an answer it can't derive, it returns a `NEEDS_INPUT:` line and this orchestrator (on the main thread) asks the user and re-runs the step. This is how interactive skills chained in a flow still reach the human.

## Step 0: Parse arguments

```
--global / -g   → read the flow from ~/.codevoyant/flows (see references/flow-dir.md)
--set key=value → bind a named parameter (repeatable, e.g. --set feature="add OAuth" --set env=staging)
--branch, etc.  → any other flag → PASSTHROUGH_FLAGS (see references/flow-dir.md), appended to every step this run
FLOW_NAME = first positional arg (POSITIONALS[0]; required)
INPUT     = all remaining positional text (POSITIONALS[1..]), joined with spaces → the {{input}} parameter
```

Parse flags via `references/flow-dir.md`. From the resulting `PASSTHROUGH_FLAGS`, pull out any `--set key=value` pairs into `PARAMS` (below); the remainder (e.g. `--branch feature/x`) stays in `PASSTHROUGH_FLAGS` and is appended to every step command this run (Step 2).

If `FLOW_NAME` is missing, error: "Usage: /flow go <name> [input text] [--set k=v] [--global]. A flow name is required."

Build the parameter map `PARAMS`:
- `input` = `INPUT` (the joined free text), if any
- each `--set key=value` → `PARAMS[key] = value`

## Step 0.5: Resolve the flow location

Resolve `FLOW_DIR` per `references/flow-dir.md` (local-first, then global; `--global` forces global only). If not found in any scope, error: "Flow '{FLOW_NAME}' not found (looked in local and global). Run /flow new {FLOW_NAME} first."

## Step 1: Read flow.md and resolve parameters

Read `FLOW_DIR/flow.md`. Parse the Steps checklist and the Parameters section.

**Resolve every `{{placeholder}}` used anywhere in the steps:**
1. Scan all step commands for `{{name}}` tokens; collect the unique set `NEEDED`.
2. For each token in `NEEDED`:
   - If `PARAMS[name]` is already set (from `--set`, or `input` from free text) → use it.
   - Else → **prompt the user once** for the value, using AskUserQuestion (free-text via Other): question `Value for {{name}}?`, header `Parameter`, and (for `{{input}}`) show the flow's Parameters description as help. Store the answer in `PARAMS[name]`.
3. Do not proceed with any unresolved token. If the user dismisses a prompt, abort: "Cancelled — {{name}} is required to run this flow."

Collect the pending steps: all lines matching `N. [ ] ...` (unchecked), in order. If none are pending, report "Flow '{FLOW_NAME}' is already complete." and exit.

Initialize the **flow context** accumulator `CONTEXT`. **On resume:** if `FLOW_DIR/context.md` exists (an earlier, interrupted run), load it into `CONTEXT` so the remaining steps keep the handoffs from steps already marked `[x]`. Otherwise start empty. (Without this, a resumed flow loses e.g. the PR number a completed `pr open` step produced.)

## Step 2: Execute steps sequentially

For each pending step in order:

1. **Substitute parameters** in the step command: replace every `{{name}}` with `PARAMS[name]`, then append this run's `PASSTHROUGH_FLAGS` (e.g. `--branch feature/x`) to the command string if the step does not already carry them (steps that baked the flag in at `new` time already have it — do not duplicate). Call the result `RESOLVED_COMMAND`. Report: `▶ Step {N}: {RESOLVED_COMMAND}`

2. Read `FLOW_DIR/implementation/step-N.md` to get the agent prompt. Prepare the prompt for this run by filling its injection points:
   - Replace `{step-command}` occurrences with `RESOLVED_COMMAND` (substitute `{{placeholders}}` here too).
   - Fill the **Parameters** section with the resolved `key = value` pairs (or "none").
   - Fill the **Flow context so far** section with `CONTEXT` (or "(nothing yet — this is the first step)" when empty).

3. Launch a **blocking** (foreground) subagent:
   ```
   Agent(
     subagent_type: general-purpose,
     run_in_background: false,
     description: "Flow step {N}: {RESOLVED_COMMAND}",
     prompt: {filled contents of step-N.md}
   )
   ```
   Wait for the subagent to return. It runs the skill **non-interactively** and, if it can't resolve a required decision from Parameters/Flow context, returns a `NEEDS_INPUT:` line rather than guessing or blocking.

4. **Handle NEEDS_INPUT (interactive escalation).** If the subagent's report ends with `NEEDS_INPUT: {question}`:
   a. You are on the main thread — ask the user that `{question}` with **AskUserQuestion** (free-text via Other).
   b. Add the answer to `PARAMS` (so later steps can reuse it) and note it in `CONTEXT`, then **re-run this step** from sub-step 2 with the answer now available.
   c. Cap at 3 escalations per step; if the step still returns `NEEDS_INPUT` after that, treat it as a step failure (below).
   This is what lets an interactive skill's mid-run question (e.g. `/dev explore` asking "generate proposals?", or `/spec new` needing to pick an exploration) reach the user even though the step ran in a subagent.

5. **Capture the handoff.** Read the subagent's returned report. Extract the `HANDOFF:` line if present; otherwise summarize the key outputs (IDs, URLs, paths, names) in one line yourself. Append to `CONTEXT`:
   ```
   [step {N} · {RESOLVED_COMMAND}] → {handoff or one-line summary}
   ```
   Keep `CONTEXT` terse — it is injected into every later step, so it must stay a short bulleted log, not full transcripts. **Persist it:** write the accumulated `CONTEXT` to `FLOW_DIR/context.md` so an interrupted flow can resume with it (see Step 1).

6. Update `FLOW_DIR/flow.md` — change this step's `[ ]` to `[x]` (keep the original `{{placeholder}}` text in flow.md; only the run used resolved values). Leave `Status` as `Active` until all steps complete.

7. Report: `✓ Step {N} complete.`

8. Proceed to next pending step.

**On step failure:** if a subagent reports it could not complete (blocking error), stop the loop, leave the step unchecked, and report which step failed and why. `CONTEXT` is already persisted to `FLOW_DIR/context.md`, so re-running `/flow go` resumes from this step with prior context intact. Do not run later steps — they likely depend on this one's context.

## Step 3: Final report

After all steps are complete, update `Status` in `FLOW_DIR/flow.md` to `Complete` and remove `FLOW_DIR/context.md` (a fresh run starts clean).

Report:
```
✅ Flow "{FLOW_NAME}" complete. All {N} steps finished.

  Parameters used: {key=value list, or "none"}
```
