# doc-aware — the experimental `--persistent` model for the spec skill

Single source of truth for the doc-aware mode enabled by `/spec new --persistent` and `/spec update --persistent`. `new.md`, `update.md`, `go.md`, and `agents/spec-executor.md` reference this file; do not restate these rules elsewhere. The model reuses the docs skill's ownership concepts (globs + public interfaces) but is owned by the spec skill and does not depend on the docs skill at runtime.

## The model

Doc-aware mode makes the repo's docs the source of truth for planning and execution: docs are written/updated first, every phase declares the doc globs it may write, subagents are restricted to those globs, and cross-module interaction happens only through documented public interfaces.

### Rule 1: Valid-docs gate

A repo is doc-aware-ready when BOTH hold:

- `docs/` exists and contains at least one markdown doc whose leading frontmatter carries a non-empty `globs:` list (any `docs/**/*.md` qualifies, including the index docs — they carry `globs: ["**"]` and are fine).
- The docs include an architecture index at the docs skill's mandated path (`docs/architecture/index.md`) or, failing that, at least one component doc that documents a public API/interface section.

Detection (best-effort, grep — the workflows run this verbatim):

```bash
DOCS_OK=false
if [ -d docs ]; then
  if grep -rlE '^globs:' docs --include='*.md' 2>/dev/null | grep -q .; then
    if [ -f docs/architecture/index.md ] || grep -rlE '@agent: \[public-api\]|^## (Public API|Public Interface)' docs --include='*.md' 2>/dev/null | grep -q .; then DOCS_OK=true; fi
  fi
fi
```

When `DOCS_OK=false`, the flow must NOT plan blind. It prints the graceful message and stops (see Rule 5).

### Rule 2: Docs-first write

The first step of any doc-aware flow is updating the docs so they reflect the current code before anything is planned. Run the docs skill:

```bash
/docs update    # refresh docs against the current branch diff
```

When docs are entirely missing, the graceful path (Rule 5) takes precedence and the flow stops instead. When docs exist, `/docs update` runs first; planning then reads the refreshed docs as context. Do not skip this step.

### Rule 3: Glob-scoped phases

Every phase of a doc-aware plan declares the doc globs it may write. Mechanics:

- The planner reads each component's `globs:` frontmatter from the docs and assigns every phase the globs of the components it touches.
- The phase file carries a `## Doc Scope` section listing those globs; plan.md metadata carries a `Doc Globs:` line (a space-separated union of the phases' globs).
- A phase may Write/Edit ONLY files inside its declared globs. Paths outside the globs are read-only context, not write targets.
- The executor checks writes mechanically with the vendored `scripts/scope.py`:

```bash
printf '%s\n' "<candidate write path>" | python3 "$SPEC_SKILL/scripts/scope.py" --globs '<phase globs...>'
```

A candidate path that is NOT emitted is out of scope — the executor must not write it.

### Rule 4: Public-interface-only cross-module interaction

When a phase must interact with a module owned by a different doc/phase:

- Read that module's doc and use ONLY its documented public API/interface section.
- Never call into, import from, or reference another module's internals (functions/types/files absent from its documented API).
- A phase that owns module A may read module B's public API to interoperate; it may not reach into B's internals.

This mirrors the docs skill's coverage model (Rules 3–5 of `skills/docs/references/coverage-and-api.md`) but is enforced here at planning and execution time.

### Rule 5: Graceful missing docs

- **No valid docs** (`DOCS_OK=false`): print the graceful message and STOP — do not create plan files, do not plan blind:

```
⚠️ Doc-aware planning requires valid docs, and this repo has none.
Run `/docs retcon` from the docs skill to author them (README, architecture
index, component docs with `globs:` frontmatter), then re-run this command
with `--persistent`.
```

- **Docs exist but are incomplete** (globs present but no public-interface section, or missing component docs): proceed, but flag every gap as a boundary callout (Rule 6). The user may run `/docs update` or `/docs new` to fill gaps.
- **Docs are stale relative to the branch**: `/docs update` (Rule 2) refreshes them; if it cannot, note the staleness in the plan's boundary callouts rather than blocking.

### Rule 6: Boundary callouts

A **boundary callout** is an explicit note produced during planning when a task would:

- write to a path outside its phase's declared globs, OR
- interact with another module through something other than that module's documented public interface.

Mechanics:

- The planner records every boundary callout in the phase file's `## Doc Scope` section (one bullet per crossing, naming the path/interface and the proposed alternative) and summarizes them in the Decision Log.
- If a boundary crossing is truly required, the planner must say so explicitly and give the reason; it is never silent.
- The executor re-checks at execution time. A residual crossing (one the plan permits) is still logged as a `[DEVIATION]` entry in `execution-log.md` with the reason, per the spec skill's existing deviation mechanism — the deviation is the audit trail that the crossing was called out, not hidden.

## How workflows use this file

- `new.md` — parse `--persistent`, run the Rule 1 gate, run the Rule 2 docs-first write, apply Rule 3 scoping and Rule 6 callouts while drafting phases.
- `update.md` — parse `--persistent`, run the Rule 2 docs-first write, apply Rule 3 scoping to the conversational/annotation edits.
- `go.md` — read the plan's `Doc Globs:` metadata as the doc-aware activation signal, read each phase's own write globs from its `## Doc Scope` block, and pass them (as `PHASE_GLOBS`, plus `SPEC_SKILL` for the checker path) to that phase's executor; executors enforce Rules 3–4.
- `agents/spec-executor.md` — enforce Rules 3–4 for every Write/Edit and log Rule 6 deviations.
- `agents/spec-planner.md` — produce the Rule 3 scoping (per-phase `## Doc Scope` globs, plan.md `Doc Globs:` union) and the Rule 6 boundary callouts while drafting phases.
- `agents/spec-updater.md` — preserve the Rule 3 scoping and Rule 6 callouts while applying plan updates (keep `## Doc Scope` blocks and the `Doc Globs:` union in sync).

## Scripts

- `scripts/scope.py` — vendored from the docs skill; the mechanical glob-checker for Rule 3. `SPEC_SKILL` (the skill package root) is exported by `SKILL.md`; executors receive it via `go.md`. Usage:

```bash
printf '%s\n' "$path" | python3 "$SPEC_SKILL/scripts/scope.py" --globs 'libs/auth/**' 'docs/**'
```

- `scripts/test_scope.py` — unit tests for `scope.py`; run by `mise run test`.
