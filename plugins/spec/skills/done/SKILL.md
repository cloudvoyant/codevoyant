---
description: Mark a spec plan as complete, optionally commit changes, and archive it. Proactively suggest this when all plan tasks appear finished, even if the user doesn't say "done". Triggers on keywords like done, complete plan, finish plan, mark complete, wrap up plan, spec done.
argument-hint: "[plan-name]"
disable-model-invocation: true
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Mark current plan as complete and optionally commit changes.

## Step 0: Select Plan

If argument provided: `/done plan-name` - use that plan

If no argument:
1. Get all plans sorted by completion percentage (100% first)
2. If no plans exist, report error
3. If only one plan, auto-select it
4. If multiple plans, use **AskUserQuestion tool**:
   ```
   question: "Which plan do you want to mark as done?"
   header: "Complete Plan"
   options:
     - label: "feature-auth (100% complete) ✅"
       description: "Add authentication system. All tasks complete."
     - label: "refactor-api (95% complete)"
       description: "Refactor API layer. 19/20 tasks complete."
     - label: "add-tests (50% complete)"
       description: "Add test coverage. 10/20 tasks complete."
   ```

## Step 1: Verify Plan Completion

Read `.codevoyant/plans/{plan-name}/plan.md` and verify completion status:

1. Run `/refresh {plan-name}` logic to check all tasks
2. Verify all phases have ✅ markers
3. Count total completed vs total tasks

If plan is not fully complete:

- Report incomplete status (X/Y tasks complete)
- Use **AskUserQuestion** tool:
  ```
  question: "Plan is only X% complete. What would you like to do?"
  header: "Incomplete Plan"
  multiSelect: false
  options:
    - label: "Mark done anyway"
      description: "Treat as complete and archive (all done flow)"
    - label: "Archive as abandoned"
      description: "Shelve this plan — move to archive without commit or PR"
    - label: "Continue working"
      description: "Resume with /go {plan-name}"
    - label: "Cancel"
      description: "Don't mark done, keep as active"
  ```
- If "Continue working": exit and suggest `/go {plan-name}`
- If "Cancel": exit without changes
- If "Mark done anyway": continue to Step 1.5
- If "Archive as abandoned": skip to **Step 4 (Archive)** with `ARCHIVE_MODE=abandoned` — no commit, no PR, README note reads "Archived incomplete"

## Step 1.5: Detect Worktree Context

Extract worktree and branch information from plan metadata:

```bash
# Extract metadata
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
BASE_BRANCH=$(grep "^- \*\*Base Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Base Branch\*\*: //' | sed 's/ *$//')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Check if worktree exists and is set
HAS_WORKTREE=false
if [ -n "$PLAN_WORKTREE" ] && [ "$PLAN_WORKTREE" != "(none)" ]; then
  if [ -d "$PLAN_WORKTREE" ]; then
    HAS_WORKTREE=true
  fi
fi

# Store for later steps
```

Store these values for use in subsequent steps:
- `PLAN_BRANCH` - Branch associated with plan
- `PLAN_WORKTREE` - Worktree path (or "(none)")
- `BASE_BRANCH` - Base branch (usually main)
- `CURRENT_BRANCH` - Current git branch
- `HAS_WORKTREE` - Boolean flag if worktree exists

## Step 2: Offer to Commit Changes

Use **AskUserQuestion** tool:

```
question: "Would you like to commit the changes from plan '{plan-name}'?"
header: "Create Commit"
multiSelect: false
options:
  - label: "Yes, create commit"
    description: "Draft commit message and create git commit"
  - label: "No, skip commit"
    description: "Archive plan without committing"
  - label: "Cancel"
    description: "Don't mark done, exit without changes"
```

- If "Yes": Proceed to Step 3
- If "No": Skip to Step 4 (Archive)
- If "Cancel": Exit without changes

## Step 3: Create Git Commit (if requested)

If user wants to commit:

1. Check git status to see what changed:

   ```bash
   git status
   git diff
   ```

2. Draft a commit message based on the plan objective and completed tasks:

   - Use the plan's objective as the basis for the commit message
   - Include plan name in commit message
   - Example: "feat: complete add-authentication-system plan"
   - Summarize the key changes from all phases
   - Follow conventional commit format if appropriate
   - Include the standard footer

3. Show the proposed commit message to the user

4. Use **AskUserQuestion** tool:
   ```
   question: "Does this commit message look good?"
   header: "Confirm Commit"
   multiSelect: false
   options:
     - label: "Yes, create commit"
       description: "Create commit with this message"
     - label: "Let me edit it"
       description: "Provide a different commit message"
     - label: "Skip commit"
       description: "Don't commit, go to archive"
   ```

   - If "Yes": Create the commit
   - If "Let me edit it": Ask user for preferred message (text input), then create commit
   - If "Skip commit": Skip to Step 4

