# update

Update a spec plan. Accepts two input modes:
- **Annotations**: `>` and `>>` markers already written directly in plan files
- **Conversational**: a plain-language description of what to change

## Annotation syntax

**`> instruction`** — standalone line, applies to the block immediately below it:
```markdown
> rewrite this phase for OAuth — drop all JWT references
### Phase 2 - Authentication
```

**`content >> instruction`** — inline suffix, applies to that specific line:
```markdown
1. [ ] Set up Passport.js >> mark done
2. [ ] Add refresh tokens >> remove this task
```

Both can appear in `plan.md` and any `implementation/phase-N.md`.

## Variables

- `PLAN_NAME` — plan to update (may be empty; will prompt)
- `CHANGE_DESCRIPTION` — everything after the plan name argument, if present
- `BG_MODE` — true if `--bg` present (auto-approve confirmation, send notification after)
- `SILENT` — true if `--silent` present

## Step 1: Determine Input Mode

If `CHANGE_DESCRIPTION` is non-empty: `INPUT_MODE=conversational`
Otherwise: `INPUT_MODE=annotations`
If both present: process conversational change first, then apply any annotations found.

## Step 2: Select Plan

If `PLAN_NAME` not provided, follow the same plan selection logic as `refresh.md` Step 1.

Verify `.codevoyant/plans/{plan-name}/plan.md` exists.

## Step 3: Process Conversational Change (if INPUT_MODE includes `conversational`)

Read plan.md and relevant phase-N.md files. Translate `CHANGE_DESCRIPTION` into concrete edits — identify exactly which files and lines are affected, what changes in each.

Show user a concise preview:

```
Proposed changes for: "{CHANGE_DESCRIPTION}"

  plan.md
    + Phase 2, task 4: "Add retry logic with exponential backoff"

  implementation/phase-2.md
    + Step 4: Implement retry wrapper using existing HttpClient pattern
              Add validation: {task runner test command}

Apply these changes?
```

If `BG_MODE=true`, auto-apply. Otherwise use **AskUserQuestion** (Apply / Adjust / Cancel).

After applying, continue to Step 4.

## Step 4: Process Annotations (if INPUT_MODE includes `annotations`)

Scan all plan files:

```bash
grep -rn "^>" .codevoyant/plans/{plan-name}/plan.md .codevoyant/plans/{plan-name}/implementation/ 2>/dev/null
grep -rn ">>" .codevoyant/plans/{plan-name}/plan.md .codevoyant/plans/{plan-name}/implementation/ 2>/dev/null
```

Apply the `spec-updater` agent (see `agents/spec-updater.md`) to process all annotations.

If no annotations found and INPUT_MODE is `annotations` only:
```
No annotations found in plan: {plan-name}
To annotate, edit any plan file directly:
  > rewrite this phase for OAuth          ← applies to next block
  1. [ ] Task name >> mark done           ← applies to this line
```

## Step 5: Report

```
✓ Updated plan: {plan-name}

  Changes applied:
    {file}:{line} — {description}
    ...

  Validation: {N} rounds — {PASS | X issues remain}

  Registry updated: {completed}/{total} tasks
```

If an annotation was ambiguous or could not be applied: preserve it and report `⚠️ Skipped annotation at {file}:{line}: {reason}`.

## Step 5.5: Desktop Notification (--bg only)

If `BG_MODE=true` and `SILENT=false`:

```bash
npx @codevoyant/agent-kit notify \
  --title "Claude Code — Spec" \
  --message "Plan '{plan-name}' updated"
```
