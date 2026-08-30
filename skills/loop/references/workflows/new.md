# Workflow: loop new

Define a new loop. Creates `.codevoyant/loops/{name}/loop.md` from the template, filling Task, Objective, optional Check, and Max Iterations.

## Step 0: Parse arguments

```
LOOP_NAME = first positional arg (required)
```

If `LOOP_NAME` is missing, error: "Usage: /loop new <name>. A loop name is required."

Slug `LOOP_NAME`: lowercase, spaces → hyphens, keep `[a-z0-9-]`, trim to 50 chars.

## Step 1: Initialize the store

Run the vendored store initializer before any mkdir:

```bash
# {SKILL_ROOT} = the loop skill's package root (substitute the real path)
python3 "{SKILL_ROOT}/scripts/cv_init_store.py" >/dev/null
mkdir -p ".codevoyant/loops/{LOOP_NAME}"
```

## Step 2: Collect the definition

If `.codevoyant/loops/{LOOP_NAME}/loop.md` already exists, use **AskUserQuestion**: "Replace loop '{LOOP_NAME}' or cancel?" (replace / cancel). Cancel → stop.

Ask the user (AskUserQuestion, free-text) for each field not already supplied inline:
1. **Task** — what to repeat each iteration (a skill command, shell command, or agent instruction).
2. **Objective** — the verifiable condition that ends the loop.
3. **Check** — optional shell command that exits 0 when the objective is met. Offer "no deterministic check (use the judge)".
4. **Max Iterations** — a positive integer upper bound.

## Step 3: Write loop.md

Write `.codevoyant/loops/{LOOP_NAME}/loop.md` from `references/loop-template.md`, substituting the collected values. Omit the `## Check` section if the user chose no deterministic check.

Report:

```
✓ Loop '{LOOP_NAME}' defined (.codevoyant/loops/{LOOP_NAME}/loop.md)
  Task: {one-line summary}
  Objective: {one-line summary}
  Check: {command | (judge)}
  Max: {N}

Run it: /loop go {LOOP_NAME}
```