5. Create the commit with all changes from the plan

## Step 3.5: Offer to Create Pull Request (if applicable)

If plan has a branch that's different from base branch, offer to create PR:

**Check if PR creation is applicable:**
```bash
SHOULD_OFFER_PR=false
if [ -n "$PLAN_BRANCH" ] && [ "$PLAN_BRANCH" != "(none)" ] && [ "$PLAN_BRANCH" != "$BASE_BRANCH" ]; then
  # Check if gh CLI is available
  if command -v gh >/dev/null 2>&1; then
    # Check if branch has remote tracking
    if git rev-parse --abbrev-ref "$PLAN_BRANCH@{upstream}" >/dev/null 2>&1; then
      SHOULD_OFFER_PR=true
    else
      # Offer to push branch first
      echo "Branch '$PLAN_BRANCH' has no remote tracking. Push before creating PR."
      SHOULD_OFFER_PR=false
    fi
  fi
fi
```

**If PR creation is applicable:**

Use **AskUserQuestion** tool:
```
question: "Would you like to create a pull request for branch '$PLAN_BRANCH'?"
header: "Create Pull Request"
multiSelect: false
options:
  - label: "Yes, create PR"
    description: "Create PR from '$PLAN_BRANCH' to '$BASE_BRANCH'"
  - label: "Push branch and create PR"
    description: "Push branch to remote and create PR"
  - label: "No, skip PR"
    description: "Continue without creating PR"
```

**If user selects "Yes, create PR":**

1. Extract plan objective for PR description
2. Draft PR title from plan name and objective
3. Create PR body using the template in `references/pr-body-template.md` (in this skill directory), substituting all `{...}` placeholders.

4. Create PR using gh CLI:
```bash
gh pr create \
  --base "$BASE_BRANCH" \
  --head "$PLAN_BRANCH" \
  --title "feat: {plan objective summary}" \
  --body "$PR_BODY"
```

5. Capture PR URL and report to user

**If user selects "Push branch and create PR":**

1. Push branch to remote:
```bash
git push -u origin "$PLAN_BRANCH"
```

2. Then follow same PR creation flow as above

**If user selects "No, skip PR":**

Continue to next step without creating PR.

**Error Handling:**
- If gh CLI not available, skip this step with message
- If push fails, report error and don't create PR
- If PR creation fails, report error but continue to next step

## Step 4: Archive Completed Plan

Archive the plan to `.codevoyant/plans/archive/`:

1. **Determine Archive Path:**
   - Get current date: YYYYMMDD
   - Archive path: `.codevoyant/plans/archive/{plan-name}-{YYYYMMDD}/`

2. **Check for Collision:**
   - If archive directory exists, append time: `{plan-name}-{YYYYMMDD}-HHMM`

3. **Move Plan to Archive:**
   - Move entire directory: `.codevoyant/plans/{plan-name}/` → `.codevoyant/plans/archive/{plan-name}-{YYYYMMDD}/`
   - This includes plan.md, implementation/ directory, and execution-log.md

4. **Update README.md:**
   - Remove plan from Active Plans section
   - Add to Archived Plans section with branch context:
   ```markdown
   ### {plan-name} (Completed {YYYY-MM-DD})
   - **Description**: [from plan]
   {if PLAN_BRANCH != "(none)"}
   - **Branch**: {PLAN_BRANCH} 🌿 {if branch deleted}(deleted){endif}
   {endif}
   {if PLAN_WORKTREE != "(none)"}
   - **Worktree**: {if removed}(removed){else}{PLAN_WORKTREE}{endif}
   {endif}
   - **Progress**: Y/Y tasks (100%)
   - **Archive Path**: `.codevoyant/plans/archive/{plan-name}-{YYYYMMDD}/`
   ```

   **Implementation Notes:**
   - Include branch info if plan had a branch
   - Note if branch was deleted during cleanup
   - Note if worktree was removed during cleanup
   - Preserve this info for historical reference

## Step 4.5: Offer Worktree Removal (if applicable)

If plan had a worktree, offer to remove it:

**Check if worktree removal is applicable:**
```bash
if [ "$HAS_WORKTREE" = "true" ]; then
  # Worktree exists, offer removal
  SHOULD_OFFER_REMOVAL=true
else
  SHOULD_OFFER_REMOVAL=false
fi
```

**If worktree removal is applicable:**

**Validate Clean State:**

