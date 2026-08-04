# update

Update a spec plan. Accepts two input modes:
- **Annotations**: `<!-- > ... -->` and `<!-- >> ... -->` HTML-comment markers already written directly in plan files
- **Conversational**: a plain-language description of what to change

## Completion Contract

This workflow must never stop after a preview, inconsistency, validation finding, tool failure, or agent refusal without a terminal result. It succeeds only after applying concrete changes to every affected plan artifact and confirming validation passes. If safe edits can be determined, apply them before considering escalation. If one essential decision prevents a remaining edit or repair, preserve the annotation and every completed safe edit, then output exactly one `NEEDS_INPUT: {one concrete question}` line and stop without reporting the update complete.

On OpenCode, OpenAI Terra, and any host without `AskUserQuestion`, use `NEEDS_INPUT:` instead of an interactive prompt. Do not wait for an unsupported prompt, treat a validation report as completion, or return a refusal in place of applying deterministic edits.

## Annotation syntax

Annotations are HTML comments so they never collide with real markdown blockquotes. Scan for `<!-- >>` (major) BEFORE `<!-- >` (minor); the instruction is the text between the marker and the closing `-->`, and the comment may span multiple lines.

**`<!-- > instruction -->`** — minor annotation, standalone comment applies to the block immediately below it:
```markdown
<!-- > rewrite this phase for OAuth — drop all JWT references -->
### Phase 2 - Authentication
```

**`content <!-- >> instruction -->`** — major annotation, inline suffix applies to that specific line:
```markdown
1. [ ] Set up Passport.js <!-- >> mark done -->
2. [ ] Add refresh tokens <!-- >> remove this task -->
```

Both can appear in `plan.md` and any `implementation/phase-N.md`. When applying an annotation, remove the ENTIRE `<!-- ... -->` comment.

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

If the plan is absent or the caller has not identified a plan, output exactly one `NEEDS_INPUT:` question that asks for the plan name or path. Do not stop with a missing-file message alone.

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

If an interactive confirmation is unavailable, output exactly one `NEEDS_INPUT:` question containing the concise preview and asking whether to apply it. Do not leave the preview as the final workflow output.

After applying, continue to Step 4.

## Step 4: Process Annotations (if INPUT_MODE includes `annotations`)

Scan all plan files:

```bash
grep -rn "<!-- >>" .codevoyant/plans/{plan-name}/plan.md .codevoyant/plans/{plan-name}/implementation/ 2>/dev/null
grep -rn "<!-- >" .codevoyant/plans/{plan-name}/plan.md .codevoyant/plans/{plan-name}/implementation/ 2>/dev/null
```

Apply the `spec-updater` agent (see `agents/spec-updater.md`) to process all annotations.

If no annotations are found and INPUT_MODE is `annotations` only, output exactly one `NEEDS_INPUT:` question asking which concrete plan change the user wants applied. Do not report a successful update when no mutation was requested.

## Step 5: Report

```
✓ Updated plan: {plan-name}

  Changes applied:
    {file}:{line} — {description}
    ...

  Validation: {N} rounds — PASS

  Registry updated: {completed}/{total} tasks
```

Report this success block only when at least one requested mutation was applied and validation returned `PASS`. If an annotation is ambiguous or a validation blocker cannot be repaired from the plan and repository facts, preserve the unresolved annotation, retain completed safe changes, and output exactly one `NEEDS_INPUT:` question naming the file, line, competing interpretations, and required decision. Do not report `X issues remain`, `Skipped annotation`, a refusal, or a successful update as the terminal result.

## Step 5.5: Completion Report (--bg only)

If `BG_MODE=true` and `SILENT=false`, report completion to the user with a brief summary stating plan `{plan-name}` was updated.
