# Workflow: flow status

Print the current checklist state of a named flow.

## Step 0: Parse arguments

```
FLOW_NAME = first non-flag positional arg (required)
FLOW_DIR  = .codevoyant/flows/{FLOW_NAME}/
```

If `FLOW_NAME` is missing, error: "Usage: /flow status <name>. A flow name is required."

If `FLOW_DIR/flow.md` does not exist, error: "Flow '{FLOW_NAME}' not found. Run /flow new {FLOW_NAME} first."

## Step 1: Read and display flow.md

Read `FLOW_DIR/flow.md`. Extract and print:

1. **Flow title** (from the `# Flow: {TITLE}` heading)
2. **Status** (from the Metadata section)
3. **Steps checklist** — print each step line as-is, preserving `[ ]` or `[x]` markers

Then print a summary line:

```
{done}/{total} steps complete
```

Where `done` = count of `[x]` lines, `total` = total step lines.

## Example output

```
Flow: jupyterpress
Status: Active

1. [x] /dev explore "how to build jupyterpress"
2. [x] /spec new "plan it"
3. [ ] /spec go
4. [ ] /dev explore "review the code"

2/4 steps complete
```
