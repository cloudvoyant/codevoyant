# Workflow: flow doctor

Diagnose — and with `--fix`, repair — the health of one flow or every flow across both scopes. Dry-run by default: it reports and changes nothing unless `--fix` is passed.

A flow has two parts (see `references/flow-dir.md`): a read-only **definition** (`flow.md` + `implementation/step-N.md`, local or global) and one or more local **run instances**. Run instances live **flat under `.codevoyant/flows/`**, beside the definitions: each is a directory `.codevoyant/flows/{flow-slug}-{plan-slug}/` (or a provisional `.codevoyant/flows/{flow-slug}-_pending-{run-id}/` before adoption; or, for pre-PR runs, a legacy `.codevoyant/runs/{flow-slug}/` with state files directly inside) holding `run.md` + `progress.md` + `context.md`. `run.md` records the run's resolved identity (flow slug, branch, spec-slug, worktree) and is the concrete anchor doctor uses both to tell a legitimately-interrupted `context.md` from a clobbered one **and** to confirm a discovered instance really belongs to this flow. Doctor checks the definition plus **every** run instance of each flow, and understands that a run instance whose definition is global is **normal**, not corruption.

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

For each target definition, also enumerate **all** its **run instances** (always local; `{flow-slug}` = the definition's directory name). Run-state now lives **flat under `.codevoyant/flows/`**, beside the definitions, each instance named `{flow-slug}-{plan-slug}`; the original pre-PR layout lived at `.codevoyant/runs/{flow-slug}/` (state files directly inside, keyed by flow-slug only). Because `.codevoyant/flows/` mixes definitions and instances — and one flow slug can be a hyphen-prefix of another (`auto` vs `auto-review`) — discovery must **not** trust the `{flow-slug}-*` glob alone (see `references/flow-dir.md` → *Resolving / discovering instances*): a candidate must (1) hold a `progress.md` (definitions hold `flow.md`, so they're excluded), **and** (2) have a `run.md` recording `slug: {flow-slug}` (the authoritative filter — rejects a hyphen-prefixed neighbour like `auto-review-{plan}/` when discovering flow `auto`). Collect every `RUN_DIR` from both current and legacy:
```bash
FLOW_STATE_ROOT=".codevoyant/flows"              # instances live flat here, beside definitions
LEGACY_RUNS_DIR=".codevoyant/runs/{flow-slug}"   # legacy: original pre-PR run-state root
RUN_DIRS=()
# current: flat {flow-slug}-* instances (incl. provisional _pending) with progress.md AND run.md slug == {flow-slug}
for d in "$FLOW_STATE_ROOT"/{flow-slug}-*/; do
  [ -f "$d/progress.md" ] || continue                                          # excludes definitions
  [ "$(sed -n 's/^slug: *//p' "$d/run.md" 2>/dev/null)" = "{flow-slug}" ] || continue   # excludes prefix-colliding flows
  RUN_DIRS+=("${d%/}")
done
# legacy: state files directly under the original .codevoyant/runs/{flow-slug}/ dir
[ -f "$LEGACY_RUNS_DIR/progress.md" ] && RUN_DIRS+=("$LEGACY_RUNS_DIR")
```
A flow may have **zero** run instances (never run here) — that is fine; skip the run-instance checks for it. When it has several (concurrent or historical runs), run the per-instance checks below **once for each** `RUN_DIR` in `RUN_DIRS`, reporting each instance separately.

**Load the run identity (per instance).** For the `RUN_DIR` currently being checked, if `RUN_DIR/run.md` exists (written by `go.md` when the run started — see `references/flow-dir.md` → *Run instance*), read it into `RUN_IDENTITY`: the recorded `slug`, `instance`, `adopted`, and any resolved `branch` / `spec-slug` / `worktree` fields (empty fields count as unknown). `RUN_IDENTITY` is the **authoritative record of what this run is** — the concrete anchor for Check 1, because the definition and `progress.md` only ever hold `{{placeholders}}`. If `run.md` is absent (e.g. a run that predates the identity file, or a legacy context beside the definition), `RUN_IDENTITY` is unavailable — treat that as "can't determine" everywhere below (which biases toward preserve).

**Inspect both context locations independently — do NOT first-match.** Two `context.md` files can coexist: the current run instance's (`RUN_DIR/context.md`) and a lingering legacy one beside the definition (`FLOW_DIR/context.md`, written by pre-run-instance runs). If we picked only the first that exists, a legacy clobber sitting beside the definition would never be inspected or cleaned. So build a list `CONTEXT_FILES` of **every** path that exists:
- `RUN_DIR/context.md` (if present) — checked against `RUN_IDENTITY`.
- `FLOW_DIR/context.md` (if present) — a legacy context. A legacy `context.md` beside a **global** definition (`FLOW_DIR` under `~/.codevoyant/flows`) is abnormal by construction — global definitions must never hold run-state — so it is always a clobber candidate under Check 1.

Run the checks below over each entry in `CONTEXT_FILES` (a flow with both gets both inspected).

## Step 1: Run the checks (per flow)

For each flow in the target set, read the definition `flow.md`, the definition's `implementation/` directory, the run-instance `progress.md` (if any), `RUN_IDENTITY` (from `run.md`, if any), and each entry in `CONTEXT_FILES` (if any). Evaluate each check and record `PASS` / `WARN` / `FAIL` with a one-line reason. Where a check inspects a context file, apply it to every entry in `CONTEXT_FILES`.

**Check 1 — Cross-run clobber (FAIL only on a positive clobber signal).** Only applies to a `context.md` that exists. Compare the context against the run's **recorded identity** (`RUN_IDENTITY` from `run.md`) — NOT against the flow's step text, which only ever holds `{{placeholders}}` and so has nothing concrete to match a real run against.

