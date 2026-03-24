# go

Execute or continue the existing plan interactively, with configurable breakpoints for user review. Pass `--bg` for fully autonomous background execution equivalent to `/spec bg`.

## Variables

- `PLAN_NAME` — plan to execute (may be empty; will prompt if multiple plans exist)
- `BG_MODE` — true if `--bg` present
- `SILENT` — true if `--silent` present
- `ALLOW_COMMITS` — true if `--commit` or `-c` present

## Step 1: Select Plan

If `PLAN_NAME` not provided:

1. ```bash
   npx @codevoyant/agent-kit plans migrate
   npx @codevoyant/agent-kit plans list --status Active
   ```
2. Sort by Last Updated (most recent first); auto-select if only one
3. Use `AskUserQuestion` if multiple plans exist
4. If no plans exist, inform user to create with `/spec new`

## Step 1.5: Review Advisory

If `BG_MODE=false` and no `--yes`/`-y` flag:

Check if `.codevoyant/plans/{plan-name}/review.md` exists. If it does NOT exist:

```bash
echo "⚠️  This plan hasn't been reviewed yet. Consider running /spec review {plan-name} first."
echo "    Continuing anyway — press Ctrl+C to cancel."
sleep 3
```

## Step 2: Read and Analyze Plan

Read `.codevoyant/plans/{plan-name}/plan.md` to understand objective, all phases/tasks, current progress, and any insights from previous sessions.

**Validate plan structure:** phase headers match `### Phase \d+ - .+`, task format matches `\d+\. \[(x| )\] .+`, phase numbers are sequential. If validation fails, warn and suggest `/spec refresh`.

## Step 2.5: Validate and Setup Worktree Context

Same worktree logic as `bg.md` Step 2.5 — auto-switch to worktree if it exists, offer to create if missing, warn on branch mismatch if no worktree.

## Step 3: Determine Starting Point

Find the first unchecked task in the earliest incomplete phase. Report where execution will begin.

## Step 3.5: Validate Implementation Files

Same validation as `bg.md` Step 3 — check all phase-N.md files exist and are > 100 bytes.

## Step 4: Set Breakpoints

If `BG_MODE=true`: skip this step entirely. Proceed with no breakpoints (fully autonomous).

Otherwise use **AskUserQuestion**:

```
question: "Should Claude take breaks during execution for your review?"
header: "Breakpoints"
options:
  - label: "None (Fully autonomous)"
  - label: "After every phase"
  - label: "After specific phase"
```

If "After specific phase", follow up asking which phase number.

## Step 5: Execute Spec-Driven Development Flow

For each task in the plan:

### 5.1: Before Starting a Task

1. Scan for `> instruction` and `content >> instruction` annotations in plan.md and the current phase-N.md. Apply each and remove the marker. Report what changed.
2. Identify the current phase number from the task's phase header
3. Validate and read `implementation/phase-{N}.md` — stop and report error if missing

### 5.2: Implement the Task

1. Follow the detailed specs in the implementation file precisely
2. Make necessary changes as specified
3. Immediately mark task `[x]` in plan.md
4. Update the registry:
   ```bash
   npx @codevoyant/agent-kit plans update-progress \
     --name "$PLAN_NAME" \
     --completed $COMPLETED \
     --total $TOTAL
   ```

### 5.3: Phase Boundary Actions

When a phase is complete:

1. Run tests using the project's task runner commands from plan metadata
2. If tests fail, fix before proceeding (or document why temporarily broken)
3. Mark phase header `✅` in plan.md
4. Update registry progress
5. If a breakpoint is configured for this phase, pause and report to user

## Step 6: Completion

When all phases are complete:

```bash
npx @codevoyant/agent-kit plans update-progress \
  --name "$PLAN_NAME" \
  --completed $TOTAL \
  --total $TOTAL
npx @codevoyant/agent-kit plans update-status --name "$PLAN_NAME" --status Complete
```

Suggest running `/spec done {plan-name}` to archive the completed plan.

## Step 6.5: Desktop Notification (--bg only)

If `BG_MODE=true` and `SILENT=false`:

```bash
npx @codevoyant/agent-kit notify \
  --title "Claude Code — Spec" \
  --message "{Plan '{plan-name}' complete | Plan '{plan-name}' stopped at Phase {N}}"
```
