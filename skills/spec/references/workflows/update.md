# update

Update a spec plan. Accepts two input modes:
- **Annotations**: `<!-- > ... -->` and `<!-- >> ... -->` HTML-comment markers already written directly in plan files
- **Conversational**: a plain-language description of what to change

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
- `PERSISTENT_MODE` — true if `--persistent` present (experimental doc-aware mode)

```bash
PERSISTENT_MODE=false
[[ "$*" =~ --persistent ]] && PERSISTENT_MODE=true
```

## Step 1: Determine Input Mode

If `CHANGE_DESCRIPTION` is non-empty: `INPUT_MODE=conversational`
Otherwise: `INPUT_MODE=annotations`
If both present: process conversational change first, then apply any annotations found.

## Step 2: Select Plan

If `PLAN_NAME` not provided, follow the same plan selection logic as `refresh.md` Step 1.

Verify `.codevoyant/spec/{plan-name}/plan.md` exists.

## Step 2.5: Doc-aware Preflight (--persistent only)

Run only when `PERSISTENT_MODE=true`. Otherwise skip this step entirely.

Load `references/doc-aware.md` — the doc-aware model. All rules below are defined there; do not restate them.

**Rule 1 — valid-docs gate.** Check the repo has usable docs via the vendored validator (mirrors the docs skill's `validate` checks: structure + glob validity, with `exclude: true` for unmanaged docs). Exit 0 = valid:

```bash
if python3 "$SPEC_SKILL/scripts/validate_docs.py" --root . --docs docs; then
  DOCS_OK=true
else
  DOCS_OK=false
fi
```

**Rule 5 — graceful missing docs.** If `DOCS_OK=false`, print the graceful message and STOP. Do not apply any plan changes.

```
⚠️ Doc-aware updating requires valid docs, and this repo has none.
Run `/docs retcon` from the docs skill to author them (README, architecture
index, component docs with `globs:` frontmatter), then re-run this command
with `--persistent`. (The validator above printed the specific reason; docs
marked `exclude: true` are skipped as unmanaged.)
```

**Rule 2 — doc-aware gate before any write.** Before running the docs-first write, check the plan is actually doc-aware: read the plan's `Doc Globs:` metadata (plan.md). If the plan has no such line (it was created without `--persistent`), report that this plan is not doc-aware and stop with: `Plan {plan-name} is not doc-aware (no Doc Globs metadata). Re-run /spec new --persistent to recreate it.` Do not run `/docs update` against a plan that is not doc-aware.

**Rule 2 — docs-first write.** If the plan IS doc-aware and `DOCS_OK=true`, run the docs skill to refresh the docs before applying plan changes:

```bash
/docs update
```

## Step 3: Process Conversational Change (if INPUT_MODE includes `conversational`)

Read plan.md and relevant phase-N.md files. Translate `CHANGE_DESCRIPTION` into concrete edits — identify exactly which files and lines are affected, what changes in each.

**Doc-aware scoping (only when `PERSISTENT_MODE=true`):** for every concrete edit, check the target file against the plan's `Doc Globs:` using `$SPEC_SKILL/scripts/scope.py` (per `references/doc-aware.md` Rule 3). An edit whose target is NOT inside the globs is a boundary callout (Rule 6): list it in the preview under a `Boundary callouts:` line naming the file and why it crosses. Apply such an edit only when the user confirms it in the Apply/Adjust/Cancel choice; under `BG_MODE=true` auto-apply still prints the callout before applying. A change that would empty any phase's `**Write globs:**` list is refused — every phase keeps at least one write glob (Rule 3's no-globless-phases rule); propose a replacement glob instead.

Show user a concise preview:

```
Proposed changes for: "{CHANGE_DESCRIPTION}"

  plan.md
    + Phase 2, task 4: "Add retry logic with exponential backoff"

  implementation/phase-2.md
    + Step 4: Implement retry wrapper using existing HttpClient pattern
              Add validation: {task runner test command}

  Boundary callouts:
    docs/architecture/phase-2.md — edit writes docs/architecture/; the plan's globs are libs/auth/**, docs/**. Confirm?

Apply these changes?
```

If `BG_MODE=true`, auto-apply. Otherwise use **AskUserQuestion** (Apply / Adjust / Cancel).

After applying, continue to Step 4.

## Step 4: Process Annotations (if INPUT_MODE includes `annotations`)

**Doc-aware scoping (only when `PERSISTENT_MODE=true`):** apply the same Rule 3 glob check to every annotation. An annotation whose target falls outside the plan's `Doc Globs:` is a boundary callout: apply it, then record the crossing in the report's skipped/summary notes as `⚠️ Boundary callout at {file}:{line}: {reason}` (Rule 6 audit trail). An annotation that would empty a phase's `**Write globs:**` list is refused and reported as skipped — every phase keeps at least one write glob (Rule 3).

Scan all plan files:

```bash
grep -rn "<!-- >>" .codevoyant/spec/{plan-name}/plan.md .codevoyant/spec/{plan-name}/implementation/ 2>/dev/null
grep -rn "<!-- >" .codevoyant/spec/{plan-name}/plan.md .codevoyant/spec/{plan-name}/implementation/ 2>/dev/null
```

Apply the `spec-updater` agent (see `agents/spec-updater.md`) to process all annotations.

If no annotations found and INPUT_MODE is `annotations` only:
```
No annotations found in plan: {plan-name}
To annotate, edit any plan file directly:
  <!-- > rewrite this phase for OAuth -->          ← applies to next block
  1. [ ] Task name <!-- >> mark done -->           ← applies to this line
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

## Step 5.5: Completion Report (--bg only)

If `BG_MODE=true` and `SILENT=false`, report completion to the user with a brief summary stating plan `{plan-name}` was updated.
