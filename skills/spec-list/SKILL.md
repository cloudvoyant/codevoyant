---
description: 'Use when checking active plans and their progress. Triggers on: "show plans", "what plans do I have", "spec list", "plan status", "list specs", "what am I working on", "check progress", "what''s running". Shows status, completion percentage, and current phase for each plan. Pass a plan name for detailed single-plan view.'
name: spec:list
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
argument-hint: '[plan-name]'
model: claude-haiku-4-5-20251001
---

List all plans with status and progress, or show detailed status for a specific plan.

## Step 0: Determine Mode

Check for plan name argument:

- If provided → **Single Plan Mode** (detailed status for that plan)
- If not provided → **Overview Mode** (all plans)

## Overview Mode

### Step 1: Check for Plans Directory

Check if `.codevoyant/plans/` exists:

- If not found, report: "No plans found. Create one with /new"
- If found, continue

### Step 2: Read Registry

Auto-migrate from legacy formats if needed, then read plan metadata:

```bash
# Auto-migrate from spec.json or plans.json if needed
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
- Report: "Registered discovered plans. Verify accuracy with /refresh."

### Step 3: Parse and Display Plans

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
   Commands: /go feature-auth | /list feature-auth | /stop feature-auth

⏸ refactor-api (Paused)
   Description: Refactor API layer
   Progress: ━━━━━━━━━━━━━━━━━━━━ 33% (5/15 tasks)
   Branch: main
   Last Updated: 2 days ago
   Commands: /go refactor-api | /bg refactor-api

📝 add-tests (Active) 🌿 feature-tests
   Description: Add comprehensive test coverage
   Progress: ━━━━━━━━━━━━━━━━━━━━ 10% (2/20 tasks)
   Branch: feature-tests | Worktree: .codevoyant/worktrees/feature-tests
   Last Updated: 1 hour ago
   Commands: /go add-tests | /bg add-tests

## Archived Plans (2)

✓ feature-login (Completed 2025-02-08)
   Progress: 100% (15/15 tasks)
   Archive: .codevoyant/plans/archive/feature-login-20250208/

✓ fix-bug-123 (Completed 2025-02-05)
   Progress: 100% (5/5 tasks)
   Archive: .codevoyant/plans/archive/fix-bug-123-20250205/
```

**Display Rules:**

- Show 🌿 after plan name if branch is set and != "(none)"
- Show worktree on same line as branch if set
- Don't show branch/worktree for archived plans

### Step 4: Quick Actions

```
Quick Actions:
- /new - Create new plan
- /go <plan> - Execute a plan
- /list <plan> - Detailed status for a plan
- /done <plan> - Complete and archive a plan
```

---

## Single Plan Mode

### Step 1: Find Plan

Check `.codevoyant/plans/{plan-name}/plan.md` exists. If not, report error and suggest `/list` to see available plans.

### Step 2: Read Execution Status

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

Convert ISO 8601 timestamps to human-friendly format (e.g., "5 minutes ago", "2 days ago", "Feb 10, 2026").

### Step 3: Display Detailed Status

#### If Execution is Running:

```
Background Execution: RUNNING ⚙️

Plan: {plan-name}
Started: 2 hours ago | Last Update: 2 minutes ago

Branch: {PLAN_BRANCH} 🌿 {if CURRENT_BRANCH == PLAN_BRANCH}✓{else}⚠️ (you're on {CURRENT_BRANCH}){endif}
{if PLAN_WORKTREE != "(none)"}Worktree: {PLAN_WORKTREE}{endif}

Progress: ━━━━━━━━━━━━━━━━━━━━ 65%
- Completed: 15/23 tasks | Phases: 2/4 complete ✅

Current: Phase 3 - Testing ⚙️
Current Task: Write integration tests for OAuth flow

Recent Activity:
✓ 14:45 - Configure OAuth providers
✓ 15:02 - Implement token refresh
⚙️ 15:15 - Write integration tests (in progress)

Commands:
- /stop {plan-name} - Halt execution
```

#### If Execution is Paused/Errored:

```
Background Execution: PAUSED ⚠️

Plan: {plan-name}
Paused: 5 minutes ago | Error at: Phase 2, Task 3

Branch: {PLAN_BRANCH} 🌿
{if PLAN_WORKTREE != "(none)"}Worktree: {PLAN_WORKTREE}{endif}

Progress: ━━━━━━━━━━━━━━━━━━━━ 45%
- Completed: 10/23 tasks | Phases: 1/4 complete ✅

Error: [error from execution-log.md]

Next Steps:
1. Review .codevoyant/plans/{plan-name}/execution-log.md
2. Fix the issue manually
3. Resume with /bg {plan-name} or /go {plan-name}
```

#### If Execution is Complete:

```
Background Execution: COMPLETED ✅

Plan: {plan-name}
Completed: just now | Duration: 3h 15m

Progress: ━━━━━━━━━━━━━━━━━━━━ 100%
- Completed: 23/23 tasks | Phases: 4/4 complete ✅

Next Steps:
- Review changes
- Run /done {plan-name} to archive
```

#### If No Background Execution:

```
Plan: {plan-name} — {status from README}

Branch: {PLAN_BRANCH} 🌿 {if CURRENT_BRANCH != PLAN_BRANCH}⚠️ (you're on {CURRENT_BRANCH}){endif}
{if PLAN_WORKTREE != "(none)"}Worktree: {PLAN_WORKTREE}{endif}

Progress: ━━━━━━━━━━━━━━━━━━━━ {pct}%
- Completed: {done}/{total} tasks | Phases: {phases_done}/{phases_total} complete

Current Task: [first unchecked task]
Last Updated: [relative timestamp]

Commands:
- /go {plan-name} - Execute interactively
- /bg {plan-name} - Execute in background
```
