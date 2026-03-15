---
description: Launch a plan hands-free so you can keep working — the agent executes every task autonomously and updates progress in real-time. Use instead of /go whenever you want to stay unblocked. Triggers on keywords like bg, background, run in background, autonomous execution, run plan unattended, hands-free, let the agent handle it, don't wait for me, run without me, execute autonomously, spec bg, run spec in background, spec background.
argument-hint: "[plan-name] [--yes|-y] [--commit|-c] [--silent]"
disable-model-invocation: true
context: fork
agent: spec-executor
model: claude-opus-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Execute the plan in the background using an autonomous agent.

## Flags

- `--yes` or `-y`: Skip all confirmations (auto-create worktree, auto-start execution)
- `--commit` or `-c`: Allow the agent to make git commits during execution (default: commits disabled)
- `--silent`: Suppress desktop notification on completion or failure

## Overview

This command launches a long-running agent that executes your plan autonomously while you continue working. The agent updates progress in real-time and pauses on errors.

## Step 0: Parse Arguments and Flags

Parse command arguments: `/bg [plan-name] [--yes|-y] [--commit|-c] [--silent]`

```bash
# Extract plan name (if provided)
PLAN_NAME="[first non-flag argument]"

# Check for --yes flag
if [[ "$*" =~ --yes|-y ]]; then
  AUTO_APPROVE=true
else
  AUTO_APPROVE=false
fi

# Check for --commit flag (default: NO commits)
if [[ "$*" =~ --commit|-c ]]; then
  ALLOW_COMMITS=true
else
  ALLOW_COMMITS=false
fi

# Check for --silent flag
if [[ "$*" =~ --silent ]]; then
  SILENT=true
else
  SILENT=false
fi
```

## Step 0.5: Select Plan

If plan name not provided in arguments:

If not provided:
1. Read `.codevoyant/plans/README.md` to get all active plans with Last Updated timestamps
2. Sort plans by Last Updated (most recent first)
3. If only one plan exists, auto-select it
4. If multiple plans exist, use `AskUserQuestion` to present the list (name, progress %, last-updated) and ask the user to choose. Example prompt: "Which plan would you like to work on?\n  (1) feature-auth — 60% — updated 2h ago\n  (2) refactor-api — 20% — updated 1d ago"
5. Report to user: "Using plan: {plan-name} (last updated: {timestamp})"
6. If no plans exist, inform user to create with `/new`

## Step 1: Verify Plan Exists

1. Check that `.codevoyant/plans/{plan-name}/plan.md` exists
2. If not found, inform user to create one with `/new` or `/init`

## Step 2: Analyze Plan Scope

Read `.codevoyant/plans/{plan-name}/plan.md` and report:

1. Total number of phases
2. Total number of tasks
3. Starting point (first unchecked task)
4. Estimated complexity

Example:

```
Plan: {plan-name} - Authentication System
- 4 phases, 23 tasks
- Starting from: Phase 1, Task 1
- Complexity: Medium (has test requirements)
```

## Step 2.5: Validate and Setup Worktree Context

Handle worktree-based execution automatically:

```bash
# Get current branch and working directory
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
CURRENT_DIR=$(pwd)

# Parse plan metadata
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')

# Determine worktree status
if [ -n "$PLAN_WORKTREE" ] && [ "$PLAN_WORKTREE" != "(none)" ]; then
  # Plan has worktree specified
  if [ -d "$PLAN_WORKTREE" ]; then
    WORKTREE_EXISTS=true
  else
    WORKTREE_EXISTS=false
  fi
else
  # No worktree for this plan
  WORKTREE_EXISTS=""
fi
```

**Case 1: Worktree exists → Auto-execute there**

If `WORKTREE_EXISTS=true`:
```
✓ Plan has worktree at: $PLAN_WORKTREE
→ Executing in worktree automatically...
```

Then **continue to Step 3** with this context:
- Set execution directory to `$PLAN_WORKTREE`
- When launching agent (Step 6), pass worktree path as working directory
- Agent will execute in worktree isolation
- No manual cd required!

**Case 2: Worktree specified but doesn't exist → Offer to create**

If `WORKTREE_EXISTS=false`:

**If AUTO_APPROVE is true:**
- Automatically create worktree without asking
- Report: `→ Auto-creating worktree with --yes flag`
- Create worktree: `git worktree add -b "$PLAN_BRANCH" "$PLAN_WORKTREE" HEAD`
- Update .gitignore if needed
- Report: `✓ Created worktree at $PLAN_WORKTREE`
- Set execution directory to `$PLAN_WORKTREE`
- Continue to Step 3