Before removing worktree, check for uncommitted changes:
```bash
# Check worktree status
if git -C "$PLAN_WORKTREE" status --porcelain | grep -q .; then
  # Worktree has uncommitted changes
  echo "⚠️  Warning: Worktree has uncommitted changes"
  git -C "$PLAN_WORKTREE" status --short

  WORKTREE_DIRTY=true
else
  # Worktree is clean
  SHOULD_REMOVE_WORKTREE=true
  WORKTREE_DIRTY=false
fi
```

If `WORKTREE_DIRTY=true`, use **AskUserQuestion** tool:
```
question: "Worktree has uncommitted changes. Remove it anyway? Changes will be lost!"
header: "⚠️ Uncommitted Changes"
multiSelect: false
options:
  - label: "Remove anyway"
    description: "Discard uncommitted changes and remove the worktree"
  - label: "Cancel"
    description: "Keep worktree intact"
```
- If "Remove anyway": set `SHOULD_REMOVE_WORKTREE=true`
- If "Cancel": set `SHOULD_REMOVE_WORKTREE=false`, report "Worktree removal cancelled."

**If worktree is clean or user confirmed removal:**

Use **AskUserQuestion** tool:
```
question: "Would you like to remove the worktree for this plan?"
header: "Clean Up Worktree"
multiSelect: false
options:
  - label: "Yes, remove worktree and keep branch"
    description: "Remove worktree at '$PLAN_WORKTREE', keep branch '$PLAN_BRANCH'"
  - label: "Yes, remove worktree and delete branch"
    description: "Remove worktree and delete branch '$PLAN_BRANCH' (use after PR merged)"
  - label: "No, keep worktree"
    description: "Leave worktree in place for manual cleanup later"
```

**If user selects "Yes, remove worktree and keep branch":**

1. Check if in worktree directory:
```bash
if [ "$(pwd)" = "$(realpath $PLAN_WORKTREE)" ]; then
  echo "Error: Cannot remove worktree while inside it"
  echo "Please cd to project root first: cd $(git rev-parse --show-toplevel)"
  # Don't remove, but don't exit - just warn
  WORKTREE_REMOVED=false
else
  # Remove worktree
  git worktree remove "$PLAN_WORKTREE"
  echo "✓ Removed worktree at $PLAN_WORKTREE"
  WORKTREE_REMOVED=true
fi
```

2. Update plan.md metadata in archive to reflect worktree removed:
```bash
# In archived plan.md, update Worktree line
sed -i '' 's/^- \*\*Worktree\*\*:.*/- **Worktree**: (removed)/' .codevoyant/plans/archive/{plan-name}-{YYYYMMDD}/plan.md
```

**If user selects "Yes, remove worktree and delete branch":**

1. First remove worktree (same as above)

2. Then delete the branch:
```bash
if [ "$WORKTREE_REMOVED" = "true" ]; then
  # Check if branch is merged
  if git branch --merged "$BASE_BRANCH" | grep -q "^  $PLAN_BRANCH$"; then
    # Branch is merged, safe to delete
    git branch -d "$PLAN_BRANCH"
    echo "✓ Deleted branch $PLAN_BRANCH (was merged to $BASE_BRANCH)"
  else
    # Branch not merged — ask user before force deleting
    echo "⚠️  Warning: Branch '$PLAN_BRANCH' is not merged to '$BASE_BRANCH'"
  fi
fi
```

If branch is not merged, use **AskUserQuestion** tool:
```
question: "Branch '$PLAN_BRANCH' is not merged to '$BASE_BRANCH'. Force delete it?"
header: "⚠️ Unmerged Branch"
multiSelect: false
options:
  - label: "Force delete branch"
    description: "Permanently delete unmerged branch '$PLAN_BRANCH'"
  - label: "Keep branch"
    description: "Leave branch for later (delete after merging)"
```
- If "Force delete branch": `git branch -D "$PLAN_BRANCH"`, report "✓ Force deleted branch $PLAN_BRANCH"
- If "Keep branch": report "Branch $PLAN_BRANCH kept"

**If user selects "No, keep worktree":**

Skip removal and continue.

**Error Handling:**
- If worktree removal fails, report error but continue
- If branch deletion fails, report error but continue
- If user is in worktree directory, warn but don't block completion

## Step 5: Confirm Completion

Report to user:

```
Plan "{plan-name}" marked as complete! ✅

Commit : [Created ({short-sha}) / Skipped]
PR     : [Created ({PR_URL}) / Skipped / Not applicable (no branch)]
Archive: .codevoyant/plans/archive/{plan-name}-{YYYYMMDD}/

View archived plan with: cat .codevoyant/plans/archive/{plan-name}-{YYYYMMDD}/plan.md

Ready to start your next plan with /new
```
