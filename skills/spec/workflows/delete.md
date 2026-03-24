# delete

Permanently delete a plan and all its files. This action cannot be undone.

## Variables

- `PLAN_NAME` — plan to delete (may be empty; will prompt if multiple plans exist)

## Step 1: Select Plan

If `PLAN_NAME` not provided, get all plans (active and archived) and use **AskUserQuestion** if multiple exist.

## Step 2: Confirm Deletion

First confirmation via **AskUserQuestion**:

```
question: "⚠️ PERMANENTLY DELETE plan '{plan-name}' (X/Y tasks - Z%)?"
options:
  - label: "Yes, delete permanently"
    description: "⚠️ DESTRUCTIVE: Cannot be undone. All files will be deleted."
  - label: "Cancel"
```

If "Cancel", exit immediately.

If "Yes", require **strong confirmation** by asking user to type the plan name exactly (case-sensitive). Only proceed if they type it correctly.

## Step 3: Delete the Plan

```bash
npx @codevoyant/agent-kit plans delete --name "$PLAN_NAME"
```

Delete plan directory: `.codevoyant/plans/{plan-name}/` or the archive directory.

If plan had an associated worktree: **do not delete the worktree**. Note that only plan files are removed and suggest manual cleanup: `git worktree remove <path>`.

## Step 4: Report Completion

```
Plan "{plan-name}" permanently deleted.

All files removed:
✓ .codevoyant/plans/{plan-name}/ deleted
✓ Registry updated

Create a new plan: /spec new
```
