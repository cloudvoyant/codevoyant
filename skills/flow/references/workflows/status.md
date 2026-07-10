# Workflow: flow status

Print the current checklist state of a named flow.

## Step 0: Parse arguments

```
--global / -g → look under ~/.codevoyant/flows (see references/flow-dir.md)
FLOW_NAME = first non-flag positional arg (required)
```

If `FLOW_NAME` is missing, error: "Usage: /flow status <name> [--global]. A flow name is required."

Resolve the **definition** `FLOW_DIR` per `references/flow-dir.md` (local-first, then global; `--global` forces global). If not found in any scope, error: "Flow '{FLOW_NAME}' not found (looked in local and global). Run /flow new {FLOW_NAME} first."

Then resolve the **run instance** per `references/flow-dir.md` → *Run instance*: `RUN_DIR=".codevoyant/runs/{slug}/"` (always local). If `RUN_DIR/progress.md` exists, this run's live checkbox/Status state lives there; otherwise the flow has not been run locally and status reflects the definition (all steps pending).

## Step 1: Read and display flow state

Read the **definition** `FLOW_DIR/flow.md` for the title, scope, and Parameters. For the live checklist and Status, prefer the **run instance**:

- If `RUN_DIR/progress.md` exists → read the **Steps checklist** and **Status** from it (this is the current run's progress). Note `(run instance: .codevoyant/runs/{slug})` in the output.
- Otherwise → read the checklist and Status from the definition `FLOW_DIR/flow.md` (all steps pending; the flow has not been run locally).

Extract and print:

1. **Flow title** (from the definition's `# Flow: {TITLE}` heading)
2. **Scope** (local or global — the definition's resolved location / Metadata)
3. **Status** (from the run instance if present, else the definition's Metadata)
4. **Parameters** (from the definition's Parameters section, if any)
5. **Steps checklist** — print each step line as-is from the chosen source, preserving `[ ]` or `[x]` markers and any `{{placeholders}}`

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
