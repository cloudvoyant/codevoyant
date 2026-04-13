# clean

Wrap up a session: stop running background agents, archive completed plans to docs, and triage active plans one by one (mark done or cancel).

## Variables

- `PLAN_NAME` — optional; if provided, skip triage and clean only this plan

## Step 1: Load All Plans

Auto-migrate if needed, then load all plans:

```bash
npx @codevoyant/agent-kit plans migrate
npx @codevoyant/agent-kit plans list
```

Parse the JSON into three groups:
- **RUNNING_PLANS** — Active status AND `execution-log.md` contains `Status: RUNNING`
- **SESSION_COMPLETE_PLANS** — Active status AND `execution-log.md` contains `Status: COMPLETE` (background agent finished during this session)
- **ACTIVE_PLANS** — Active or Paused status, not in the above groups

If `PLAN_NAME` is provided, filter all groups to that single plan and skip Step 3.

## Step 2: Stop Any Running Background Agents

For each plan in RUNNING_PLANS, use **AskUserQuestion** (one per plan):

```
question: "Background agent is running on '{plan-name}'. Stop it before cleaning up?"
options:
  - label: "Yes, stop it"
  - label: "Leave it running"
```

If "Yes, stop it":
1. Append `[timestamp] - STOP requested by user` and `Status: STOPPED` to execution-log.md
2. ```bash
   npx @codevoyant/agent-kit plans update-status --name "$PLAN_NAME" --status Active
   ```
3. Move plan to ACTIVE_PLANS for triage

Note: the agent may complete its current task before noticing the stop request.

## Step 3: Complete Session-Finished Plans

If SESSION_COMPLETE_PLANS is non-empty, tell the user:

```
The following plans were completed by a background agent this session:
- {plan-name-1} ({X}/{Y} tasks)
- {plan-name-2} ({X}/{Y} tasks)
```

Use **AskUserQuestion**:

```
question: "Mark these plans complete via agent-kit?"
options:
  - label: "Yes, mark all complete"
  - label: "Review each individually"
  - label: "Skip for now"
```

- "Yes, mark all complete": for each plan, run `npx @codevoyant/agent-kit plans update-status --name "$PLAN_NAME" --status Complete` then `npx @codevoyant/agent-kit plans archive --name "$PLAN_NAME" --status Complete`; add each to the archive pool for doc archiving in Step 4
- "Review each individually": move each to ACTIVE_PLANS for triage in Step 5
- "Skip for now": leave unchanged

## Step 4: Archive Completed Plans to Docs

Get all plans with status Complete or Archived:

```bash
npx @codevoyant/agent-kit plans list --status Complete
```

Also include any plans just archived in Step 3.

If none, skip this step.

Present the list and use **AskUserQuestion**:

```
question: "Archive any completed plans to docs/plan/?"
options:
  - label: "Yes, select plans to archive"
  - label: "No, skip"
```

If "Yes, select plans to archive", use **AskUserQuestion** with checkboxes to let the user pick which plans to archive.

For each selected plan, copy only `plan.md` and `user-guide.md` (skip if either does not exist):

```bash
mkdir -p docs/plan/{plan-name}

# Locate the plan files (may be in active path or archive subdirectory)
PLAN_DIR=".codevoyant/plans/{plan-name}"
if [ ! -d "$PLAN_DIR" ]; then
  PLAN_DIR=$(ls -d .codevoyant/plans/archive/{plan-name}-* 2>/dev/null | tail -1)
fi

[ -f "$PLAN_DIR/plan.md" ] && cp "$PLAN_DIR/plan.md" "docs/plan/{plan-name}/plan.md"
[ -f "$PLAN_DIR/user-guide.md" ] && cp "$PLAN_DIR/user-guide.md" "docs/plan/{plan-name}/user-guide.md"
```

Report which files were copied. Skip silently if neither file exists.

## Step 5: Triage Active Plans

For each plan in ACTIVE_PLANS (one at a time), use **AskUserQuestion**:

```
question: "Plan '{plan-name}' — {status}, {X}% complete ({completed}/{total} tasks). What would you like to do?"
options:
  - label: "Mark done"
    description: "Archive as complete, optionally commit and open a PR"
  - label: "Cancel"
    description: "Archive as abandoned"
  - label: "Skip"
    description: "Leave this plan as-is"
```

**Mark done** → execute `workflows/done.md` for this plan (full done flow: verify completion, commit offer, PR offer, archive)

**Cancel** → confirm via **AskUserQuestion** ("Yes, cancel" / "No, keep it"), then:
```bash
npx @codevoyant/agent-kit plans archive --name "$PLAN_NAME" --status Cancelled
```
Move the plan directory to `.codevoyant/plans/archive/{plan-name}-{YYYYMMDD}/`

**Skip** → continue to next plan

## Step 6: Summary

Report a clean summary of all actions taken:

```
Session clean-up complete.

Stopped  : {list of stopped agents, or "none"}
Completed: {list of plans marked complete, or "none"}
Archived : {list of plans moved to docs/plan/, or "none"}
Cancelled: {list of cancelled plans, or "none"}
Skipped  : {list of skipped plans, or "none"}

Next: /spec new — start a fresh plan
```
