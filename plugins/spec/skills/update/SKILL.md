---
description: Apply inline annotations from plan files. Use when the user has edited a plan with > or >> comments and wants changes applied. Triggers on keywords like apply annotations, process comments, apply changes to plan, update plan from notes.
argument-hint: "[plan-name]"
disable-model-invocation: true
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


Apply `>` and `>>` annotations written directly in plan files.

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

## Step 0: Select Plan

Check for plan name argument. If not provided:
1. Read `.codevoyant/plans/README.md` to get all active plans with Last Updated timestamps
2. Sort plans by Last Updated (most recent first)
3. If only one plan exists, auto-select it
4. If multiple plans exist, use `AskUserQuestion` to present the list (name, progress %, last-updated) and ask the user to choose. Example prompt: "Which plan would you like to work on?\n  (1) feature-auth — 60% — updated 2h ago\n  (2) refactor-api — 20% — updated 1d ago"
5. Report: "Updating plan: {plan-name}"
6. If no plans exist, inform user to create one with `/new`

Verify `.codevoyant/plans/{plan-name}/plan.md` exists.

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

After all annotations processed:
- Verify ✅ phase markers match actual task completion for any touched phase
- Update `.codevoyant/plans/README.md` progress stats and Last Updated timestamp

## Step 4: Report

```
✓ Updated plan: {plan-name}

  plan.md:14 — marked task "Set up Passport.js" complete
  plan.md:16 — removed task "Add refresh tokens"
  implementation/phase-2.md:3 — rewrote phase overview for OAuth

  {N} annotation(s) applied.
```

If an annotation was ambiguous or could not be cleanly applied:
```
⚠️  Could not apply annotation at {file}:{line}: {reason}
    Annotation preserved — resolve manually.
```
