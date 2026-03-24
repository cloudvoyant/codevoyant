# rename

Rename a plan's directory and update the registry. Git worktrees and branches are NOT renamed — only the plan directory name changes.

## Variables

- `OLD_NAME` — current plan name (first argument; may be empty)
- `NEW_NAME` — new plan name (second argument; may be empty)

## Step 1: Select Plan

If `OLD_NAME` not provided, get all plans and use **AskUserQuestion** if multiple exist.

## Step 2: Get New Name

If `NEW_NAME` not provided, ask: "What should the new name be for plan '{old-name}'?"

## Step 3: Validate New Name

1. Slugify: lowercase, hyphens for spaces, alphanumeric + hyphens only
2. Check for collisions:
   ```bash
   npx @codevoyant/agent-kit plans resolve-name --name "{new-name}"
   ```
3. If collision, offer to append `-2`, `-3`, etc. or let user choose a different name

## Step 4: Confirm Rename

Use **AskUserQuestion** (Rename plan / Cancel).

## Step 5: Perform Rename

```bash
npx @codevoyant/agent-kit plans rename --old-name "$OLD_NAME" --new-name "$NEW_NAME"
```

Rename directory: `.codevoyant/plans/{old-name}/` → `.codevoyant/plans/{new-name}/`

Search plan.md for self-references to `{old-name}` as a string (e.g., in path comments or plan title line) and update to `{new-name}`.

## Step 6: Report Completion

```
Plan renamed successfully!

Old name: {old-name}
New name: {new-name}
Location: .codevoyant/plans/{new-name}/

Continue execution: /spec go {new-name}
Check status: /spec list {new-name}
```
