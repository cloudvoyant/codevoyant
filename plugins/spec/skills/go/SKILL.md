---
description: Execute or continue a spec plan interactively with configurable breakpoints. Prefer this over ad-hoc task execution whenever a spec plan is active. Triggers on keywords like go, execute plan, run plan, continue plan, work on plan, start plan, spec go, run the spec, execute the spec, work on the spec.
argument-hint: "[plan-name]"
disable-model-invocation: true
context: fork
agent: spec-executor
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Execute or continue the existing plan using spec-driven development.

## Overview

This command executes your plan interactively, with configurable breakpoints for user review. For fully autonomous background execution, use `/bg` instead.

## Step 0: Select Plan

Check for plan name argument: `/go plan-name`

If not provided, run plan selection logic:
1. Read `.codevoyant/plans/README.md` to get all active plans with Last Updated timestamps
2. Sort plans by Last Updated (most recent first)
3. If only one plan exists, auto-select it
4. If multiple plans exist, use `AskUserQuestion` to present the list (name, progress %, last-updated) and ask the user to choose. Example prompt: "Which plan would you like to work on?\n  (1) feature-auth — 60% — updated 2h ago\n  (2) refactor-api — 20% — updated 1d ago"
5. Report to user: "Using plan: {plan-name} (last updated: {timestamp})"
6. If no plans exist, inform user to create with `/new`

## Step 1: Read and Analyze Plan

Read `.codevoyant/plans/{plan-name}/plan.md` to understand:

