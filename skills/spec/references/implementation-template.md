# Implementation Phase File Template

Use this structure for each `implementation/phase-N.md` file created in Step 5.5.

```markdown
# Phase {N} - {Phase Name}

## Introduction
{Brief description of what this phase accomplishes and its role in the overall plan.}

## Requirements

**Brevity:** Make the smallest change that achieves the task. No drive-by refactors or unrelated fixes.

**Build system preservation:** Do NOT modify the build system, CI config, or dependencies unless this phase is explicitly about them. If the project built before you started, it must build after every task. If a change would require an unplanned build system modification, stop and flag it.

**Markdown output:** Soft-wrap prose — never hard-wrap. Write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

### Task Runner Commands
{List the relevant task runner commands for this phase. ALWAYS use these — never invent equivalent shell commands. Discover them by reading `mise.toml`, `justfile`, `Makefile`, or `package.json` scripts directly.}
- Build: `{e.g. just build | make build | task build | mise run build}`
- Test: `{e.g. just test | make test | task test | mise run test}`
- Lint: `{e.g. just lint | make lint | mise run lint}`
- Format: `{e.g. just fmt | make format | task fmt | mise run fmt}`

If no task runner covers a needed operation, note: "Gap: no recipe for X — suggest adding one."

## Design
{Describe the approach taken in this phase — what pattern, what structure, what architectural decision was made before coding begins.}

## Implementation

> **Gate (machine-checked in validation):** Every task below MUST contain a `**Code:**` block holding the **complete, literal code** it will produce — full contents for new files, exact old→new lines or a unified diff for edits. The block is REJECTED if it is missing or empty, contains a placeholder/stub marker from the blocklist (see `references/code-completeness-blocklist.md` — the canonical list), shows a bare signature/comment where a body belongs, or describes the code in prose instead of showing it. The blocklist is judged by intent, not blind substring matching, so a marker used as a legitimate token (not a stand-in for missing code) does not fail the block. If you cannot show the complete code, resolve the unknown now during planning (read the codebase, search the web, or ask the user) — never pass research, open design choices, or code authoring to the execution agent. A dedicated validation agent scans for exactly these placeholders and will fail the plan until every code block is complete.

{For each task in this phase:}

### Task {X}: {Task Description}

**Steps:**
1. {Detailed step-by-step instructions}
2. {Include exact commands, file paths, code patterns}

**Code (required — complete, never omit, never abbreviate):**
```{lang}
{The COMPLETE code this task produces — the entire contents for a new file, or the exact
old→new lines / unified diff for an edit. Every line the execution agent will write appears
here verbatim. No ellipses, no pseudocode, no "e.g." A task with a partial or prose-only
code block is incomplete and must not be emitted.}
```

**Files to modify / create:**
- `path/to/file.ext` — {specific changes}

**Validation (run after every task):**
- [ ] `{fmt command}` — no formatting changes outstanding
- [ ] `{lint command}` — zero warnings/errors
- [ ] `{test command}` — all tests pass
- [ ] *(optional, only under `spec go --commit`)* CI is green for this committed phase — verified via `/gh ci` (GitHub) or `/glab ci` (GitLab). Skip silently when any of: no `--commit`, no remote, no configured CI, no `gh`/`glab` CLI. Never fail a phase for the absence of CI.

---

## Future Work / Validation

After all tasks complete, run the full suite:

```bash
{fmt command}
{lint command}
{typecheck command}
{test command}
{build command}
```

Expected: {describe expected output}

Note any follow-on tasks or deferred items surfaced during this phase:
- {deferred item}

## References
- {Related proposals, ADRs, or external references consulted for this phase}
```
