---
description: Stop a running background agent OR pause a plan and capture session insights. Proactively suggest when a user says they're stopping work, switching tasks, halting execution, or ending a session. Triggers on keywords like stop plan, halt execution, stop background agent, pause plan, save insights, take a break, save progress, cancel execution, stop spec, pause spec.
argument-hint: "[plan-name]"
disable-model-invocation: true
model: claude-haiku-4-5-20251001
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Stop a running background agent or pause manual work and capture session insights.

## Step 0: Select Plan

If argument provided: use that plan.

If no argument:
1. Read `.codevoyant/plans/README.md` to get all active plans
2. If no plans exist, report error
3. If only one plan, auto-select it
4. If multiple plans, use **AskUserQuestion tool**:
   ```
   question: "Which plan do you want to stop/pause?"
   header: "Stop or Pause Plan"
   options:
     - label: "feature-auth (52% - Executing) 🌿 feature-auth"
       description: "Background agent running | Started 30 minutes ago"
     - label: "refactor-api (33% - Active)"
       description: "No active agent"
   ```

## Step 1: Detect Execution State

Extract branch context:

```bash
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
```

Check `.codevoyant/plans/{plan-name}/execution-log.md` for `Status: RUNNING`:
- Found → `AGENT_RUNNING=true` → continue to **Step 2a**
- Not found → `AGENT_RUNNING=false` → continue to **Step 2b**

## Step 2a: Stop Background Agent (AGENT_RUNNING=true)

Use **AskUserQuestion** tool:
```
question: "Stop background execution for plan '{plan-name}'?"
header: "Stop Execution"
multiSelect: false
options:
  - label: "Stop execution"
    description: "Halt agent gracefully, save progress, can resume later"
  - label: "Let it continue"
    description: "Keep execution running"
```

Inform user:
```
Plan: {plan-name} 🌿 {PLAN_BRANCH}
{if PLAN_WORKTREE != "(none)"}Worktree: {PLAN_WORKTREE}{endif}

Progress will be saved:
✓ All completed tasks remain checked
✓ Current state preserved in plan.md
✓ Execution log saved
✓ Resume later with /bg {plan-name} or /go {plan-name}
```

If confirmed:

1. Update `.codevoyant/plans/{plan-name}/execution-log.md`:
   ```
   [timestamp] - STOP requested by user
   Status: STOPPED
   ```

2. Update `.codevoyant/plans/README.md`: change status from "Executing" to "Active"

3. Update plan.md Insights section (if exists):
   ```markdown
   ### Background Execution
   - Status: STOPPED
   - Stopped: [timestamp]
   - Resume with: /bg {plan-name} or /go {plan-name}
   ```

4. Append to execution-log.md:
   ```markdown
   ## Execution Stopped

   Stopped At: [timestamp]
   Duration: [time since start]

   Progress:
   - Completed: {completed}/{total} tasks ({pct}%)
   - Phases Complete: {phases_done}/{phases_total}
   - Last Completed Task: [task name]
   - Next Task: [next unchecked task]
   ```

Report:
```
✓ Background execution stopped for plan "{plan-name}"

Branch: {PLAN_BRANCH} 🌿
{if CURRENT_BRANCH != PLAN_BRANCH}⚠️  Branch mismatch — switch with: git checkout {PLAN_BRANCH}{endif}
{if PLAN_WORKTREE != "(none)"}Worktree: {PLAN_WORKTREE}{endif}

Progress saved: {completed}/{total} tasks ({pct}%)

Resume when ready:
- /bg {plan-name} - Continue in background
- /go {plan-name} - Continue interactively
```

Note: The background agent may complete its current task before noticing the stop request.

## Step 2b: Capture Session Insights (AGENT_RUNNING=false)

No background agent is running. Capture insights from the current work session and mark the plan as paused.

Read `.codevoyant/plans/{plan-name}/plan.md` to understand current progress.

Generate a comprehensive "## Insights" section covering:

1. **Progress Summary** — what's accomplished, which phases are complete/in-progress, completion %
2. **Key Decisions Made** — choices made, rationale, trade-offs
3. **Context and Findings** — codebase discoveries, dependencies, constraints
   - Include branch context: Plan is for branch `{PLAN_BRANCH}` {if PLAN_BRANCH != CURRENT_BRANCH}(currently on `{CURRENT_BRANCH}`){endif}
4. **Next Steps** — what to do when resuming, current task/phase, blockers
5. **Notes** — tips for picking up later, references to relevant files

Add or update the "## Insights" section at the end of `.codevoyant/plans/{plan-name}/plan.md`:

```markdown
## Insights

Last Updated: {ISO 8601 timestamp}

Progress: {current phase} in progress ({N}/{total} tasks complete, {pct}%)

Branch Context:
- Plan Branch: {PLAN_BRANCH}
- Current Branch: {CURRENT_BRANCH}
{if PLAN_WORKTREE != "(none)"}- Worktree: {PLAN_WORKTREE}{endif}
{if PLAN_BRANCH != CURRENT_BRANCH}- ⚠️  Switch before resuming: git checkout {PLAN_BRANCH}{endif}

Key Decisions:
- [decisions made this session]

Context:
- [discoveries and findings]

Next Steps:
- [what to do next when resuming]

Notes:
- [any other useful context]
```

Update `.codevoyant/plans/README.md`:
- Set status to "Paused"
- Update last updated timestamp

Report:
```
Plan "{plan-name}" paused with session insights captured.

Insights saved to: .codevoyant/plans/{plan-name}/plan.md
Status: Paused

Resume when ready:
- /go {plan-name} - Continue interactively
- /bg {plan-name} - Continue in background
```
