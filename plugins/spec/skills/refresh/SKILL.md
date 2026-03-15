---
description: Review an existing spec plan and update checklist status and phase markers. Proactively use before reporting plan status, after completing tasks, or whenever the user asks about plan progress. Triggers on keywords like refresh plan, update plan status, sync plan, plan progress, spec refresh, spec list.
argument-hint: "[plan-name]"
disable-model-invocation: true
model: claude-haiku-4-5-20251001
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


## Step 0: Select Plan

Check for plan name argument: `/refresh plan-name`

If not provided:

1. Read `.codevoyant/plans/README.md` to get all active plans with Last Updated timestamps
2. Sort plans by Last Updated (most recent first)
3. If only one plan exists, auto-select it
4. If multiple plans exist, use `AskUserQuestion` to present the list (name, progress %, last-updated) and ask the user to choose. Example prompt: "Which plan would you like to work on?\n  (1) feature-auth — 60% — updated 2h ago\n  (2) refactor-api — 20% — updated 1d ago"
5. Report to user: "Refreshing plan: {plan-name} (last updated: {timestamp})"
6. If no plans exist, inform user to create with `/new`

## Step 1: Read Current Plan

Read `.codevoyant/plans/{plan-name}/plan.md` and analyze:

- The objective and overall scope
- All phases and their tasks
- Current completion status (checked vs unchecked tasks)
- Phase completion markers (✅)

**Extract Branch Context:**

```bash
# Parse plan metadata to extract branch and worktree
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
```

Store these values for use in reporting.

## Step 2: Verify Checklist Status

For each phase:

1. Count checked `[x]` vs unchecked `[ ]` tasks
2. Verify phase has ✅ marker if and only if all tasks are complete
3. Report any inconsistencies

## Step 3: Update Phase Markers

If status is inconsistent:

- Add ✅ to phase headers where all tasks are complete
- Remove ✅ from phase headers where tasks remain incomplete
- Update `.codevoyant/plans/{plan-name}/plan.md` with corrections

## Step 4: Update README and Report Status

After updating plan.md, also update `.codevoyant/plans/README.md`:

- Update progress stats (X/Y tasks, completion %)
- Update last updated timestamp
- If plan is fully complete (100%), optionally update status field to indicate completion

Provide a summary:

```
Plan Status: {plan-name}

Branch Context:
- Plan Branch: {PLAN_BRANCH or "(none)"}
- Current Branch: {CURRENT_BRANCH}
{if PLAN_BRANCH != CURRENT_BRANCH and PLAN_BRANCH != "(none)"}
⚠️  Warning: You're on '{CURRENT_BRANCH}' but plan is for '{PLAN_BRANCH}'
{endif}
{if PLAN_WORKTREE != "(none)"}
- Worktree: {PLAN_WORKTREE}
{endif}

Progress:
- Phase 1 - Setup Infrastructure: 5/5 complete ✅
- Phase 2 - Core Features: 3/7 complete (in progress)
- Phase 3 - Testing: 0/4 complete (not started)

Overall: 8/16 tasks complete (50%)

{if markers changed}Updated {N} phase marker(s) to reflect current status.{else}All markers already correct — no changes needed.{endif}
```

If branch mismatch warning shown, add suggestion:

```
Tip: Switch to plan's branch with: git checkout {PLAN_BRANCH}
{if PLAN_WORKTREE != "(none)"}
Or work in worktree: cd {PLAN_WORKTREE}
{endif}
```

If the plan is fully complete, report completion:

```
Plan "{plan-name}" Status: All phases complete! ✅

Overall: 16/16 tasks complete (100%)

The plan is complete. Next steps:
- Run /done {plan-name} to archive this plan
- Use /new to start a new plan
```
