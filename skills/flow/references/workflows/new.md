# Workflow: flow new

Create a new named flow — a `.codevoyant/flows/{slug}/flow.md` checklist plus one `implementation/step-N.md` agent-prompt file per step.

## Step 0: Parse arguments

```
FLOW_NAME = first non-flag positional arg (required; error if missing)
STEPS     = remaining positional args (each is one step command string)
```

If `FLOW_NAME` is missing, error: "Usage: /flow new <name> [steps...]. A flow name is required."

If `STEPS` is empty, prompt the user:

```
Enter each step as a skill command. One per line. Empty line = done.
Example:
  /dev explore "how to build X"
  /spec new "plan it"
  /spec go
  /dev explore "review the code"
```

Collect lines until an empty line is entered. Each non-empty line is one step command.

If still no steps after prompting, error: "A flow must have at least one step."

## Step 1: Resolve slug and create directory

- `slug` = `FLOW_NAME` lowercased, spaces replaced with hyphens
- `FLOW_DIR = .codevoyant/flows/{slug}/`
- If `FLOW_DIR/flow.md` already exists: ask "Flow '{slug}' already exists. Replace it or cancel? (replace/cancel)"
  - If cancel: exit without changes.
  - If replace: proceed (overwrite all files).
- Create `FLOW_DIR/` and `FLOW_DIR/implementation/` directories.

## Step 2: Write flow.md

Use `references/flow-template.md` as the template. Fill in:
- `{TITLE}` = `FLOW_NAME` (original casing)
- `{slug}` = computed slug
- `{timestamp}` = current ISO timestamp
- `{Status}` = `Active`
- Steps checklist: one line per step, numbered, all unchecked `[ ]`

Each step line format:
```
N. [ ] {step-command-string}
```

Write to `FLOW_DIR/flow.md`.

## Step 3: Write step implementation files

For each step N (1-based), create `FLOW_DIR/implementation/step-N.md` using `references/step-template.md`.

Fill in:
- `{N}` = step number
- `{step-command}` = the step command string
- `{flow-name}` = slug
- `{total}` = total number of steps
- Context notes: leave blank for step 1; for steps 2+, note "Step N-1 will have produced output — check `.codevoyant/` for artifacts."

## Step 4: Report

```
✅ Flow "{slug}" created with {N} steps.

  .codevoyant/flows/{slug}/flow.md

To run:    /flow go {slug}
To review: /flow status {slug}
```
