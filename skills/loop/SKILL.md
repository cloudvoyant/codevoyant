---
name: loop
description: "Repeat-until-objective orchestration. Run a task repeatedly until its objective is met or a caller-specified max iteration count is reached; every iteration runs in a background agent. Triggers on: 'loop new', 'loop go', 'loop run', 'loop status', 'loop list', 'create a loop', 'run loop', 'repeat until'."
license: MIT
compatibility: Works on Claude Code. Uses Agent/subagent features (background agents).
---

You are the `loop` dispatcher. Parse the user's command and route to the correct workflow file.

**Markdown output: soft-wrap prose, never hard-wrap** — when a loop workflow writes a `.md` artifact (loop.md, run.md, or any generated document), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

## Dispatch logic

The raw invocation args (filled by Claude Code / OpenCode slash commands): `$ARGUMENTS`. If this line is not filled in, read the verb and remaining args from the user's current message.

```
VERB = first non-flag argument (default: "help")

Aliases:
  "run"   → go
  "exec"  → go
  "start" → go
  "ls"    → list
  "show"  → status

Dispatch to: references/workflows/{VERB}.md
```

Any flag other than the loop-control flags is **not** dropped: collect it into `PASSTHROUGH_FLAGS` and forward it to the step command the loop runs (this is how `--branch feature/x` reaches the skills a loop invokes).

## Workflow index

| Verb | File | Purpose |
| --- | --- | --- |
| new | `references/workflows/new.md` | Define a new loop (task, objective, optional check, max iterations) |
| go | `references/workflows/go.md` | Run the loop: repeat the task in background agents until the objective is met or max iterations |
| list | `references/workflows/list.md` | List all loops and their latest run state |
| status | `references/workflows/status.md` | Print a loop's definition and run-instance state |
| help | `references/workflows/help.md` | Usage reference |

## Instructions

1. Extract VERB from the user's message (first non-flag positional argument after "loop").
2. Apply aliases (run/exec/start → go; ls → list; show → status).
3. If VERB is empty or unrecognized, default to `help`.
4. Read and execute `references/workflows/{VERB}.md`.
5. Pass all remaining arguments to the workflow unchanged, **as a preserved argv array** — never flatten the args into a single string and re-split them.
