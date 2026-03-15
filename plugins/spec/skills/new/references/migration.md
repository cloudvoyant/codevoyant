# Migration Guide: Consolidating to `.codevoyant/`

Earlier versions of the spec plugin stored plans and worktrees in separate top-level directories (`.spec/plans/` and `.worktrees/`). These have been consolidated under a single `.codevoyant/` directory to reduce clutter and align with how other plugins store their data.

This guide explains how to migrate an existing project to the new layout.

> **Shortcut**: Run `spec:doctor` to have the agent detect and perform these steps automatically.

## Migration Steps

### 1. Move plan files

```bash
mkdir -p .codevoyant/plans
cp -r .spec/plans/. .codevoyant/plans/
rm -rf .spec/plans
```

If `.spec/` is now empty, remove it too:

```bash
rmdir .spec 2>/dev/null || true
```

### 2. Move worktrees directory (if it exists)

```bash
[ -d .worktrees ] && mv .worktrees .codevoyant/worktrees
```

> Note: Git worktree registrations reference absolute paths. After moving the directory, run `git worktree list` to verify all worktrees are still recognised. If any show as prunable, run `git worktree prune` and re-add them from the new location.

### 3. Update `.gitignore`

Remove the old entries and add the new ones. The relevant lines to change:

```
# Remove these:
.spec/plans/
.worktrees/

# Add these:
.codevoyant/plans/
.codevoyant/worktrees/
```

### 4. Update CLAUDE.md references

Search CLAUDE.md (and any local notes) for references to the old paths and update them:

- `.spec/plans/` → `.codevoyant/plans/`
- `.worktrees/` → `.codevoyant/worktrees/`

```bash
# Find occurrences to review manually
grep -r "\.spec/plans\|\.worktrees" CLAUDE.md .claude/ 2>/dev/null
```

## Verification

After migrating, confirm the new layout looks correct:

```
.codevoyant/
├── spec.json           # plan registry
├── plans/
│   └── {plan-name}/
│       ├── plan.md
│       └── implementation/
└── worktrees/          # only if you use worktrees
```

Run `spec:doctor` at any time to re-check and fix any remaining issues.