Scan the `context.md` handoff lines for concrete identifiers and map each to the `run.md` field it must be compared against — **use the same field names go.md writes** (see go.md Step 1's `run.md` template and Step 2.5's backfill mapping):
- handoff `branch=` ↔ `run.md` `branch:`
- handoff `slug=` (the resolved *spec* slug) ↔ `run.md` `spec-slug:` — **never** the flow's own top-level `slug:`
- handoff `worktree=` ↔ `run.md` `worktree:`

Then:
- **Positive clobber → FAIL.** `RUN_IDENTITY` is available AND records a concrete `branch` / `spec-slug` / `worktree`, AND the `context.md` names a *different* value for that same identifier (comparing each handoff token to its mapped `run.md` field above — e.g. `run.md` says `branch: feat/auth` but a `context.md` handoff says `branch=go-rust-odin-templates`, or `run.md` `spec-slug: add-oauth` vs a handoff `slug=teardown-migrator`) → `FAIL: context.md names '{X}' but this run's identity is '{Y}' — two runs likely shared one state file`. This is the only signal that a foreign run clobbered the state.
- **Legacy context beside a global definition → FAIL.** A `FLOW_DIR/context.md` under `~/.codevoyant/flows` is a clobber by construction (global definitions must never hold run-state), regardless of identity → `FAIL: legacy context.md beside global definition`.
- **Matches identity → PASS.** The context's identifiers agree with `RUN_IDENTITY` (or the run has committed to no conflicting identifier yet) → `PASS` (a legitimately-interrupted run — the resume payload).
- **Can't determine → PASS (preserve).** No `run.md` / no recorded identity, or `context.md` carries no comparable identifier → there is **no positive clobber signal**, so do NOT flag it. Record `PASS: no clobber signal (identity unavailable — preserved)`. Uncertainty must never escalate to a delete.

**Check 2 — Stale context (WARN/FAIL).** If a `context.md` exists AND the governing Status (run-instance `progress.md` Status if present, else definition `flow.md` Status) is `Complete` → `FAIL: context.md present but Status=Complete (should have been removed on completion)`. Else if no `context.md` → `PASS`.

**Check 3 — Orphaned worktree/branch (WARN).** For every worktree path and branch name mentioned in any `CONTEXT_FILES` handoff:
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

**Heal A — Remove clobbered/stale `context.md`.** Applied per file across `CONTEXT_FILES`.
Delete a `context.md` **only** when there is a positive signal that it is safe to remove:
- Check 1 FAILED with a **positive clobber signal** — its identifiers differ from `RUN_IDENTITY`, or it is a legacy `context.md` beside a global definition, OR
- Check 2 FAILED (Status=Complete).

**CRITICAL GUARD — the bias is PRESERVE; delete only on a positive signal.** The default for any `context.md` is to keep it: it may be the **resume payload** that `go.md` loads on resume, and deleting a live one is unrecoverable data loss. Therefore:
- Delete **only** when a check above produced a positive delete signal (a concrete identity mismatch, a legacy global-scope context, or Status=Complete).
- **Preserve on uncertainty.** If Check 1 could not determine a clobber — no `run.md` / no recorded identity, or no comparable identifier in the context — that is *not* a delete signal. Never delete "just in case." Report `context.md preserved (no positive clobber signal — resume payload may be live)` and skip.
- **Preserve on match.** If the context's identifiers agree with `RUN_IDENTITY` and Status is not `Complete`, report `context.md preserved (matches run identity — legitimate interrupted run)` and skip.

A doctor that occasionally leaves a stale file is fine; one that occasionally deletes a live resume payload is not.

**Announce global-scope deletions explicitly.** Deleting a `FLOW_DIR/context.md` under `~/.codevoyant/flows` is the one `--fix` path that writes into global scope (`$HOME`). Before removing it, print an explicit notice — `⚠ Deleting a file under ~/.codevoyant/flows (global scope): {path}` — then `→`/`✓` as usual, so a user running `doctor --fix` locally is never surprised by a `$HOME` mutation.

**Heal B — Reset Status Active → Complete.** In the governing checklist (`RUN_DIR/progress.md` if it exists, else the definition `flow.md` — but only reset the definition's Status if the flow has no run instance, since a definition should stay a template), if every step line is `[x]` but Status is `Active`, set Status to `Complete`. Prefer fixing the run instance.

**Heal C — Regenerate missing `implementation/step-N.md` stubs.** For each step line in the definition `flow.md` that has no corresponding `implementation/step-N.md`, generate a stub from `references/step-template.md` filled with `{N}`, the step command (placeholders verbatim), `{flow-name}` = slug, `{total}` = step count. Report each generated stub. If there are **extra** step files (more files than step lines) or the mapping is otherwise ambiguous, do NOT delete anything — report `count mismatch requires manual review: {details}`.

**Heal D — Migrate old-schema `flow.md` to the current template.** Conservatively backfill only the missing sections/fields identified in Check 5, preserving all existing content: add absent Metadata fields (with best-effort values — `Slug` from dir name, `Scope` from location, `Created`/`Status` left as `unknown`/`Active` if not derivable), and add an empty `## Parameters` (`_none_`) or `## Steps` section only if entirely absent. Never reorder or remove existing content. Report exactly which sections were backfilled.

**Heal E — Prune deleted-worktree references from `context.md`.** For each worktree/branch flagged orphaned in Check 3, remove or annotate that reference in the owning file from `CONTEXT_FILES` (strip the dead `worktree=`/`branch=` token from the handoff line, keep the rest). Report each pruned reference. (Skip any file Heal A already deleted.)

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
