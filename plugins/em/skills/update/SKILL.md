---
description: Update an EM roadmap or breakdown — apply inline > and >> annotations written directly in roadmap.md or breakdowns/*.md, or describe changes conversationally. Use when adding/removing epics, adjusting phases, marking items done, rewording tasks, or any change to an existing plan. Triggers on: update em, change roadmap, modify epic, add task, remove epic, rename phase, update breakdown, apply annotations, edit roadmap, adjust em plan.
argument-hint: "[plan-slug] [change description] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run steps sequentially.

Update an EM roadmap or breakdown file. Two input modes:
- **Annotations**: `>` and `>>` markers already written in plan files
- **Conversational**: plain-language description of what to change

## Annotation syntax

**`> instruction`** — standalone line, applies to the block immediately below it:
```markdown
> rewrite this phase for the new auth approach
### Phase 2 - Authentication Migration
```

**`content >> instruction`** — inline suffix, applies to that line:
```markdown
- Migrate user sessions >> mark done
- Add refresh token rotation >> remove this task
- Configure OAuth providers >> change to use env vars
```

Both can appear in `roadmap.md` and any `breakdowns/*.md`.

## Step -1: Parse Flags

```
BG_MODE = true if --bg present
SILENT  = true if --silent present
```

If `BG_MODE=true`: skip the confirmation in Step 1 and send a desktop notification after Step 5.

## Step 0: Select Plan

Check for plan slug argument. If not provided:
1. List `.codevoyant/em/plans/*/roadmap.md` sorted by modification time (most recent first)
2. If only one plan, auto-select it
3. If multiple, use AskUserQuestion to present the list and ask the user to choose
4. If none exist, inform user to run `/em:plan` first

Verify `.codevoyant/em/plans/{slug}/roadmap.md` exists. Set `PLAN_DIR=".codevoyant/em/plans/{slug}"`.

## Step 0.5: Determine Input Mode

Check the argument string and triggering message for a change description:
- If a non-slug argument is present (e.g., `/em:update add observability to phase 3`), treat everything after the slug as `CHANGE_DESCRIPTION`
- If neither: `CHANGE_DESCRIPTION` is empty → annotation mode

Set `INPUT_MODE`:
- `conversational` — `CHANGE_DESCRIPTION` is non-empty
- `annotations` — scan plan files for `>` / `>>` markers
- If both present, process conversational change first, then apply any annotations

## Step 1: Process Conversational Change (if INPUT_MODE includes `conversational`)

Read `roadmap.md` and any relevant `breakdowns/*.md` to understand current structure.

Translate `CHANGE_DESCRIPTION` into concrete edits:
1. Identify exactly which files are affected
2. Determine what needs to change — specific new text, removed lines, renamed sections
3. Show a concise preview before applying:

```
Proposed changes for: "{CHANGE_DESCRIPTION}"

  roadmap.md
    + Phase 2: add observability milestone under deliverables

  breakdowns/search-v2.md
    + Task: "Set up distributed tracing with OpenTelemetry"
    + Failure mode: "Trace context lost across service boundaries"

Apply these changes?
```

If `BG_MODE=true`, auto-apply without asking.

Otherwise use AskUserQuestion:
```
question: "Apply these changes to {slug}?"
header: "Roadmap Update"
multiSelect: false
options:
  - label: "Apply"
    description: "{first line of change summary}"
  - label: "Adjust"
    description: "Let me clarify what I want"
  - label: "Cancel"
    description: "Don't change the plan"
```

- **Apply**: proceed
- **Adjust**: ask "What should be different?", update proposed changes, re-confirm
- **Cancel**: exit

## Step 2: Scan for Annotations

```bash
grep -rn "^>" {PLAN_DIR}/roadmap.md {PLAN_DIR}/breakdowns/ 2>/dev/null
grep -rn ">>" {PLAN_DIR}/roadmap.md {PLAN_DIR}/breakdowns/ 2>/dev/null
```

For each annotation, parse: FILE, LINE_NUM, CONTENT (before `>>`), INSTRUCTION.

If `INPUT_MODE=annotations` and no annotations found:
```
No annotations found in {slug}.

To annotate, edit roadmap.md or breakdowns/*.md directly:
  > rewrite this section for the new approach     ← applies to next block
  - epic name >> mark done                        ← applies to this line
```
Exit.

## Step 3: Apply Each Annotation

Work bottom-to-top within each file so line numbers stay valid.

| Instruction | Action |
|---|---|
| "mark done", "done", "✓" | Mark the item complete |
| "remove", "delete", "drop" | Delete the target line(s) or section |
| "rewrite", "replace", "change to" | Rewrite per instruction |
| "add", "insert", "append" | Insert new content |
| "rename" | Update the label/title |
| Free-form | Interpret and apply as a direct edit |

Remove the annotation marker after applying. Log each change for the summary.

## Step 4: Consistency Pass

After all changes:
- Verify all referenced breakdown files still exist in `{PLAN_DIR}/breakdowns/`
- Check phase numbering and naming is consistent throughout `roadmap.md`
- Verify "NOT this period" section still accurately reflects deferrals

## Step 5: Validation Pass

Run 2 validation rounds autonomously — no user prompts.

For each round, launch parallel agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Plan-level agent** — checks `roadmap.md`: phases have theme/deliverables/risks, failure modes filled, assumptions listed.

**Per-breakdown agents** — one per file touched in this update: architecture diagram non-trivial, failure modes filled, tasks specific and actionable.

Collect results (`TaskOutput block: true`). Auto-fix any `NEEDS_IMPROVEMENT` issues. Run round 2 after fixes. Cap at 3 rounds.

## Step 6: Report

```
✓ Updated: {slug}

  Changes applied:
    roadmap.md:24        — added observability milestone to Phase 2
    breakdowns/search-v2.md:8 — added OpenTelemetry task

  Validation: {N} rounds — {PASS | X issues remain}
```

If an annotation was ambiguous or could not be applied:
```
⚠️  Skipped annotation at {file}:{line}: {reason}
    Annotation preserved — resolve manually.
```

## Step 7: Notify (--bg only)

If `BG_MODE=true` and `SILENT=false`:

```
for _c in "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/em/scripts/notify.sh" "$HOME/.claude/plugins/em/scripts/notify.sh"; do [ -f "$_c" ] && bash "$_c" "em:update complete" "Roadmap '{slug}' updated ✓" && break; done
```
