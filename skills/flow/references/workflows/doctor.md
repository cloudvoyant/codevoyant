# Workflow: flow doctor

Diagnose — and with `--fix`, repair — the health of one flow or every flow across both scopes. Dry-run by default: it reports and changes nothing unless `--fix` is passed.

A flow has two parts (see `references/flow-dir.md`): a read-only **definition** (`flow.md` + `implementation/step-N.md`, local or global) and a local **run instance** (`.codevoyant/runs/{slug}/progress.md` + `context.md`). Doctor checks both and understands that a run instance whose definition is global is **normal**, not corruption.

## Step 0: Parse arguments

```
--fix           → apply repairs (default: diagnose only, change nothing)
--global / -g   → target ONLY the global scope (~/.codevoyant/flows); see references/flow-dir.md
FLOW_NAME       → first non-flag positional arg (OPTIONAL). If omitted, scan ALL flows in scope.
```

Strip `--fix` and `--global`/`-g` before reading the positional name.

`FIX=false`; set `FIX=true` if `--fix` is present.

## Step 0.5: Resolve the target set

- **A name was given:** resolve the single **definition** `FLOW_DIR` per `references/flow-dir.md` (local-first, then global; `--global` forces global). If not found in any scope, error: "Flow '{FLOW_NAME}' not found (looked in local and global). Run /flow new {FLOW_NAME} first." The target set is that one flow.
- **No name:** enumerate every flow definition in scope, exactly as `list.md` Step 1 does:
  ```bash
  # local (skip if --global)
  [ -d .codevoyant/flows ] && for d in .codevoyant/flows/*/; do [ -f "$d/flow.md" ] && echo "local $d"; done
  # global (always, unless --local semantics — here --global restricts to this line)
  [ -d "$HOME/.codevoyant/flows" ] && for d in "$HOME"/.codevoyant/flows/*/; do [ -f "$d/flow.md" ] && echo "global $d"; done
  ```
  If `--global` was passed, enumerate only the global line. The target set is every definition found. If none, report "No flows found. Create one: /flow new <name> ..." and exit.

For each target definition, also resolve its **run instance**: `RUN_DIR=".codevoyant/runs/{slug}/"` (always local; `{slug}` = the definition's directory name). The run instance may not exist (flow never run here) — that is fine.

Also determine a **legacy context path**: `FLOW_DIR/context.md`. Pre-Phase-1 runs wrote `context.md` beside the definition; doctor inspects it too. For the checks below, `CONTEXT_FILE` = `RUN_DIR/context.md` if it exists, else `FLOW_DIR/context.md` if it exists, else none. A `context.md` found **beside a global definition** (`FLOW_DIR/context.md` under `~/.codevoyant/flows`) is itself abnormal — flag it under check 1/2 as legacy clobber.

## Step 1: Run the checks (per flow)

For each flow in the target set, read the definition `flow.md`, the definition's `implementation/` directory, the run-instance `progress.md` (if any), and `CONTEXT_FILE` (if any). Evaluate each check and record `PASS` / `WARN` / `FAIL` with a one-line reason.

**Check 1 — Cross-run clobber (FAIL).** Only applies if a `context.md` exists. Extract from the flow's own step commands (in `flow.md` / `progress.md`) the identifiers this flow is expected to produce/consume — the skill verbs and any literal slugs. Then scan `context.md`'s handoff lines for a branch name, spec slug, or worktree path. If `context.md` references a branch / spec-slug / worktree that is **inconsistent** with this flow's own steps (e.g. a flow whose steps are `/spec new --branch {{prompt}}` … but whose `context.md` handoffs name an unrelated `go-rust-odin-templates` run that this flow's current parameters/steps would not produce) → `FAIL: context.md references '{X}' unrelated to this flow's steps — two runs likely shared one state file`. If the `context.md` handoffs are consistent with the flow's steps → this check is `PASS` (a legitimately-interrupted run). A `CONTEXT_FILE` located beside a **global** definition is inconsistent by construction (global definitions must not hold run-state) → `FAIL: legacy context.md beside global definition`.

**Check 2 — Stale context (WARN/FAIL).** If a `context.md` exists AND the governing Status (run-instance `progress.md` Status if present, else definition `flow.md` Status) is `Complete` → `FAIL: context.md present but Status=Complete (should have been removed on completion)`. Else if no `context.md` → `PASS`.

**Check 3 — Orphaned worktree/branch (WARN).** For every worktree path and branch name mentioned in `CONTEXT_FILE` handoffs:
- worktree path → check it exists on disk (`test -d {path}`).
- branch name → check it exists in git (`git rev-parse --verify --quiet {branch}` or `git worktree list`).
If a referenced worktree/branch no longer exists → `WARN: context references worktree/branch '{X}' that no longer exists`. If none referenced or all exist → `PASS`.

