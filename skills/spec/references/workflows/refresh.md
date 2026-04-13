# refresh

Update checklist status and phase markers in a plan to reflect actual completion.

## Variables

- `PLAN_NAME` — plan to refresh (may be empty; will prompt if multiple plans exist)
- `BG_MODE` — true if `--bg` present
- `SILENT` — true if `--silent` present

## Step 1: Select Plan

If `PLAN_NAME` not provided:

1. ```bash
   npx @codevoyant/agent-kit plans migrate
   npx @codevoyant/agent-kit plans list --status Active
   ```
2. Sort by Last Updated (most recent first)
3. If only one plan exists, auto-select it
4. If multiple plans exist, use `AskUserQuestion` to present list (name, progress %, last-updated)
5. If no plans exist, inform user to create with `/spec new`

Report: "Refreshing plan: {plan-name}"

## Step 2: Read Current Plan

Read `.codevoyant/plans/{plan-name}/plan.md` and analyze:

- All phases and their tasks
- Current completion status (checked vs unchecked tasks)
- Phase completion markers (✅)

**Extract Branch Context:**

```bash
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
```

## Step 3: Verify Checklist Status

For each phase:

1. Count checked `[x]` vs unchecked `[ ]` tasks
2. Verify phase has ✅ marker if and only if all tasks are complete
3. Report any inconsistencies

## Step 4: Update Phase Markers

If status is inconsistent:

- Add ✅ to phase headers where all tasks are complete
- Remove ✅ from phase headers where tasks remain incomplete
- Update `.codevoyant/plans/{plan-name}/plan.md` with corrections

## Step 5: Update Registry and Report

```bash
npx @codevoyant/agent-kit plans update-progress \
  --name "$PLAN_NAME" \
  --completed $COMPLETED \
  --total $TOTAL
```

If plan is fully complete (100%):

```bash
npx @codevoyant/agent-kit plans update-status --name "$PLAN_NAME" --status Complete
```

Provide a summary showing branch context, per-phase progress, overall %, and whether markers were corrected.

If `PLAN_BRANCH != CURRENT_BRANCH` and `PLAN_BRANCH != "(none)"`, show branch mismatch warning.

## Step 5.5: Desktop Notification (--bg only)

If `BG_MODE=true` and `SILENT=false`:

```bash
npx @codevoyant/agent-kit notify \
  --title "Claude Code — Spec" \
  --message "Plan '{plan-name}' refreshed — {completed}/{total} tasks complete"
```
