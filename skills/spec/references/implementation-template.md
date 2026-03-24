# Implementation Phase File Template

Use this structure for each `implementation/phase-N.md` file created in Step 5.5.

```markdown
# Phase {N} - {Phase Name}

## Introduction
{Brief description of what this phase accomplishes and its role in the overall plan.}

## Requirements

**Brevity:** Make the smallest change that achieves the task. No drive-by refactors or unrelated fixes.

**Build system preservation:** Do NOT modify the build system, CI config, or dependencies unless this phase is explicitly about them. If the project built before you started, it must build after every task. If a change would require an unplanned build system modification, stop and flag it.

### Task Runner Commands
{List the relevant task runner commands for this phase. ALWAYS use these — never invent equivalent shell commands.}
- Build: `{e.g. just build | make build | task build}`
- Test: `{e.g. just test | make test | task test}`
- Lint: `{e.g. just lint | make lint}`
- Format: `{e.g. just fmt | make format | task fmt}`

If no task runner covers a needed operation, note: "Gap: no recipe for X — suggest adding one."

## Design
{Describe the approach taken in this phase — what pattern, what structure, what architectural decision was made before coding begins.}

## Implementation

{For each task in this phase:}

### Task {X}: {Task Description}

**Steps:**
1. {Detailed step-by-step instructions}
2. {Include exact commands, file paths, code patterns}

**Files to modify / create:**
- `path/to/file.ext` — {specific changes}

**Validation (run after every task):**
- [ ] `{fmt command}` — no formatting changes outstanding
- [ ] `{lint command}` — zero warnings/errors
- [ ] `{test command}` — all tests pass

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
