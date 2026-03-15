---
description: Diagnose and fix spec setup issues — detects old path layouts and migrates them to the current .codevoyant/ structure, updates .gitignore, and confirms when everything is already correct. Use when plan files aren't found, paths look wrong, or after upgrading the plugin. Triggers on keywords like spec doctor, diagnose spec, fix spec setup, spec issues, migrate spec paths.
disable-model-invocation: true
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply.

Diagnose spec setup issues and migrate old path layouts to the current `.codevoyant/` structure.

## Overview

Checks the project for legacy spec directories and updates them to the consolidated `.codevoyant/` layout introduced in the path consolidation migration. Reports every finding before making changes, then applies fixes.

## Step 0: Run Diagnostics

Check for each known issue and record findings before touching anything.

**Check 1 — Legacy `.spec/plans/` directory**
```bash
[ -d .spec/plans ] && echo "found" || echo "absent"
```
- Found → **will migrate** to `.codevoyant/plans/`
- Absent → check whether `.codevoyant/plans/` exists; if neither exists, note that no plan directory is present yet (fresh project — no action needed)

**Check 2 — Legacy `.worktrees/` directory**
```bash
[ -d .worktrees ] && echo "found" || echo "absent"
```
- Found → **will migrate** to `.codevoyant/worktrees/`
- Absent → no action needed

**Check 3 — `.gitignore` entries**

Check whether `.gitignore` still contains old entries or is missing new ones:
```bash
grep -n "\.spec/plans\|\.worktrees" .gitignore 2>/dev/null
grep -n "\.codevoyant/plans\|\.codevoyant/worktrees" .gitignore 2>/dev/null
```
- Old entries present → **will remove**
- New entries absent → **will add**
- Already correct → no action needed

**Check 4 — CLAUDE.md references**

Search for stale path references in CLAUDE.md:
```bash
grep -n "\.spec/plans\|\.worktrees" CLAUDE.md 2>/dev/null
```
- References found → **will flag** (agent updates, not auto-replaced, to avoid mangling context)
- None found → no action needed

Report all findings before proceeding:

```
Spec doctor diagnosis
─────────────────────────────────────────────
.spec/plans/ directory:     found           → will migrate to .codevoyant/plans/
.worktrees/ directory:      absent          → no action
.gitignore old entries:     found (line 12) → will remove
.gitignore new entries:     missing         → will add
CLAUDE.md stale refs:       none            → no action

Applying fixes...
```

If all checks pass with no issues, report that and stop:

```
Spec doctor diagnosis
─────────────────────────────────────────────
.spec/plans/ directory:     absent          ✓
.worktrees/ directory:      absent          ✓
.gitignore:                 correct         ✓
CLAUDE.md:                  no stale refs   ✓

Everything looks correct. No changes needed.
```

## Step 1: Migrate `.spec/plans/` → `.codevoyant/plans/`

Only run if Check 1 found `.spec/plans/`.

```bash
mkdir -p .codevoyant/plans
cp -r .spec/plans/. .codevoyant/plans/
rm -rf .spec/plans
# Remove .spec/ if now empty
rmdir .spec 2>/dev/null || true
```

Report: `✓ Migrated .spec/plans/ → .codevoyant/plans/`

If `cp` or `rm` fails, stop and report the error. Do not proceed to further steps — the user should resolve the file system issue and re-run `spec:doctor`.

## Step 2: Migrate `.worktrees/` → `.codevoyant/worktrees/`

Only run if Check 2 found `.worktrees/`.

```bash
mkdir -p .codevoyant
mv .worktrees .codevoyant/worktrees
```

After moving:
- Run `git worktree list` to check whether any worktrees now show broken paths
- If any are listed as prunable, run `git worktree prune` and warn the user to re-add them from `.codevoyant/worktrees/<branch>`

Report: `✓ Migrated .worktrees/ → .codevoyant/worktrees/`

## Step 3: Update `.gitignore`

Only run if Check 3 found old entries or missing new entries.

Read the current `.gitignore`, then:

1. Remove lines matching `.spec/plans/` or `.worktrees/` (exact line match, not substring)
2. Add `.codevoyant/plans/` if not already present
3. Add `.codevoyant/worktrees/` if not already present — add it directly after the `plans/` line if possible

Write the updated file back.

Report:
```
✓ Updated .gitignore
  Removed: .spec/plans/, .worktrees/
  Added:   .codevoyant/plans/, .codevoyant/worktrees/
```

## Step 4: Flag CLAUDE.md stale references

Only run if Check 4 found references.

Do not auto-edit CLAUDE.md — it contains freeform human-written context. Instead, show the agent the exact lines that need updating:

```
⚠  CLAUDE.md contains stale path references (update manually):

  Line 14: "Plans are stored in .spec/plans/"
  Line 27: "Check .worktrees/ for active branches"

  Replace .spec/plans/ → .codevoyant/plans/
  Replace .worktrees/  → .codevoyant/worktrees/
```

Offer to make the edits if the user confirms:

```
question: "Update these CLAUDE.md lines automatically?"
header: "Update CLAUDE.md"
multiSelect: false
options:
  - label: "Yes, update them"
    description: "Replace stale path references in CLAUDE.md"
  - label: "No, I'll do it manually"
    description: "Skip — I'll update CLAUDE.md myself"
```

If confirmed, apply the replacements (`.spec/plans/` → `.codevoyant/plans/` and `.worktrees/` → `.codevoyant/worktrees/`) and report each changed line.

## Step 5: Report Summary

```
Spec doctor complete
─────────────────────────────────────────────
✓ Migrated .spec/plans/ → .codevoyant/plans/
✓ Migrated .worktrees/ → .codevoyant/worktrees/
✓ Updated .gitignore
✓ Updated CLAUDE.md (2 lines)

Your spec setup is now using the current layout.
Run /list to see your active plans.
```

Omit lines for steps that were not needed.
