---
description: "Use when modifying an existing spec plan. Triggers on: \"update plan\", \"change plan\", \"add task\", \"remove task\", \"rename phase\", \"apply annotations\", \"edit plan\", \"adjust plan\", \"spec update\". Applies inline > and >> annotations from plan files or accepts conversational changes. Supports --bg for background execution."
argument-hint: "[plan-name] [change description] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: spec-updater
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run steps sequentially. The `agent: spec-updater` and `context: fork` fields are Claude Code-specific — on other platforms the skill runs inline.

Update a spec plan. Accepts two input modes:
- **Annotations**: `>` and `>>` markers already written directly in plan files
- **Conversational**: a plain-language description of what to change, given as an argument or as the message that triggered this skill

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
3. [ ] Configure providers >> change to use env vars instead of hardcoded values
```

Both can appear in `plan.md` and any `implementation/phase-N.md`.

## Step -1: Parse Flags

```
BG_MODE = true if --bg present
SILENT  = true if --silent present
```

If `BG_MODE=true`: skip the "Apply these changes?" confirmation in Step 0.8 (auto-approve) and send a desktop notification after Step 4.

## Step 0: Determine Input Mode

Check the argument string and the message that triggered this skill for a change description:

- If a non-plan-name argument is present (e.g., `/spec:update add error handling to phase 2`), treat everything after the plan name as `CHANGE_DESCRIPTION`
- If the triggering message contained a conversational change request (e.g., "add a retry task to the auth phase"), capture it as `CHANGE_DESCRIPTION`
- If neither: `CHANGE_DESCRIPTION` is empty → annotation mode

Set `INPUT_MODE`:
- `conversational` — `CHANGE_DESCRIPTION` is non-empty
- `annotations` — scan plan files for `>` / `>>` markers
- If both are present, process the conversational change first, then apply any annotations found

## Step 0: Select Plan

Check for plan name argument. If not provided:
1. Get all active plans with Last Updated timestamps:
   ```bash
   npx @codevoyant/agent-kit plans migrate
   npx @codevoyant/agent-kit plans list --status active
   ```
2. Sort plans by Last Updated (most recent first)
3. If only one plan exists, auto-select it
4. If multiple plans exist, use `AskUserQuestion` to present the list (name, progress %, last-updated) and ask the user to choose. Example prompt: "Which plan would you like to work on?\n  (1) feature-auth — 60% — updated 2h ago\n  (2) refactor-api — 20% — updated 1d ago"
5. Report: "Updating plan: {plan-name}"
6. If no plans exist, inform user to create one with `/new`

Verify `.codevoyant/plans/{plan-name}/plan.md` exists.

## Step 0.8: Process Conversational Change (if INPUT_MODE includes `conversational`)

Read `plan.md` and the relevant `implementation/phase-N.md` files to understand the current plan structure.

Translate `CHANGE_DESCRIPTION` into concrete edits:

1. Identify exactly which files and lines are affected (plan.md, which phase-N.md files)
2. Determine what needs to change in each file — be specific: new task text, removed lines, renamed headers, reordered steps
3. Show the user a concise preview of the proposed changes before applying:

```
Proposed changes for: "{CHANGE_DESCRIPTION}"

  plan.md
    + Phase 2, task 4: "Add retry logic with exponential backoff"

  implementation/phase-2.md
    + Step 4: Implement retry wrapper using existing HttpClient pattern
              Add validation: just test after changes

Apply these changes?
```

If `BG_MODE=true`, skip the question below and auto-apply the changes.

Otherwise use **AskUserQuestion**:
```
question: "Apply these changes to {plan-name}?"
header: "Plan Update"
multiSelect: false
options:
  - label: "Apply"
    description: "{first line of proposed change summary}"
  - label: "Adjust"
    description: "Let me clarify what I want"
  - label: "Cancel"
    description: "Don't change the plan"
