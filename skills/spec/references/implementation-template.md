# Implementation Phase File Template

Use this structure for each `implementation/phase-N.md` file. Phase files are task documents: a one-line introduction, the tasks with their complete code, then validation and deviations. Process rules (brevity, build-system preservation, markdown, terse prose) live in the executor agent definition — never repeat them here. Design context lives in plan.md and the user guide. Executors discover build/test/lint/format commands via the task skill, so no runner commands are recorded.

```markdown
# Phase {N} - {Phase Name}

## Introduction
{One or two sentences — what this phase accomplishes.}

## Doc Scope
{ONLY for doc-aware (`--persistent`) plans — omit this section otherwise. Per `references/doc-aware.md` Rule 3: the `**Write globs:**` list must contain at least one glob; cross-module interaction uses documented public interfaces only (Rule 4); each crossing gets a boundary callout (Rules 6–7). Verify every write target with `$SPEC_SKILL/scripts/scope.py`.}

**Write globs:** {`glob1`} {`glob2`}

**Public interfaces only:** {cross-module interaction uses only the target module's documented public API — never its internals.}

**Boundary callouts:**
- {task} — {what crosses the boundary, why it is required, and the alternative considered}

## Implementation

> **Gate (machine-checked in validation):** Every task below MUST contain a `**Code:**` block holding the **complete, literal code** it will produce — full contents for new files; for edits to existing files, a **diff** (exact old→new lines or a unified diff) with context lines above and below the change, never a whole-file dump. A whole-file replacement appears only when the task explicitly states that the user asked for a full-file replacement. The block is REJECTED if it is missing or empty, contains a placeholder/stub marker from the blocklist (see `references/code-completeness-blocklist.md` — the canonical list), shows a bare signature/comment where a body belongs, describes the code in prose instead of showing it, or replaces an entire existing file with a whole-file dump where a diff was required. The blocklist is judged by intent, not blind substring matching, so a marker used as a legitimate token (not a stand-in for missing code) does not fail the block. If you cannot show the complete code, resolve the unknown now during planning (read the codebase, search the web, or ask the user) — never pass research, open design choices, or code authoring to the execution agent.
The executor may still apply minor mechanical fixes to the specified code in-flight — obvious typos, missing imports, or trivial type corrections that do not change a module's contract or violate an invariant — per the permitted-minor-deviations policy in `agents/spec-executor.md`; these are logged as `[MINOR-DEVIATION]` entries, not treated as failures.

{For each task in this phase:}

### Task {X}: {Task Description}

**Steps:**
1. {Concise step-by-step instructions}

**Code (required — complete, never omit, never abbreviate):**
```{lang}
{The COMPLETE code this task produces. New file: its entire contents. Edit to an existing
file: a diff — the exact old→new lines or a unified diff with the changed lines plus context
lines above and below. Never paste the whole file for an edit; a whole-file replacement is
shown only when this task explicitly declares a user-requested full-file replacement.}
```

**Contract (lite mode only — replaces `**Code:**`):**
```text
Signatures:
  - func Name(in) (out, error) — one-line behavior
Boundaries:
  - owns: path/or module
  - depends on: module (public interface only)
Library choices:
  - <name>@<version> — why
Acceptance:
  - <the invariant or test that proves the task is done>
```

**Table rows (only when the task consumes a `tables/*.md` table):**
- `tables/{set-slug}.md` — rows {#–#}: mark each row's Status `[x]` as it is completed; a row is done only when its change is applied and validated

**Files to modify / create:**
- `path/to/file.ext` — {specific changes}

**Validation (run after every task):**
- [ ] Project checks green via the task skill (`/task detect`, `/task list` — then the repo's test/lint/typecheck recipes); fix failures before marking the task complete
- [ ] *(only under `spec go --commit`, and only when CI exists)* CI is green for this committed phase — the executor invokes `/git commit --yes --fix` and the git skill blocks in its bounded fix-until-green loop. Skip silently when any of: no `--commit`, no remote, no configured CI, no `gh`/`glab` CLI.

## Validation

After all tasks complete, run the repo's full check set via the task skill and record the outcome:

- [ ] Full suite green (tests + validate/lint as the repo defines them) — note the exact recipes run

## Deviations

- {Deviations, minor deviations, or deferred items surfaced during this phase — or "none"}
```
