# Workflow: flow go

Execute all pending (unchecked) steps of a named flow sequentially. Each step runs as a blocking foreground subagent. After each step completes, mark it `[x]` in `flow.md` before proceeding.

## Step 0: Parse arguments

```
FLOW_NAME = first non-flag positional arg (required)
FLOW_DIR  = .codevoyant/flows/{FLOW_NAME}/
```

If `FLOW_NAME` is missing, error: "Usage: /flow go <name>. A flow name is required."

If `FLOW_DIR/flow.md` does not exist, error: "Flow '{FLOW_NAME}' not found. Run /flow new {FLOW_NAME} first."

## Step 1: Read flow.md

Read `FLOW_DIR/flow.md` and parse the Steps checklist section.

Collect all lines matching the pattern `N. [ ] ...` (unchecked) in order. These are the **pending steps**.

If all steps are already `[x]` (no pending steps found): report "Flow '{FLOW_NAME}' is already complete." and exit.

## Step 2: Execute steps sequentially

For each pending step in order:

1. Report: `▶ Step {N}: {step-command}`

2. Read `FLOW_DIR/implementation/step-N.md` to get the agent prompt.

3. Launch a **blocking** (foreground) subagent:
   ```
   Agent(
     subagent_type: general-purpose,
     run_in_background: false,
     description: "Flow step {N}: {step-command}",
     prompt: {full contents of step-N.md}
   )
   ```
   Wait for the subagent to return before continuing.

4. After the subagent returns: update `FLOW_DIR/flow.md` — change the step's `[ ]` to `[x]`:
   ```
   N. [x] {step-command}
   ```
   Also update `{Status}` in the Metadata section to `Active` (leave as Active until all steps complete).

5. Report: `✓ Step {N} complete.`

6. Proceed to next pending step.

## Step 3: Final report

After all steps are complete, update `{Status}` in `FLOW_DIR/flow.md` to `Complete`.

Report:
```
✅ Flow "{FLOW_NAME}" complete. All {N} steps finished.
```
