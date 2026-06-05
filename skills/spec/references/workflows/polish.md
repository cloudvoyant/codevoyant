# polish

Strip AI-style verbosity from source files modified during a spec plan's execution. Removes comments that restate the code, rhetorical flair in docs, and unnecessary preamble. Never changes logic.

## Variables

- `PLAN_NAME` — plan to polish (may be empty; auto-selects if only one active/complete plan)

## Step 1: Resolve plan

If `PLAN_NAME` not provided:
```bash
grep "| Active \|| Complete \|| Executing " .codevoyant/README.md 2>/dev/null | head -5
```
Auto-select if exactly one plan. If multiple, use AskUserQuestion to pick.

Set `PLAN_DIR=.codevoyant/plans/{plan-name}`.

Verify `$PLAN_DIR/execution-log.md` exists. If not: "No execution log found for '{plan-name}'. Run `/spec go` first."

## Step 2: Collect changed files

```bash
grep "Changed:" "$PLAN_DIR/execution-log.md" | sed 's/.*Changed: //' | tr ',' '\n' | sed 's/^ *//' | sort -u
```

Filter the list — **skip** any path matching:
- `.codevoyant/` — plan artifacts
- `implementation/` — spec files
- `execution-log.md`, `plan.md`, `user-guide.md` — plan documents
- `*.json`, `*.toml`, `*.yaml`, `*.yml`, `*.lock`, `*.lockb` — config and lock files
- `*.svg`, `*.png`, `*.jpg`, `*.gif` — binary assets

Store filtered list as `TARGET_FILES`. If empty: report "No source files to polish for '{plan-name}'." and exit.

Report: `Found {N} files to polish.`

## Step 3: Polish in parallel

For each file in `TARGET_FILES`, launch a polish agent in parallel (`run_in_background: false` — wait for all):

```
Agent(
  subagent_type: general-purpose,
  description: "Polish {filename}",
  prompt: """
You are polishing a file to remove AI-style verbosity. Edit the file in place.

File: {file_path}

## Ruleset

Apply these rules strictly. When in doubt, leave it unchanged.

### Remove (all file types)
- Comments that describe what the adjacent line does when the code/variable name already says it
  BAD:  `# Increment the counter`  above  `counter += 1`
  GOOD: `# Wrap around at 255 to avoid overflow`  above  `counter = (counter + 1) % 256`
- Hedge phrases in prose or comments: "it is worth noting", "please note that", "importantly",
  "may potentially", "could possibly", "it should be noted"
- "Note:" / "Warning:" / "Important:" prefixes on self-evident statements

### Remove in Markdown only
- Rhetorical flair: "This powerful approach...", "This enables you to...", "This groundbreaking..."
- Preamble that restates the heading: "In this section, we will explore...", "This guide covers..."
- Meta-commentary on structure: "Now that we've covered X, let's look at Y"
- Single-item bullet lists that would read better as a sentence

### Remove in code only
- Commented-out dead code blocks (multiple consecutive commented lines with no explanation)
- Function docstrings / JSDoc that only restate the function name and parameter names with no added info
  BAD:  `# add(a, b) — adds a and b and returns the result`
  GOOD: `# Returns None if the cache key has expired`

### Never change
- Code logic, control flow, function signatures, return types
- Comments explaining a non-obvious choice, workaround, or invariant
- Comments containing URLs, issue numbers, or author attributions
- TODOs and FIXMEs
- Any file in .codevoyant/, implementation/, or plan artifacts

Read the file at {file_path}. Apply the ruleset. Write the edited file back. Report: what was removed (brief list), or "No changes needed" if the file was already clean.
"""
)
```

Collect all results.

## Step 4: Report

```
✓ Polished {N} files for plan "{plan-name}":
  {filename} — {what was removed, or "no changes"}
  ...

{M} files unchanged.
```
