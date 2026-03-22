---
description: "Use when modifying an existing em plan or task files. Triggers on: \"update em\", \"change plan\", \"modify epic\", \"add task\", \"remove task\", \"rename phase\", \"apply annotations\", \"edit plan\". Applies inline > and >> annotations or accepts conversational changes to plan.md or task milestone files."
name: em:update
license: MIT
compatibility: "Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline. Core functionality preserved on all platforms."
argument-hint: "[plan-slug] [change description] [--bg] [--silent]"
disable-model-invocation: true
agent: general-purpose
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially. The `context: fork` and `agent:` frontmatter fields are Claude Code-specific — on OpenCode and VS Code Copilot they are ignored and the skill runs inline using the current model.

Update an EM plan or task milestone file. Two input modes:
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

Both can appear in `plan.md` and any `tasks/*.md`.

## Step -1: Parse Flags

```
BG_MODE = true if --bg present
SILENT  = true if --silent present
```

If `BG_MODE=true`: skip the confirmation in Step 1 and send a desktop notification after Step 5.

## Step 0: Select Plan

Check for plan slug argument. If not provided:
1. List `.codevoyant/em/plans/*/plan.md` sorted by modification time (most recent first)
2. If only one plan, auto-select it
3. If multiple, use AskUserQuestion to present the list and ask the user to choose
4. If none exist, inform user to run `/em:plan` first

Verify `.codevoyant/em/plans/{slug}/plan.md` exists. Set `PLAN_DIR=".codevoyant/em/plans/{slug}"`.

## Step 0.5: Determine Input Mode

Check the argument string and triggering message for a change description:
- If a non-slug argument is present (e.g., `/em:update add observability to phase 3`), treat everything after the slug as `CHANGE_DESCRIPTION`
- If neither: `CHANGE_DESCRIPTION` is empty -> annotation mode

Set `INPUT_MODE`:
- `conversational` — `CHANGE_DESCRIPTION` is non-empty
- `annotations` — scan plan files for `>` / `>>` markers
- If both present, process conversational change first, then apply any annotations

## Step 1: Process Conversational Change (if INPUT_MODE includes `conversational`)

Read `plan.md` and any relevant `tasks/*.md` to understand current structure.

Translate `CHANGE_DESCRIPTION` into concrete edits:
1. Identify exactly which files are affected
2. Determine what needs to change -- specific new text, removed lines, renamed sections
3. Show a concise preview before applying:

```
Proposed changes for: "{CHANGE_DESCRIPTION}"

  plan.md
    + Phase 2: add observability milestone under deliverables

  tasks/develop.md
    + Task: "Set up distributed tracing with OpenTelemetry"
    + Failure mode: "Trace context lost across service boundaries"

Apply these changes?
```

If the change marks a task as done, after applying offer: "Push status update to Linear? (uses `mcp__linear-server__save_issue` with completed state)"

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
grep -rn "^>" {PLAN_DIR}/plan.md {PLAN_DIR}/tasks/ 2>/dev/null
grep -rn ">>" {PLAN_DIR}/plan.md {PLAN_DIR}/tasks/ 2>/dev/null
```

For each annotation, parse: FILE, LINE_NUM, CONTENT (before `>>`), INSTRUCTION.

If `INPUT_MODE=annotations` and no annotations found:
```
No annotations found in {slug}.

To annotate, edit plan.md or tasks/*.md directly:
  > rewrite this section for the new approach     -- applies to next block
  - task name >> mark done                        -- applies to this line
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
- Verify task milestone files still exist: `{PLAN_DIR}/tasks/design.md`, `tasks/develop.md`, `tasks/deploy.md`
- Check milestone naming and task numbering is consistent throughout `plan.md`
- Verify "NOT this period" section still accurately reflects deferrals

## Step 5: Validation Pass

Run 2 validation rounds autonomously — no user prompts.

For each round, launch parallel agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Plan-level agent** -- checks `plan.md`: milestones have objectives/deliverables/risks, assumptions listed.

**Per-task-file agents** -- one per `tasks/*.md` file touched in this update: each task has requirements, ACs, design/SA fields filled; tasks are specific and actionable.

Collect results (`TaskOutput block: true`). Auto-fix any `NEEDS_IMPROVEMENT` issues. Run round 2 after fixes. Cap at 3 rounds.

## Step 6: Report

```
Updated: {slug}

  Changes applied:
    plan.md:24           -- added observability milestone
    tasks/develop.md:8   -- added OpenTelemetry task

  Validation: {N} rounds -- {PASS | X issues remain}
```

If an annotation was ambiguous or could not be applied:
```
⚠️  Skipped annotation at {file}:{line}: {reason}
    Annotation preserved — resolve manually.
```

## Step 7: Notify (--bg only)

If `BG_MODE=true` and `SILENT=false`:

```bash
npx @codevoyant/agent-kit notify --title "em:update complete" --message "Roadmap '{slug}' updated"
```