**Check 4 — Step-file drift (FAIL).** Count step lines in the definition `flow.md` `## Steps` (`N. [ ] ...` / `N. [x] ...`), call it `S`. Count `implementation/step-N.md` files in the definition, call it `F`. If `S != F` → `FAIL: {S} step lines but {F} step files (missing: {...} / extra: {...})`. Else `PASS`. (Compare against the DEFINITION only — `progress.md` is a checklist copy, not a step-file source, so it is never counted here.)

**Check 5 — Schema drift (WARN/FAIL).** Validate the definition `flow.md` against `references/flow-template.md`:
- Required Metadata fields: `Slug`, `Scope`, `Created`, `Status`.
- Required sections: `## Parameters`, `## Steps`.
Missing any → `FAIL: flow.md missing {section/field}`. Also spot-check that each `implementation/step-N.md` has the current shape from `references/step-template.md` (`## Flow context`, `## Agent prompt`); a step file missing these → `WARN: step-{N}.md on an obsolete template shape`. All present → `PASS`.

**Check 6 — Placeholder coherence (WARN).** Collect `{{token}}` set used across the definition's step commands = `USED`. Collect the tokens declared in the `## Parameters` section = `DECLARED`. If `USED - DECLARED` non-empty → `WARN: steps use undeclared parameter(s): {...}`. If `DECLARED - USED` non-empty → `WARN: declared but unused parameter(s): {...}`. If they match (or both empty / `_none_`) → `PASS`.

## Step 2: Apply heals (only when `FIX=true`)

Diagnose-only (`FIX=false`): skip this step entirely — never write anything.

When `FIX=true`, for each flow, apply the heals its checks warrant. **State each repair before applying it** (print `→ {what} …` then `✓ {result}`). Never touch a global **definition**'s `flow.md`/step files except the conservative schema migration in heal 4 (which is explicitly a definition repair) — never rewrite a definition's checkboxes.

**Heal A — Remove clobbered/stale `context.md`.**
Delete `CONTEXT_FILE` **only** when:
- Check 1 FAILED (inconsistent with this flow's own steps, including a legacy `context.md` beside a global definition), OR
- Check 2 FAILED (Status=Complete).

**CRITICAL GUARD — never delete a legitimately-interrupted context.** If Check 1 PASSED (the `context.md` handoffs ARE consistent with this flow's steps) AND Status is not `Complete`, the `context.md` is the **resume payload** that `go.md` loads on resume — do NOT delete it. This distinction is the whole point of the check: only clobbered or completed contexts are removed; a matching, mid-run context is preserved. If neither condition holds, report `context.md preserved (legitimate interrupted run — resume payload)` and skip the delete.

**Heal B — Reset Status Active → Complete.** In the governing checklist (`RUN_DIR/progress.md` if it exists, else the definition `flow.md` — but only reset the definition's Status if the flow has no run instance, since a definition should stay a template), if every step line is `[x]` but Status is `Active`, set Status to `Complete`. Prefer fixing the run instance.

**Heal C — Regenerate missing `implementation/step-N.md` stubs.** For each step line in the definition `flow.md` that has no corresponding `implementation/step-N.md`, generate a stub from `references/step-template.md` filled with `{N}`, the step command (placeholders verbatim), `{flow-name}` = slug, `{total}` = step count. Report each generated stub. If there are **extra** step files (more files than step lines) or the mapping is otherwise ambiguous, do NOT delete anything — report `count mismatch requires manual review: {details}`.

**Heal D — Migrate old-schema `flow.md` to the current template.** Conservatively backfill only the missing sections/fields identified in Check 5, preserving all existing content: add absent Metadata fields (with best-effort values — `Slug` from dir name, `Scope` from location, `Created`/`Status` left as `unknown`/`Active` if not derivable), and add an empty `## Parameters` (`_none_`) or `## Steps` section only if entirely absent. Never reorder or remove existing content. Report exactly which sections were backfilled.

**Heal E — Prune deleted-worktree references from `context.md`.** For each worktree/branch flagged orphaned in Check 3, remove or annotate that reference in `CONTEXT_FILE` (strip the dead `worktree=`/`branch=` token from the handoff line, keep the rest). Report each pruned reference. (Skip if Heal A already deleted the file.)

## Step 3: Report

Reuse the reporting style of `list.md`/`status.md`. Print a per-flow block, then a summary.

Per-flow block:
```
{scope} {slug}   ({def: local|global}, run instance: {present|none})
  [PASS] clobber        —
  [FAIL] stale-context  context.md present but Status=Complete
  [WARN] orphan         context references branch 'feat/x' that no longer exists
  [PASS] step-files     9 steps, 9 files
  [PASS] schema         —
  [WARN] placeholders   declared but unused: {{env}}
```

Summary:
```
Doctor summary: {N} flow(s) checked · {P} PASS · {W} WARN · {F} FAIL
```

Under `--fix`, append exactly what was repaired:
```
Repairs applied:
  {slug}: removed clobbered context.md; regenerated step-3.md
  {slug}: no repairs (all checks pass / nothing safely auto-fixable)
```

Diagnose-only footer:
```
Run /flow doctor {name if given} --fix to apply the repairs above.
```
