---
description: Update a PM roadmap or PRD — apply inline > and >> annotations written directly in roadmap.md or prds/*.md, or describe changes conversationally. Use when adding/removing features, adjusting phases, updating priorities, marking items done, rewording user stories, or any change to an existing product plan. Triggers on: update pm, change product roadmap, modify feature, update prd, add feature, remove feature, rename phase, apply annotations, edit product roadmap, adjust pm plan.
argument-hint: "[plan-slug] [change description] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run steps sequentially.

Update a PM roadmap or PRD file. Two input modes:
- **Annotations**: `>` and `>>` markers already written in plan files
- **Conversational**: plain-language description of what to change

## Annotation syntax

**`> instruction`** — standalone line, applies to the block immediately below it:
```markdown
> reprioritize — move to Phase 2 and reduce scope
### Feature: Advanced Search
```

**`content >> instruction`** — inline suffix, applies to that line:
```markdown
- User can filter by date >> mark done
- Export to CSV >> remove — descoped
- Bulk actions >> change priority to P2
```

Both can appear in `roadmap.md` and any `prds/*.md`.

## Step -1: Parse Flags

```
BG_MODE = true if --bg present
SILENT  = true if --silent present
```

If `BG_MODE=true`: skip the confirmation in Step 1 and send a desktop notification after Step 5.

## Step 0: Select Plan

Check for plan slug argument. If not provided:
1. List `.codevoyant/pm/plans/*/roadmap.md` sorted by modification time (most recent first)
2. If only one plan, auto-select it
3. If multiple, use AskUserQuestion to present the list and ask the user to choose
4. If none exist, inform user to run `/pm:plan` first

Verify `.codevoyant/pm/plans/{slug}/roadmap.md` exists. Set `PLAN_DIR=".codevoyant/pm/plans/{slug}"`.

## Step 0.5: Determine Input Mode

Check the argument string and triggering message for a change description:
- If a non-slug argument is present (e.g., `/pm:update move search to phase 2`), treat everything after the slug as `CHANGE_DESCRIPTION`
- If neither: `CHANGE_DESCRIPTION` is empty → annotation mode

Set `INPUT_MODE`:
- `conversational` — `CHANGE_DESCRIPTION` is non-empty
- `annotations` — scan plan files for `>` / `>>` markers
- If both present, process conversational change first, then apply any annotations

## Step 1: Process Conversational Change (if INPUT_MODE includes `conversational`)

Read `roadmap.md` and any relevant `prds/*.md` to understand current structure.

Translate `CHANGE_DESCRIPTION` into concrete edits:
1. Identify exactly which files are affected
2. Determine what needs to change — specific new text, removed lines, renamed sections, reprioritized features
3. Show a concise preview before applying:

```
Proposed changes for: "{CHANGE_DESCRIPTION}"

  roadmap.md
    ~ Phase 1: move "Advanced Search" to Phase 2
    + Phase 2: add "Advanced Search" with reduced scope

  prds/advanced-search.md
    ~ Scope: mark CSV export as out-of-scope

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
grep -rn "^>" {PLAN_DIR}/roadmap.md {PLAN_DIR}/prds/ 2>/dev/null
grep -rn ">>" {PLAN_DIR}/roadmap.md {PLAN_DIR}/prds/ 2>/dev/null
```

For each annotation, parse: FILE, LINE_NUM, CONTENT (before `>>`), INSTRUCTION.

If `INPUT_MODE=annotations` and no annotations found:
```
No annotations found in {slug}.

To annotate, edit roadmap.md or prds/*.md directly:
  > reprioritize this feature for Phase 2     ← applies to next block
  - user story >> mark done                   ← applies to this line
```
Exit.

## Step 3: Apply Each Annotation

Work bottom-to-top within each file so line numbers stay valid.

| Instruction | Action |
|---|---|
| "mark done", "done", "shipped", "✓" | Mark the item complete |
| "remove", "delete", "drop", "descope" | Delete the target line(s) or section |
| "rewrite", "replace", "change to" | Rewrite per instruction |
| "add", "insert", "append" | Insert new content |
| "rename" | Update the label/title |
| "reprioritize", "move to P0/P1/P2" | Update priority on the item |
| Free-form | Interpret and apply as a direct edit |

Remove the annotation marker after applying. Log each change for the summary.

## Step 4: Consistency Pass

After all changes:
- Verify all referenced PRD files still exist in `{PLAN_DIR}/prds/`
- Check that the Failure Modes table in `roadmap.md` still covers all features in the roadmap
- Verify "NOT this period" section still accurately reflects deferrals
- Check that any removed features are reflected in the Failure Modes table (remove their rows)

## Step 5: Validation Pass

Run 2 validation rounds autonomously — no user prompts.

For each round, launch parallel agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Plan-level agent** — checks `roadmap.md`: phases have theme/features/rationale, failure modes table filled, strategic assumptions listed.

**Per-PRD agents** — one per file touched in this update: problem statement specific, user stories have acceptance criteria, success metrics measurable, out-of-scope items listed.

Collect results (`TaskOutput block: true`). Auto-fix any `NEEDS_IMPROVEMENT` issues. Run round 2 after fixes. Cap at 3 rounds.

## Step 6: Report

```
✓ Updated: {slug}

  Changes applied:
    roadmap.md:31        — moved "Advanced Search" to Phase 2
    prds/advanced-search.md:12 — marked CSV export out-of-scope

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
for _c in "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/pm/scripts/notify.sh" "$HOME/.claude/plugins/pm/scripts/notify.sh"; do [ -f "$_c" ] && bash "$_c" "pm:update complete" "Roadmap '{slug}' updated ✓" && break; done
```