```

- **Apply**: proceed with the edits
- **Adjust**: ask "What should be different?" (free-text), update the proposed changes, re-confirm
- **Cancel**: exit

After applying conversational changes, continue to Step 1 to process any annotations (or skip to Step 3 if `INPUT_MODE` is `conversational` only).

## Step 1: Scan All Plan Files for Annotations

Search every file in the plan directory:

```bash
grep -rn "^>" .codevoyant/plans/{plan-name}/plan.md .codevoyant/plans/{plan-name}/implementation/ 2>/dev/null
grep -rn ">>" .codevoyant/plans/{plan-name}/plan.md .codevoyant/plans/{plan-name}/implementation/ 2>/dev/null
```

Files to scan:
- `.codevoyant/plans/{plan-name}/plan.md`
- `.codevoyant/plans/{plan-name}/implementation/phase-*.md`

**Parse each annotation:**

For each `>> instruction` match:
- `FILE` — file containing it
- `LINE_NUM` — line number
- `CONTENT` — the text before `>>`
- `INSTRUCTION` — text after `>>`

For each standalone `> instruction` line:
- `FILE`, `LINE_NUM`
- `INSTRUCTION` — full line after `> `
- `TARGET` — the block immediately following (read until next blank line or heading)

Collect all annotations ordered by file then line number.

If no annotations found:
```
No annotations found in plan: {plan-name}

To annotate, edit any plan file directly:
  > rewrite this phase for OAuth          ← applies to next block
  1. [ ] Task name >> mark done           ← applies to this line
```
Exit.

## Step 2: Apply Each Annotation

Work **bottom-to-top within each file** so line numbers stay valid as edits are made.

For each annotation, interpret the instruction:

| Instruction says | Action |
|---|---|
| "mark done", "mark complete", "done", "check", "✓" | `[ ]` → `[x]` on the target task(s); add ✅ to phase header if all tasks done |
| "uncheck", "reopen", "mark incomplete" | `[x]` → `[ ]`; remove ✅ from phase header |
| "remove", "delete", "drop", "skip" | Delete the target line(s) or section |
| "rewrite", "replace", "update", "change to" | Rewrite target content per instruction |
| "add", "insert", "append" | Insert new content at the annotated location |
| "rename" | Update the label/title at the annotated location |
| Free-form | Interpret and apply as a direct edit |

After applying the edit, **remove the annotation marker itself**:
- For `>> instruction`: delete from `>>` to end of line (keep the content before `>>`)
- For standalone `> instruction`: delete the entire annotation line

Log each change for the summary.

## Step 3: Consistency Pass

After all changes applied:
- Verify ✅ phase markers match actual task completion for any touched phase
- Verify `implementation/phase-N.md` files exist for every phase in plan.md and no orphaned files remain
- Update the registry:
  ```bash
  npx @codevoyant/agent-kit plans update-progress \
    --name "$PLAN_NAME" \
    --completed $COMPLETED \
    --total $TOTAL
  ```

## Step 3.5: Validation Loop

Run the full validation loop from `references/validation-loop.md` (relative to the spec:new skill directory).

The `spec-updater` agent handles this — it runs a minimum of 2 validation rounds, auto-fixes `NEEDS_IMPROVEMENT` results, and caps at 3 rounds. This catches inconsistencies introduced by the changes (vague tasks, missing implementation detail, broken task runner references).

## Step 4: Report

```
✓ Updated plan: {plan-name}

  Changes applied:
    plan.md:14        — marked task "Set up Passport.js" complete
    plan.md:16        — removed task "Add refresh tokens"
    phase-2.md:3      — rewrote phase overview for OAuth

  Propagated:
    phase-2.md        — updated steps to match new task in plan.md
    plan.md           — removed orphaned task after phase-3 step deleted

  Validation: {N} rounds — {PASS | X issues remain}

  Registry updated: {completed}/{total} tasks
```

If an annotation was ambiguous or could not be cleanly applied:
```
⚠️  Skipped annotation at {file}:{line}: {reason}
    Annotation preserved — resolve manually.
```

## Step 4.5: Desktop Notification (--bg only)

If `BG_MODE=true` and `SILENT=false`, send a desktop notification:

```bash
npx @codevoyant/agent-kit notify \
  --title "Claude Code — Spec" \
  --message "Plan '{plan-name}' updated"
```
