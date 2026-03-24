# doctor

Diagnose spec setup issues and migrate old path layouts to the current `.codevoyant/` structure.

## Variables

None — doctor always runs on the current project.

## Step 1: Run Diagnostics

Check for each known issue and record findings before touching anything.

**Check 1 — Legacy `.spec/plans/` directory**
```bash
[ -d .spec/plans ] && echo "found" || echo "absent"
```
Found → will migrate to `.codevoyant/plans/`

**Check 2 — Legacy `.worktrees/` directory**
```bash
[ -d .worktrees ] && echo "found" || echo "absent"
```
Found → will migrate to `.codevoyant/worktrees/`

**Check 3 — `.gitignore` entries**
```bash
grep -n "\.spec/plans\|\.worktrees" .gitignore 2>/dev/null
grep -n "\.codevoyant/plans\|\.codevoyant/worktrees" .gitignore 2>/dev/null
```
Old entries present → will remove; new entries absent → will add

**Check 4 — CLAUDE.md references**
```bash
grep -n "\.spec/plans\|\.worktrees" CLAUDE.md 2>/dev/null
```
References found → will flag (not auto-replaced)

Report all findings. If all checks pass, report "Everything looks correct. No changes needed." and stop.

## Step 2: Migrate `.spec/plans/` → `.codevoyant/plans/`

Only if Check 1 found `.spec/plans/`.

```bash
mkdir -p .codevoyant/plans
cp -r .spec/plans/. .codevoyant/plans/
rm -rf .spec/plans
rmdir .spec 2>/dev/null || true
```

## Step 3: Migrate `.worktrees/` → `.codevoyant/worktrees/`

Only if Check 2 found `.worktrees/`.

```bash
mkdir -p .codevoyant
mv .worktrees .codevoyant/worktrees
```

After moving, run `git worktree list` to check for broken paths. If any are prunable, run `git worktree prune` and warn the user.

## Step 4: Update `.gitignore`

Only if Check 3 found old entries or missing new entries.

Read current `.gitignore`, remove lines matching `.spec/plans/` or `.worktrees/` (exact line match), add `.codevoyant/plans/` and `.codevoyant/worktrees/` if not already present. Write back.

## Step 5: Flag CLAUDE.md Stale References

Only if Check 4 found references.

Do not auto-edit — show the exact lines and offer to make the edits:

```
question: "Update these CLAUDE.md lines automatically?"
options:
  - label: "Yes, update them"
  - label: "No, I'll do it manually"
```

If confirmed, replace `.spec/plans/` → `.codevoyant/plans/` and `.worktrees/` → `.codevoyant/worktrees/`.

## Step 6: Report Summary

```
Spec doctor complete
─────────────────────────────────────────────
✓ Migrated .spec/plans/ → .codevoyant/plans/
✓ Updated .gitignore
...

Run /spec list to see your active plans.
```

Omit lines for steps that were not needed.
