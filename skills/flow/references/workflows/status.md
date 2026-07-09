# Workflow: flow status

Print the current checklist state of a named flow.

## Step 0: Parse arguments

```
--global / -g → look under ~/.codevoyant/flows (see references/flow-dir.md)
FLOW_NAME = first non-flag positional arg (required)
```

If `FLOW_NAME` is missing, error: "Usage: /flow status <name> [--global]. A flow name is required."

Resolve `FLOW_DIR` per `references/flow-dir.md` (local-first, then global; `--global` forces global). If not found in any scope, error: "Flow '{FLOW_NAME}' not found (looked in local and global). Run /flow new {FLOW_NAME} first."

## Step 1: Read and display flow.md

Read `FLOW_DIR/flow.md`. Extract and print:

1. **Flow title** (from the `# Flow: {TITLE}` heading)
2. **Scope** (local or global — from the resolved location / Metadata)
3. **Status** (from the Metadata section)
4. **Parameters** (from the Parameters section, if any)
5. **Steps checklist** — print each step line as-is, preserving `[ ]` or `[x]` markers and any `{{placeholders}}`

Then print a summary line:

```
{done}/{total} steps complete
```

Where `done` = count of `[x]` lines, `total` = total step lines.

## Example output

```
Flow: ship-feature
Scope: global
Status: Active
Parameters: {{input}} — the feature to ship

1. [x] /spec new {{input}}
2. [x] /spec go
3. [ ] /git commit
4. [ ] /pr open

2/4 steps complete
```
