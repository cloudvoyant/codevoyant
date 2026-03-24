# list

List all plans with status and progress, or show detailed status for a specific plan.

## Variables

- `PLAN_NAME` — optional; if provided, show detailed single-plan view

## Step 1: Determine Mode

- If `PLAN_NAME` provided → **Single Plan Mode**
- If not provided → **Overview Mode**

---

## Overview Mode

### Step 2: Check for Plans Directory

Check if `.codevoyant/plans/` exists:

- If not found, report: "No plans found. Create one with `/spec new`"
- If found, continue

### Step 3: Read Registry

Auto-migrate from legacy formats if needed, then read plan metadata:

```bash
npx @codevoyant/agent-kit plans migrate
npx @codevoyant/agent-kit plans list --status Active
```

If no plans found in registry:

- Scan `.codevoyant/plans/` for plan directories (exclude `archive/`)
- For each directory found, register it:
  ```bash
  npx @codevoyant/agent-kit plans register \
    --name "$PLAN_NAME" \
    --plugin spec \
    --description "$DESCRIPTION" \
    --total $TOTAL
  ```
- Report: "Registered discovered plans. Verify accuracy with `/spec refresh`."

### Step 4: Parse and Display Plans

For each plan, extract branch and worktree from plan.md:

```bash
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
```

Display:

```
📋 Plans Overview
================

## Active Plans (3)

✅ feature-auth (Executing) 🌿 feature-auth
   Description: Add authentication system
   Progress: ━━━━━━━━━━━━━━━━━━━━ 52% (12/23 tasks)
   Branch: feature-auth | Worktree: .codevoyant/worktrees/feature-auth
   Last Updated: 5 minutes ago
   Commands: /spec go feature-auth | /spec list feature-auth | /spec stop feature-auth

⏸ refactor-api (Paused)
   Description: Refactor API layer
   Progress: ━━━━━━━━━━━━━━━━━━━━ 33% (5/15 tasks)
   Branch: main
   Last Updated: 2 days ago
   Commands: /spec go refactor-api | /spec bg refactor-api

## Archived Plans (2)

✓ feature-login (Completed 2025-02-08)
   Progress: 100% (15/15 tasks)
   Archive: .codevoyant/plans/archive/feature-login-20250208/
```

**Display Rules:**

- Show 🌿 after plan name if branch is set and != "(none)"
- Show worktree on same line as branch if set
- Don't show branch/worktree for archived plans

### Step 5: Quick Actions

```
Quick Actions:
- /spec new       — create new plan
- /spec go <plan> — execute a plan
- /spec list <plan> — detailed status for a plan
- /spec done <plan> — complete and archive a plan
```

---

## Single Plan Mode

### Step 2: Find Plan

Check `.codevoyant/plans/{plan-name}/plan.md` exists. If not, report error and suggest `/spec list` to see available plans.

### Step 3: Read Execution Status

1. Read `.codevoyant/plans/{plan-name}/plan.md` — task completion
2. Read `.codevoyant/plans/{plan-name}/execution-log.md` if exists — execution details
3. Get current status from registry:
   ```bash
   npx @codevoyant/agent-kit plans get --name "$PLAN_NAME"
   ```

Extract branch context:

```bash
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
```

Convert ISO 8601 timestamps to human-friendly format (e.g., "5 minutes ago", "2 days ago").

### Step 4: Display Detailed Status

Show one of the four states (Running / Paused-Errored / Complete / No-Execution) using the same display format as the individual `spec-list` skill — including branch context, progress bar, recent activity, and resume commands updated to `/spec {verb}` syntax.
