---
name: flow
description: "End-to-end pipeline orchestration. Chain multiple skill workflows (dev explore, spec new, spec go, dev explore review) into a named flow that runs sequentially. Triggers on: 'flow new', 'flow go', 'create a flow', 'run flow'."
license: MIT
compatibility: Works on Claude Code. Uses Agent/subagent features.
requires: [skill]
---

You are the `flow` dispatcher. Parse the user's command and route to the correct workflow file.

## Dependency Check

Before dispatching, verify each skill listed in `requires:` is available in your context.

For each required skill, check whether you can invoke `/{name}` (i.e. its instructions are loaded in your context). If a required skill is missing, stop and report:

```
Required skill not installed: {name}
Install: npx skills add codevoyant/codevoyant
```

Note: the `skill` dependency is only needed for `flow save`. If the verb is not `save`, you may proceed without it.

## Dispatch logic

```
VERB = first non-flag argument (default: "help")

Aliases:
  "run"   → go
  "exec"  → go
  "start" → go
  "ls"      → list
  "show"    → status
  "review"  → status
  "export"  → save
  "publish" → save

Dispatch to: references/workflows/{VERB}.md
```

The `--global` / `-g` flag (store or read a flow under `~/.codevoyant/flows` instead of the local `.codevoyant/flows`) is **not** a verb — pass it through unchanged; each workflow parses it via `references/flow-dir.md`.

Any flag other than the flow-control flags (`--global`/`-g`, and `--set` for `go`) is **not** dropped: `references/flow-dir.md` collects it into `PASSTHROUGH_FLAGS`, and the `new`/`go` workflows forward it to the step commands. This is how `--branch feature/x` reaches the skills a flow runs (e.g. so `spec new` works on a separate branch).

## Workflow index

| Verb | File | Purpose |
| --- | --- | --- |
| new | `references/workflows/new.md` | Define a new flow (create flow.md + step files) |
| go | `references/workflows/go.md` | Execute pending steps sequentially as blocking subagents |
| list | `references/workflows/list.md` | List all flows (local and global) |
| status | `references/workflows/status.md` | Print flow.md checklist state |
| save | `references/workflows/save.md` | Turn a flow into a reusable composite skill via /skill new |
| help | `references/workflows/help.md` | Usage reference |

## Instructions

1. Extract VERB from the user's message (first non-flag positional argument after "flow").
2. Apply aliases (run/exec/start → go; ls → list; show/review → status; export/publish → save).
3. If VERB is empty or unrecognized, default to `help`.
4. Read and execute the corresponding workflow file from `references/workflows/{VERB}.md`.
5. Pass all remaining arguments (including any `--global`/`-g` flag and any other unrecognized flags such as `--branch`) to the workflow unchanged — the workflow parses flow-control flags and buckets the rest into `PASSTHROUGH_FLAGS` via `references/flow-dir.md`.
