# done

Mark a spec plan as complete, optionally commit changes and create a PR, then archive it.

## Variables

- `PLAN_NAME` — plan to complete (may be empty; will prompt if multiple plans exist)

## Step 1: Select Plan

If `PLAN_NAME` not provided, get all plans sorted by completion % (100% first) and use `AskUserQuestion` if multiple exist.

## Step 2: Verify Plan Completion

Read plan.md and verify completion:

1. Check all tasks checked and all phases have ✅ markers
2. Count completed vs total tasks

If plan is not fully complete, use **AskUserQuestion**:

```
question: "Plan is only X% complete. What would you like to do?"
options:
  - label: "Mark done anyway"
  - label: "Archive as abandoned"
  - label: "Continue working"
  - label: "Cancel"
```

- "Continue working": exit and suggest `/spec go {plan-name}`
- "Cancel": exit without changes
- "Archive as abandoned": skip to Step 5 (Archive) with `ARCHIVE_MODE=abandoned`

## Step 2.5: Detect Worktree Context

```bash
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
BASE_BRANCH=$(grep "^- \*\*Base Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Base Branch\*\*: //' | sed 's/ *$//')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
HAS_WORKTREE=false
if [ -n "$PLAN_WORKTREE" ] && [ "$PLAN_WORKTREE" != "(none)" ] && [ -d "$PLAN_WORKTREE" ]; then
  HAS_WORKTREE=true
fi
```

## Step 3: Offer to Commit Changes

Use **AskUserQuestion** (Yes, create commit / No, skip commit / Cancel).

If "Yes": check git status and diff, draft a commit message based on the plan objective, show it to the user, confirm, then create the commit.

## Step 4: Offer to Create Pull Request (if applicable)

If `PLAN_BRANCH` is set and differs from `BASE_BRANCH`, and `gh` CLI is available:

Check if branch has remote tracking. Use **AskUserQuestion** (Yes, create PR / Push branch and create PR / No, skip PR).

If creating PR, use the template in `references/pr-body-template.md` for the PR body.

## Step 5: Archive Completed Plan

1. Determine archive path: `.codevoyant/plans/archive/{plan-name}-{YYYYMMDD}/` (append `-HHMM` on collision)
2. Move entire plan directory to archive
3. Update registry:
   ```bash
   npx @codevoyant/agent-kit plans archive --name "$PLAN_NAME" --status Complete
   ```

## Step 5.5: Offer Worktree Removal (if applicable)

If `HAS_WORKTREE=true`:

- Check for uncommitted changes in worktree
- If dirty and user confirms, proceed with removal
- If clean, use **AskUserQuestion** (remove worktree + keep branch / remove worktree + delete branch / keep worktree)
- If removing worktree + deleting branch: check if branch is merged before deleting; warn if not and require confirmation

## Step 6: Confirm Completion

```
Plan "{plan-name}" marked as complete! ✅

Commit : [Created ({short-sha}) / Skipped]
PR     : [Created ({PR_URL}) / Skipped / Not applicable]
Archive: .codevoyant/plans/archive/{plan-name}-{YYYYMMDD}/

Ready to start your next plan with /spec new
```