- The objective and full scope
- All phases and their tasks
- Current progress (what's checked vs unchecked)
- Any insights from previous sessions

**Validate Plan Structure:**
- Check phase headers match format: `### Phase \d+ - .+` (e.g., "### Phase 1 - Setup")
- Check task format: `\d+\. \[(x| )\] .+` (e.g., "1. [ ] Task name")
- Verify phase numbers are sequential (1, 2, 3...)
- If validation fails, warn user and suggest using `/refresh` to check structure

## Step 1.5: Validate and Setup Worktree Context

Handle worktree-based execution automatically (same as /spec:bg):

```bash
# Get current branch and working directory
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
CURRENT_DIR=$(pwd)

# Parse plan metadata
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')

# Determine worktree status
if [ -n "$PLAN_WORKTREE" ] && [ "$PLAN_WORKTREE" != "(none)" ]; then
  if [ -d "$PLAN_WORKTREE" ]; then
    WORKTREE_EXISTS=true
  else
    WORKTREE_EXISTS=false
  fi
else
  WORKTREE_EXISTS=""
fi
```

**Case 1: Worktree exists → Auto-execute there**

If `WORKTREE_EXISTS=true`:
```
✓ Plan has worktree at: $PLAN_WORKTREE
→ Executing in worktree automatically...
```

Change to worktree directory and continue:
```bash
cd "$PLAN_WORKTREE"
```

All subsequent file operations will happen in worktree context.

**Case 2: Worktree specified but doesn't exist → Offer to create**

If `WORKTREE_EXISTS=false`:

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
  4. Change to worktree: `cd "$PLAN_WORKTREE"`
  5. Continue to Step 2

- **"Execute here anyway"**:
  - Warn: `⚠️  Executing without worktree - changes will affect current branch`
  - Continue to Step 2 (execute in current directory)

- **"Cancel"**:
  - Exit command

**Case 3: No worktree for plan → Execute in current directory**

If plan has no worktree (`PLAN_WORKTREE` is "(none)" or empty):
- Check if branch matches (if `PLAN_BRANCH` specified)
- If branch mismatch, offer to switch: `git checkout $PLAN_BRANCH`
- Otherwise continue to Step 2 normally

**Result:**
- Worktree exists → Execute there automatically ✅
- Worktree missing → Offer to create ✅
- No worktree → Execute here (with branch check) ✅
- Seamless workflow, no manual steps! ✅

## Step 2: Determine Starting Point

1. Find the first unchecked task in the earliest incomplete phase
2. Report where execution will begin

Example:

```
Starting execution from Phase 2 - OAuth Integration
Next task: Configure OAuth providers (Google, GitHub)
```

## Step 2.5: Validate Implementation Files

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

   Cannot proceed with execution.
   ```

   Exit and do not continue to Step 3.

4. **If all files exist:**
   - Report validation success:
   ```
   ✓ Validated {N} implementation files (phase-1.md through phase-{N}.md)
   ```
   - Continue to Step 3

## Step 3: Set Breakpoints

Use **AskUserQuestion** tool to configure breakpoints:

```
question: "Should Claude take breaks during execution for your review?"
header: "Breakpoints"
multiSelect: false
options:
  - label: "None (Fully autonomous)"
    description: "Execute entire plan without stopping. Only pause on errors."
  - label: "After every phase"
    description: "Stop after each phase completes for review"
  - label: "After specific phase"
    description: "Stop after a specific phase number (will ask which one)"
```

If user selects "After specific phase", follow up with another AskUserQuestion asking which phase number.

Note the breakpoint selection in the execution plan (no need to edit plan.md)

## Step 4: Execute Spec-Driven Development Flow

For each task in the plan, follow this workflow:

### 4.1: Before Starting a Task

1. **Apply any pending annotations** in plan files before reading task state:

   Scan for `> instruction` (standalone lines) and `content >> instruction` (inline suffixes) in both `plan.md` and the current `implementation/phase-{N}.md`. Apply each one and remove the marker. This lets the user leave corrections mid-execution by editing plan files directly — they're picked up automatically at the start of each task. Report what changed (e.g., `↻ Applied 2 annotations: marked task 3 done, removed task 5`). If no annotations found, continue silently.

2. **Review the task** in `.codevoyant/plans/{plan-name}/plan.md`

3. **Identify the current phase number**:
   - Find which phase header the current task is under
   - Extract phase number from header (e.g., "### Phase 3 - Testing" → phase number is 3)

3. **Validate and read the implementation file**:
   - **File path**: `.codevoyant/plans/{plan-name}/implementation/phase-{N}.md`
   - **Validate exists**: Verify file exists before reading
   - **If missing**: This should never happen due to Step 2.5 validation, but if it does:
     ```
     ERROR: Implementation file missing for Phase {N}
     Expected: .codevoyant/plans/{plan-name}/implementation/phase-{N}.md

     Cannot execute phase without implementation specification.
     Please create the missing file or use /spec:refresh to validate plan structure.
     ```
     Stop execution and report the error to user.
   - **If exists**: Read the entire file to understand detailed implementation requirements
   - If implementation file doesn't exist, report error and suggest user create it or check plan structure
   - Read the phase-N.md file for detailed implementation steps
   - Reference the specific task section within the implementation file (match by task number within phase)
   - Understand all requirements, files to modify, dependencies, and testing needs

### 4.2: Implement the Task & Update Plan Status In Real-Time

1. Follow the detailed specs in the implementation file precisely

2. Make necessary changes to code, configuration, or documentation as specified in the implementation file

3. **CRITICAL:** Update checkboxes in `.codevoyant/plans/{plan-name}/plan.md` immediately as tasks complete
   - Use TodoWrite tool to track immediate work items (detailed sub-steps)
   - After updating plan.md, also update `.codevoyant/plans/README.md`:
     - Update progress stats (X/Y tasks, completion %)
     - Update last updated timestamp

### 4.3: Pause at Phase Boundaries

When a phase is complete:

1. **CRITICAL: Run tests to validate phase completion:**

   - Run the project's test suite (`just test`, `just test-template`, or
     equivalent)
   - Verify all tests pass before marking phase complete
   - If tests fail, fix issues before proceeding
   - **Exception**: For complex refactoring, tests may be allowed to fail
     temporarily, but:
     - Document the failure reason in plan.md
     - Create specific tasks to fix tests in the next phase
     - State clearly why tests are allowed to remain broken

2. Mark phase as complete with ✅ in `.codevoyant/plans/{plan-name}/plan.md`:

   ```markdown
   ### Phase 2 - OAuth Integration ✅
   ```

3. Update README.md with new progress and last updated timestamp

4. Before starting next phase, read the next implementation file (phase-N+1.md)

5. Report phase completion:

   ```
   Phase 2 - OAuth Integration complete! ✅

   Progress: 2/4 phases complete (50%)
   Tests: All passing ✅
   ```

## Step 5: Completion

When all phases are complete:

1. Update `.codevoyant/plans/README.md`:
   - Update status field (may set to "Complete" or leave as "Active")
   - Update progress to 100%
   - Update last updated timestamp

2. Run `/refresh {plan-name}` to verify all checkboxes

3. Suggest running `/done {plan-name}` to archive the completed plan

4. Report completion:
   ```
   Plan "{plan-name}" execution complete! ✅

   All phases complete: X/X tasks (100%)

   Next steps:
   - Review the completed work
   - Run /done {plan-name} to archive this plan
   - Start a new plan with /new
   ```
