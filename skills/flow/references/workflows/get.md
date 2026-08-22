# Workflow: flow get

Print an existing flow's definition — `flow.md` plus its `implementation/step-N.md` files — so you can read what a flow will run before invoking it. Read-only: never mutates the definition or any run instance.

- **Markdown output: soft-wrap prose, never hard-wrap** — when this workflow writes a `.md` artifact, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

## Step 0: Parse arguments

```
--global / -g   → read the flow from ~/.codevoyant/flows (see references/flow-dir.md)
FLOW_NAME       = first non-flag positional arg (required)
--steps         → print only the step commands from flow.md's `## Steps` checklist, not the full files
```

If `FLOW_NAME` is missing, error: "Usage: /flow get <name> [--global] [--steps]. A flow name is required."

## Step 1: Resolve the flow

Resolve `FLOW_DIR` per `references/flow-dir.md` (local-first, then global; `--global` forces global). If not found in any scope, error: "Flow '{FLOW_NAME}' not found (looked in local and global). Run /flow new {FLOW_NAME} first."

## Step 2: Print the definition

Read `FLOW_DIR/flow.md` and print it verbatim (title, Metadata, Parameters, Steps checklist).

If `--steps` is set, print only the numbered step commands from `flow.md`'s `## Steps` checklist, one per line (e.g. `1. [ ] /spec new {{objective}} --branch feature/x`), and stop.

Otherwise, for each `implementation/step-N.md` present under `FLOW_DIR/implementation/`, print it after a header line:

```
--- implementation/step-{N}.md ---
{file contents}
```

## Step 3: Report

End with the flow's location:

```
Definition: {FLOW_DIR} ({scope})
```

`get` never prints run-instance state (`progress.md`/`context.md`) — use `/flow status {name}` for live run progress.
