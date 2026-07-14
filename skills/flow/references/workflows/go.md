# Workflow: flow go

Execute all pending (unchecked) steps of a named flow sequentially. Each step runs as a blocking foreground subagent. Parameters (`{{placeholders}}`) are resolved from user input before running, and each step's key outputs are threaded forward into later steps as **flow context**. After each step completes, mark it `[x]` in `flow.md` before proceeding.

Steps run **non-interactively** — a subagent cannot prompt the user. When a step genuinely needs an answer it can't derive, it returns a `NEEDS_INPUT:` line and this orchestrator (on the main thread) asks the user and re-runs the step. This is how interactive skills chained in a flow still reach the human.

## Step 0: Parse arguments

```
--global / -g   → read the flow from ~/.codevoyant/flows (see references/flow-dir.md)
--set key=value → bind a named parameter (repeatable, e.g. --set feature="add OAuth" --set env=staging)
--branch, etc.  → any other flag → PASSTHROUGH_FLAGS (see references/flow-dir.md), appended to every step this run
FLOW_NAME = first positional arg (POSITIONALS[0]; required)
INPUT     = all remaining positional text (POSITIONALS[1..]), joined with spaces → the {{input}} parameter
```

Parse flags via `references/flow-dir.md`, iterating the **preserved argv** (`"$@"`) — never re-split a flattened string. From the resulting `PASSTHROUGH_FLAGS`, pull out any `--set key=value` pairs into `PARAMS` (below); the remainder (e.g. `--branch feature/x`) stays in `PASSTHROUGH_FLAGS` and is appended to every step command this run (Step 2).

If `FLOW_NAME` is missing, error: "Usage: /flow go <name> [input text] [--set k=v] [--global]. A flow name is required."

Build the parameter map `PARAMS`:
- `input` = `INPUT` (the joined free text), if any
- each `--set key=value` → `PARAMS[key] = value`

## Step 0.5: Resolve the flow definition and local run instance

Resolve `FLOW_DIR` (the **definition** — read-only) per `references/flow-dir.md` (local-first, then global; `--global` forces global only). If not found in any scope, error: "Flow '{FLOW_NAME}' not found (looked in local and global). Run /flow new {FLOW_NAME} first."