**If AUTO_APPROVE is false:**

Use **AskUserQuestion** tool:
```
question: "This plan needs worktree '$PLAN_WORKTREE' (branch: $PLAN_BRANCH) but it doesn't exist. Create it now?"
header: "Worktree Setup"
multiSelect: false
options:
  - label: "Create worktree and execute"
    description: "Create worktree at $PLAN_WORKTREE, then start execution there"
  - label: "Execute here anyway"
    description: "Skip worktree, execute in current directory (may cause issues)"
  - label: "Cancel"
    description: "Don't execute, let me set it up manually"
```

**Handle response:**

- **"Create worktree and execute"**:
  1. Create worktree: `git worktree add -b "$PLAN_BRANCH" "$PLAN_WORKTREE" HEAD`
  2. Update .gitignore if needed
  3. Report: `✓ Created worktree at $PLAN_WORKTREE`
  4. Set execution directory to `$PLAN_WORKTREE`
  5. Continue to Step 3

- **"Execute here anyway"**:
  - Warn: `⚠️  Executing without worktree - changes will affect current branch`
  - Continue to Step 3 (execute in current directory)

- **"Cancel"**:
  - Exit command

**Case 3: No worktree for plan → Execute in current directory**

If plan has no worktree (`PLAN_WORKTREE` is "(none)" or empty):
- Check if branch matches (if `PLAN_BRANCH` specified)
- If branch mismatch, offer to switch: `git checkout $PLAN_BRANCH`
- Otherwise continue to Step 3 normally

**Summary:**
- Worktree exists → Execute there automatically ✅
- Worktree missing → Offer to create ✅
- No worktree → Execute here (with branch check) ✅
- All seamless, no manual cd required! ✅

## Step 3: Validate Implementation Files

Before starting execution, verify all implementation files exist:

1. **Count phases** in plan.md:
   - Parse `.codevoyant/plans/{plan-name}/plan.md`
   - Count lines matching: `^### Phase (\d+)`
   - Store total phase count

2. **Check each implementation file** exists:
   - For phase 1 to total phases:
     - Check `.codevoyant/plans/{plan-name}/implementation/phase-{N}.md` exists
     - Check file size > 100 bytes (not empty)

3. **If any files missing:**
   ```
   ❌ Cannot start execution - implementation files missing!

   Missing implementation files:
   - phase-3.md
   - phase-5.md

   Implementation files are required for all phases before execution.
   These files should have been created during /spec:new.

   To fix:
   1. Create the missing files in .codevoyant/plans/{plan-name}/implementation/
   2. Use the template structure from /spec:new Step 5.5
   3. Or recreate the plan with /spec:new

   Cannot proceed with background execution.
   ```

   Exit and do not continue to Step 4.

4. **If all files exist:**
   - Report validation success:
   ```
   ✓ Validated {N} implementation files (phase-1.md through phase-{N}.md)
   ```
   - Continue to Step 4

## Step 4: Confirm Background Execution

**If AUTO_APPROVE is true:**
- Skip confirmation
- Report: `→ Starting background execution with --yes flag`
- Proceed directly to Step 5

**If AUTO_APPROVE is false:**

Use **AskUserQuestion** tool:

```
question: "Start background execution for plan '{plan-name}' (X phases, Y tasks)?"
header: "Background Execution"
multiSelect: false
options:
  - label: "Start execution"
    description: "Launch autonomous agent to execute all tasks"
  - label: "Cancel"
    description: "Don't start, return to prompt"
```

Inform user about capabilities:
```
The agent will:
✓ Execute all tasks autonomously
✓ Update plan.md checkboxes in real-time
✓ Run tests at phase boundaries
✓ Pause on errors (preserving state)
✓ Create execution log in .codevoyant/plans/{plan-name}/execution-log.md
[if ALLOW_COMMITS=false] ⚠️  Will NOT commit changes (pass --commit to enable git commits)
[if ALLOW_COMMITS=true]  ✓ Will commit changes as tasks complete

You can:
- Check progress anytime with /status {plan-name}
- Stop execution with /stop {plan-name}
- Continue other work while it runs
```

## Step 5: Initialize Execution Tracking

1. Create or clear `.codevoyant/plans/{plan-name}/execution-log.md`:

```markdown
# Execution Log - {plan-name}

Started: [timestamp]
Plan: [plan objective]
Status: RUNNING

## Progress
- Current Phase: [phase name]
- Completed Tasks: 0/[total]
- Errors: 0

## Timeline
[timestamp] - Execution started
```

