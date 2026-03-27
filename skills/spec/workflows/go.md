# go

Execute the plan in the background using an autonomous agent. The agent works through every phase without interruption while you continue working.

## Variables

- `PLAN_NAME` — plan to execute (may be empty; will prompt if multiple plans exist)
- `AUTO_APPROVE` — true if `--yes` or `-y` present
- `ALLOW_COMMITS` — true if `--commit` or `-c` present
- `SILENT` — true if `--silent` present

## Step 1: Select Plan

If `PLAN_NAME` not provided:

1. ```bash
   npx @codevoyant/agent-kit plans migrate
   npx @codevoyant/agent-kit plans list --status Active
   ```
2. Sort by Last Updated (most recent first)
3. If only one plan exists, auto-select it
4. If multiple plans exist, use `AskUserQuestion` to present list
5. If no plans exist, inform user to create with `/spec new`

## Step 2: Analyze Plan Scope

Read `.codevoyant/plans/{plan-name}/plan.md` and report total phases, total tasks, starting point, and estimated complexity.

## Step 2.5: Validate and Setup Worktree Context

Parse plan metadata:

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
```

- **Worktree exists** → set `EXECUTION_DIR=$PLAN_WORKTREE`, report and continue
- **Worktree specified but missing** → if `AUTO_APPROVE`, create it automatically; otherwise use AskUserQuestion (create / execute here anyway / cancel)
- **No worktree** → execute in current directory; if branch mismatch, offer to switch

## Step 3: Validate Implementation Files

Count phases in plan.md (lines matching `^### Phase (\d+)`). Store `HAS_PHASE_0`.

For phases 1 through N, check `.codevoyant/plans/{plan-name}/implementation/phase-{N}.md` exists and is > 100 bytes. Phase 0 has no implementation file — skip it.

If any files missing, report them and exit without launching.

## Step 4: Confirm Background Execution

If `AUTO_APPROVE=true`, skip confirmation and proceed.

Otherwise use **AskUserQuestion**:

```
question: "Start background execution for '{plan-name}'? ({N} phases, {M} tasks)\n\nThe agent will:\n✓ Execute all tasks autonomously\n✓ Update plan.md checkboxes in real-time\n✓ Run tests at phase boundaries\n✓ Pause on errors\n{ALLOW_COMMITS=false: ⚠️ Will NOT commit | ALLOW_COMMITS=true: ✓ Will commit}"
header: "Start execution?"
options:
  - label: "Start execution"
  - label: "Cancel"
```

## Step 5: Initialize Execution Tracking

Create or clear `.codevoyant/plans/{plan-name}/execution-log.md` with initial state (Status: RUNNING, timestamp, plan objective).

```bash
npx @codevoyant/agent-kit plans update-status --name "$PLAN_NAME" --status Executing
```

## Step 6: Launch Background Agent

Determine `EXECUTION_DIR` (worktree path or current directory).

**Phase 0 gate:** If `HAS_PHASE_0=true` and any Phase 0 tasks are unchecked, stop and list them. Do not launch any executor agents.

**Orchestration loop** — for each phase starting at Phase 1:

1. Spawn `spec-executor` agent (see `agents/spec-executor.md`) with `EXECUTION_DIR`, `PLAN_BRANCH`, `PLAN_WORKTREE`, `ALLOW_COMMITS`, `SILENT`, and `PLAN_NAME` substituted into the prompt
2. Wait for completion (`TaskOutput` block=true)
3. Write phase summary to execution-log.md
4. If phase failed: stop loop, send failure notification, report to user
5. If phase succeeded: continue to Phase N+1

After loop completes, send desktop notification unless `SILENT=true`:

```bash
npx @codevoyant/agent-kit notify \
  --title "Claude Code — Spec" \
  --message "{Plan '{plan-name}' complete | Plan '{plan-name}' stopped at Phase {N}}"
```

## Step 7: Confirm Launch

```
✓ Background execution started for plan "{plan-name}"!

Monitor progress:
- /spec clean {plan-name} — check status, stop, or wrap up

You will receive a desktop notification when execution completes or fails.
```