Then resolve the **run instance** per `references/flow-dir.md` → *Run instance*. Run instances live **flat under `.codevoyant/flows/`** — beside the flow definitions — each named `{flow-slug}-{plan-slug}` (keyed by the run's resolved spec-plan slug). The slug does not exist yet at this point, so **bootstrap a provisional instance**: mint `RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"` and set `FLOW_STATE_ROOT=".codevoyant/flows"`. On a **fresh run**, `RUN_DIR="$FLOW_STATE_ROOT/{flow-slug}-_pending-$RUN_ID"` (the provisional is namespaced by `{flow-slug}` — the definition's directory name — so it never collides with another flow's provisional); on a **resume**, reattach `RUN_DIR` to this run's existing directory instead of minting a new one — the adopted `$FLOW_STATE_ROOT/{flow-slug}-{plan-slug}/` if present, else the newest non-`Complete` `$FLOW_STATE_ROOT/{flow-slug}-_pending-*/` whose `run.md` records `slug: {flow-slug}` (also recognize a legacy `.codevoyant/runs/{flow-slug}/progress.md` sitting directly under the legacy flow dir — reuse `.codevoyant/runs/{flow-slug}/` as `RUN_DIR` in that case). The run instance is **always local**, even when the definition is global. `mkdir -p "$RUN_DIR"`.

**Pre-adoption resume is best-effort by recency.** Once a run has adopted, its `{flow-slug}-{plan-slug}/` is unambiguous. But if **two** runs of this flow were both interrupted *before* adoption, there are multiple non-`Complete` `{flow-slug}-_pending-*/` dirs and no plan slug yet to tell them apart — reattaching to the newest by mtime may pick the wrong one. Disambiguate cheaply: if the current invocation carries identifying params (`--set`/`input`, or an explicit `--branch`), prefer the provisional whose `run.md`/`context.md` **matches** those (e.g. same `branch:` or objective); otherwise fall back to newest-mtime and note it — `ℹ Multiple interrupted runs of '{FLOW_NAME}' found; resuming the most recent ({flow-slug}-_pending-{RUN_ID}). Pass matching --set/--branch to target a specific one, or /flow status to inspect.` Do not silently guess when it's ambiguous.

**The definition is a template — this workflow never writes to `FLOW_DIR`.** All mutable run-state (`progress.md`, `context.md`) is written under `RUN_DIR` only.

## Step 1: Read the definition, seed the run instance, resolve parameters

Read the **definition** `FLOW_DIR/flow.md` (read-only). Parse the Steps checklist and the Parameters section.

**Seed the run instance's progress file.** The mutable checklist lives at `RUN_DIR/progress.md`, never in the definition. Classify the existing run instance into one of three states and act accordingly:
- **First run** (`RUN_DIR/progress.md` does not exist): copy the definition's `## Steps` checklist verbatim into `RUN_DIR/progress.md` (keep the `N. [ ] {{placeholder}}` lines exactly, all unchecked). Prepend a one-line header `# Run progress: {slug}` and a `Status: Active` line so `status` and `doctor` can read it.
- **Completed run → re-seed** (`RUN_DIR/progress.md` exists AND every step line is `[x]`, or its `Status` is `Complete`): the previous run of this flow finished. A finished run must be able to run again cleanly, so treat this as a fresh start, not a resume. **Archive the stale run instance, then re-seed as a first run:** move any existing `RUN_DIR/progress.md`, `RUN_DIR/context.md`, and `RUN_DIR/run.md` into `RUN_DIR/archive/{completed-timestamp}/` (best-effort — create the dir, `mv` what exists; if archiving fails, delete them instead so the re-seed is clean), then re-run the **First run** seeding above to write a new all-unchecked `progress.md` (Status: Active) and, below, a new `run.md`. Do NOT load the old `context.md` into `CONTEXT` — a re-run starts clean.
- **Resume** (`RUN_DIR/progress.md` exists AND is only partially complete — at least one `[ ]` line remains AND Status is not `Complete`): a genuinely in-progress run was interrupted. Use it as the source of truth for which steps are already `[x]` — do NOT re-seed from the definition, and do NOT wipe it.

**Write the run instance's identity file.** The definition's step text only ever holds `{{placeholders}}`, so the resolved identity of *this* run must be recorded explicitly — otherwise nothing downstream (notably `/flow doctor`) can tell a legitimately-interrupted run apart from a foreign run that clobbered the state file. On **first run** (and on a **completed → re-seed**, which archived the old `run.md` above and now starts fresh), write `RUN_DIR/run.md`:
```
# Run identity: {slug}
slug: {slug}                    # the FLOW's own slug (definition dir name) — never overwritten
definition: {FLOW_DIR}          # absolute or scope-qualified path to the definition
scope: {local|global}           # scope of the definition
started: {ISO timestamp}
instance: {flow-slug}-_pending-{RUN_ID}   # current instance dir basename under .codevoyant/flows/ — renamed to {flow-slug}-{plan-slug} on adoption
adopted: false                  # flips to true once the provisional dir is renamed to {flow-slug}-{plan-slug}
# resolved run identifiers (backfilled as steps produce them — see Step 2.5):
branch:                         # ← handoff branch=
spec-slug:                      # ← handoff slug=  (the resolved spec slug; distinct from the flow slug above)
worktree:                       # ← handoff worktree=
```

**`instance:`/`adopted:` must match where `run.md` physically lives.** The `{flow-slug}-_pending-{RUN_ID}` / `adopted: false` values above are correct **only for a fresh run**, whose `RUN_DIR` really is a provisional `{flow-slug}-_pending-{RUN_ID}/` dir. A **completed → re-seed** re-seeds *in place* — its `RUN_DIR` is the run's already-adopted `{flow-slug}-{plan-slug}/` directory (or a legacy `.codevoyant/runs/{flow-slug}/` dir), not a provisional one. Writing `…-_pending-…`/`adopted: false` there would immediately mis-record the identity (claiming a provisional instance while living in `{flow-slug}-{plan-slug}/`) and then, on the re-run's first `slug=`, mislead the adoption check into a false "already exists (not clobbering)". So set these two fields from the actual `RUN_DIR` basename:
- **RUN_DIR is a provisional `{flow-slug}-_pending-{RUN_ID}/` dir** (fresh run) → `instance: {flow-slug}-_pending-{RUN_ID}`, `adopted: false`.
- **RUN_DIR is already an adopted `{flow-slug}-{plan-slug}/` dir, or a legacy `.codevoyant/runs/{flow-slug}/` dir** (in-place re-seed) → `instance: {basename of RUN_DIR}` (`{flow-slug}-{plan-slug}`, or the flow-slug for legacy), `adopted: true`. The run keeps its already-earned identity; adoption below is a no-op for it.

This file is the **authoritative record of what this run is**. `doctor` compares `context.md`'s handoff identifiers against `run.md` (not against placeholder step text) to decide whether a `context.md` belongs to this run or was clobbered by another. On **resume**, leave an existing `run.md` in place (do not overwrite the recorded identity); only backfill empty fields if later steps resolve them.

**Resolve every `{{placeholder}}` used anywhere in the steps:**
1. Scan all step commands for `{{name}}` tokens; collect the unique set `NEEDED`.
2. For each token in `NEEDED`:
   - If `PARAMS[name]` is already set (from `--set`, or `input` from free text) → use it.
   - Else → **prompt the user once** for the value, using AskUserQuestion (free-text via Other): question `Value for {{name}}?`, header `Parameter`, and (for `{{input}}`) show the flow's Parameters description as help. Store the answer in `PARAMS[name]`.
3. Do not proceed with any unresolved token. If the user dismisses a prompt, abort: "Cancelled — {{name}} is required to run this flow."

Collect the pending steps: all lines in `RUN_DIR/progress.md` matching `N. [ ] ...` (unchecked), in order. A completed run was already re-seeded above (so its steps are all unchecked again and there will be pending steps); reaching zero pending here therefore means a resumed instance whose remaining steps are all done — report "Flow '{FLOW_NAME}' is already complete." and exit.

Initialize the **flow context** accumulator `CONTEXT`. **On resume (partial run only):** if `RUN_DIR/context.md` exists (an earlier, interrupted run that was NOT re-seeded above), load it into `CONTEXT` so the remaining steps keep the handoffs from steps already marked `[x]`. Otherwise start empty (a first run, or a completed → re-seed, which archived the old context and starts clean). (Without this, a resumed flow loses e.g. the PR number a completed `pr open` step produced.)

## Step 2: Execute steps sequentially

For each pending step in order:

1. **Substitute parameters** in the step command: replace every `{{name}}` with `PARAMS[name]`, then merge this run's `PASSTHROUGH_FLAGS` (e.g. `--branch feature/x`) into the command string. **Run-time flags override baked ones (deterministic merge):** a step may already carry a flag baked in at `new` time (e.g. `/spec new {{objective}} --branch feature/x`). For each flag in `PASSTHROUGH_FLAGS`, key on its flag name (the token before any `=`, e.g. `--branch`):
   - If that flag name already appears as a whole-word token in the step command **and** the run-time value differs, **replace** the baked flag (and its value) with the run-time one — the explicit run-time value wins. Report the override: `ℹ Step {N}: --branch overridden by run-time value (baked '{old}' → '{new}')`.
   - If it appears with the **same** value, leave the single baked copy (no duplicate).
   - If it does not appear, append the run-time flag (and its value).

   This makes precedence deterministic: run-time `PASSTHROUGH_FLAGS` always take effect, and a flag never appears twice. Call the result `RESOLVED_COMMAND`. Report: `▶ Step {N}: {RESOLVED_COMMAND}`

2. Read `FLOW_DIR/implementation/step-N.md` to get the agent prompt. Prepare the prompt for this run by filling its injection points:
   - Replace `{step-command}` occurrences with `RESOLVED_COMMAND` (substitute `{{placeholders}}` here too).
   - Fill the **Parameters** section with the resolved `key = value` pairs (or "none").
   - Fill the **Flow context so far** section with `CONTEXT` (or "(nothing yet — this is the first step)" when empty).

3. Launch a **blocking** (foreground) subagent:
   ```
   Agent(
     subagent_type: general-purpose,
     run_in_background: false,
     description: "Flow step {N}: {RESOLVED_COMMAND}",
     prompt: {filled contents of step-N.md}
   )
   ```
   Wait for the subagent to return. It runs the skill **non-interactively** and, if it can't resolve a required decision from Parameters/Flow context, returns a `NEEDS_INPUT:` line rather than guessing or blocking.

4. **Handle NEEDS_INPUT (interactive escalation).** If the subagent's report ends with `NEEDS_INPUT: {question}`:
   a. You are on the main thread — ask the user that `{question}` with **AskUserQuestion** (free-text via Other).
   b. Add the answer to `PARAMS` (so later steps can reuse it) and note it in `CONTEXT`, then **re-run this step** from sub-step 2 with the answer now available.
   c. Cap at 3 escalations per step; if the step still returns `NEEDS_INPUT` after that, treat it as a step failure (below).
   This is what lets an interactive skill's mid-run question (e.g. `/dev explore` asking "generate proposals?", or `/spec new` needing to pick an exploration) reach the user even though the step ran in a subagent.

5. **Capture the handoff.** Read the subagent's returned report. Extract the `HANDOFF:` line if present; otherwise summarize the key outputs (IDs, URLs, paths, names) in one line yourself. Append to `CONTEXT`:
   ```
   [step {N} · {RESOLVED_COMMAND}] → {handoff or one-line summary}
   ```
   Keep `CONTEXT` terse — it is injected into every later step, so it must stay a short bulleted log, not full transcripts. **Persist it:** write the accumulated `CONTEXT` to `RUN_DIR/context.md` (the local run instance — **never** beside the definition) so an interrupted flow can resume with it (see Step 1).

   **Backfill the run identity.** If this handoff resolved a concrete `branch`, spec slug, or `worktree` (e.g. a `spec new`/`pr open` step reporting `branch=…`, `slug=…`, `worktree=…`), write those values into the matching empty fields of `RUN_DIR/run.md`. **Field mapping — be exact:** a handoff `slug=` (the resolved *spec* slug from a `spec new`/`spec go` step) maps to `run.md`'s `spec-slug:` field, **never** to the top-level `slug:` (which is the flow's own slug, already populated at first run and never overwritten); handoff `branch=` → `branch:`; handoff `worktree=` → `worktree:`. Only fill fields that are still empty — never rewrite an already-recorded identifier (the first value a run commits to is its identity; a later differing value would be the clobber `doctor` looks for). This keeps `run.md` the concrete, resolved anchor `doctor` compares `context.md` against.

   **Adopt the instance directory (first `slug=` only).** If this is the **first** handoff to resolve a `slug=` (i.e. `run.md`'s `adopted:` is still `false`) and the run instance is still under a provisional `{flow-slug}-_pending-{RUN_ID}/` directory, adopt it to the plan slug per `references/flow-dir.md` → *Bootstrapping*: with `PLAN_SLUG` = the resolved spec slug and `TARGET_DIR="$FLOW_STATE_ROOT/{flow-slug}-$PLAN_SLUG"` (i.e. `.codevoyant/flows/{flow-slug}-$PLAN_SLUG`), move the provisional dir onto `TARGET_DIR`, then point `RUN_DIR` at it and set `run.md`'s `instance: {flow-slug}-{plan-slug}` and `adopted: true`.

   Two guards make this correct:
   - **Already adopted → no-op.** If `run.md`'s `adopted:` is already `true`, this run owns its `{flow-slug}-{plan-slug}/` (or legacy) dir — skip adoption entirely. In particular, when `TARGET_DIR` **is this run's own current `RUN_DIR`** (an in-place re-seed that started life adopted, per Step 1), there is nothing to move: it is already adopted, not a collision.
   - **Atomic claim, no TOCTOU.** Do **not** test `[ ! -e TARGET_DIR ]` then `mv` — between the test and the move a concurrent run could create `TARGET_DIR`, and `mv` would then nest the provisional dir *inside* it (`{flow-slug}-{plan-slug}/{flow-slug}-_pending-{RUN_ID}/`). Claim the slug atomically with `mkdir "$TARGET_DIR"` (fails iff it already exists), and only on a successful claim move the provisional dir's contents into it:
   ```bash
   if [ "$(sed -n 's/^adopted: *//p' "$RUN_DIR/run.md")" = "true" ]; then
     :  # already adopted (fresh-adopted earlier, or an in-place re-seed) — no move
   elif mkdir "$FLOW_STATE_ROOT/{flow-slug}-$PLAN_SLUG" 2>/dev/null; then
     # won the atomic claim: move provisional contents (incl. dotfiles) into the claimed dir, drop the empty shell
     mv "$RUN_DIR"/* "$RUN_DIR"/.[!.]* "$FLOW_STATE_ROOT/{flow-slug}-$PLAN_SLUG"/ 2>/dev/null
     rmdir "$RUN_DIR" 2>/dev/null
     RUN_DIR="$FLOW_STATE_ROOT/{flow-slug}-$PLAN_SLUG"
     # then rewrite run.md: instance: {flow-slug}-{plan-slug} ; adopted: true
   else
     # lost the claim (dir already exists) — another run of this flow owns that plan slug
     echo "ℹ Kept provisional run dir — '{flow-slug}-$PLAN_SLUG' already exists (not clobbering)."
   fi
   ```
   If the claim is lost (`TARGET_DIR` already exists, owned by another run of this flow), **do not move** — keep the provisional directory, leave `adopted: false`, and report `ℹ Kept provisional run dir — '{flow-slug}-{plan-slug}' already exists (not clobbering).` All subsequent writes this run (progress.md, context.md, run.md) use the updated `RUN_DIR`.

6. Update `RUN_DIR/progress.md` — change this step's `[ ]` to `[x]` (keep the original `{{placeholder}}` text; only the run used resolved values). **Never modify the definition's `FLOW_DIR/flow.md`** — it stays a pristine template. Leave `Status` in `progress.md` as `Active` until all steps complete.

7. Report: `✓ Step {N} complete.`

8. Proceed to next pending step.

**On step failure:** if a subagent reports it could not complete (blocking error), stop the loop, leave the step unchecked in `RUN_DIR/progress.md`, and report which step failed and why. `CONTEXT` is already persisted to `RUN_DIR/context.md`, so re-running `/flow go` resumes from this step with prior context intact. Do not run later steps — they likely depend on this one's context.

## Step 3: Final report

After all steps are complete, update `Status` in `RUN_DIR/progress.md` to `Complete` and remove `RUN_DIR/context.md` (a fresh run starts clean). Leave `RUN_DIR/progress.md` (now all `[x]`, `Status: Complete`) and `RUN_DIR/run.md` in place — together they are the completed run's record. This finished state is **not** a dead end: because `progress.md` survives, the next `/flow go` of this flow hits Step 1's **completed run → re-seed** branch (all `[x]` / `Status: Complete`), which archives this instance and seeds a clean new run — so a completed flow can always be run again. Leave the definition's `FLOW_DIR/flow.md` untouched — it was never mutated.

Report:
```
✅ Flow "{FLOW_NAME}" complete. All {N} steps finished.

  Parameters used: {key=value list, or "none"}
```