2. Update `.codevoyant/plans/README.md`:
   - Set status to "Executing"
   - Update last updated timestamp

3. Optionally add execution status to plan.md Insights section (if it exists):

```markdown
## Insights

### Background Execution
- Status: RUNNING
- Started: [timestamp]
- Check progress: /status {plan-name}
- Stop execution: /stop {plan-name}
```

## Step 6: Launch Background Agent

**Determine execution directory:**
```bash
# If worktree exists and should be used (from Step 2.5)
if [ "$WORKTREE_EXISTS" = "true" ] && [ -d "$PLAN_WORKTREE" ]; then
  EXECUTION_DIR="$PLAN_WORKTREE"
  EXECUTION_MODE="worktree"
else
  EXECUTION_DIR=$(pwd)
  EXECUTION_MODE="current"
fi
```

**Important:** Before launching agent, change to execution directory:
```bash
cd "$EXECUTION_DIR"
```

Use the Task tool to spawn a `spec-executor` agent for each phase in sequence:

```
TaskCreate:
  subagent_type: spec-executor
  description: "spec-executor: Phase {N} — {phase-name}"
  prompt: [agent-prompt.md content with variables substituted]
```

Read `references/agent-prompt.md` and substitute `{EXECUTION_DIR}`, `{PLAN_BRANCH}`, `{PLAN_WORKTREE}`, `{ALLOW_COMMITS}`, `{SILENT}`, and `{plan-name}` with their actual values before passing as the prompt.

**Orchestration loop — for each phase:**
1. Launch phase Task (spec-executor) with the substituted prompt
2. Wait for completion: `TaskOutput` (block=true)
3. Parse the agent's summary report
4. **Orchestrator writes a phase summary to execution-log.md** (reliable fallback):
   ```
   [{timestamp}] ORCHESTRATOR: Phase {N} — {phase-name} summary
     Status: {COMPLETE | FAILED | PARTIAL}
     Agent report: {first 3 lines of agent summary}
   ```
5. If phase failed: stop loop, send failure notification (see below), report to user
6. If phase succeeded: continue to Phase N+1

**After the loop completes** (all phases done OR a phase failed), send a desktop notification unless `SILENT=true`. Use the Bash tool to run:

```bash
if [ "$SILENT" != "true" ]; then
  _NOTIFY_SCRIPT=""
  for _c in \
    "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/dev/scripts/notify.sh" \
    "$HOME/.claude/plugins/dev/scripts/notify.sh"; do
    [ -f "$_c" ] && _NOTIFY_SCRIPT="$_c" && break
  done
  if [ -n "$_NOTIFY_SCRIPT" ]; then
    bash "$_NOTIFY_SCRIPT" "Claude Code — Spec" "{ALL_DONE: Plan '{plan-name}' complete ✅ | FAILED: Plan '{plan-name}' stopped at Phase {N} ❌}"
  else
    case "${OSTYPE:-}" in
      darwin*) osascript -e 'display notification "{message}" with title "Claude Code — Spec" sound name "default"' 2>/dev/null ;;
      linux*)  notify-send "Claude Code — Spec" "{message}" 2>/dev/null || printf '\a' ;;
      msys*|cygwin*) powershell.exe -WindowStyle Hidden -Command "msg '%username%' '{message}'" 2>/dev/null || printf '\a' ;;
      *) grep -qi microsoft /proc/version 2>/dev/null && powershell.exe -WindowStyle Hidden -Command "msg '%username%' '{message}'" 2>/dev/null || printf '\a' ;;
    esac
  fi
fi
```

## Step 7: Notify User

After launching all phases:

```
✓ Background execution started for plan "{plan-name}"!

Agent is now working through your plan autonomously.

Monitor progress:
- /status {plan-name} - Check current progress
- /status - View all plans overview
- Watch .codevoyant/plans/{plan-name}/plan.md - See checkboxes update in real-time
- View .codevoyant/plans/{plan-name}/execution-log.md - See detailed execution log

Control execution:
- /stop {plan-name} - Halt execution gracefully
- /pause {plan-name} - Same as /stop (saves state)

You will receive a desktop notification when execution completes or fails.
(Suppress with --silent)
```

## Notes

- The background agent works independently - you can continue chatting
- Progress is saved continuously in .codevoyant/plans/{plan-name}/plan.md and README.md
- If the agent encounters errors, it will pause and preserve state
- Resume with `/bg {plan-name}` again or use `/go {plan-name}` for interactive execution
- Check execution status anytime with `/status {plan-name}` or `/status` for all plans
