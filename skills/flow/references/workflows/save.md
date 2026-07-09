# save

Turn a saved flow into a reusable composite skill by scaffolding it with `/skill new`.

## Step 0: Parse arguments

```
--global / -g  read the source flow from ~/.codevoyant/flows (see references/flow-dir.md)
FLOW_NAME    first non-flag arg (required — name of an existing flow)
SKILL_NAME   --skill <name>  (required — name for the new skill, e.g. "auth-refactor")
DESCRIPTION  --desc "..."    (optional — one-line description; derived from flow title if omitted)
```

Error if FLOW_NAME missing: `Error: flow name required. Usage: /flow save <flow-name> --skill <skill-name> [--global]`
Error if --skill missing: `Error: --skill <name> required.`

## Step 1: Read the flow

Resolve `FLOW_DIR` per `references/flow-dir.md` (local-first, then global; `--global` forces global). Read `FLOW_DIR/flow.md`.

Extract:
- **Title** — from the `# Flow:` heading
- **Steps** — the ordered list of step commands (the text after each `[ ]` or `[x]`), keeping any `{{placeholders}}` verbatim
- **Parameters** — the Parameters section, if any (the composite skill should forward these; see Step 3)

If the flow does not exist: `Error: flow "{FLOW_NAME}" not found (looked in local and global). Run /flow new {FLOW_NAME} first.`

## Step 2: Scaffold with /skill new

Invoke the `skill` skill's `new` workflow to scaffold the skeleton:

Read and execute `[skill skill path]/references/workflows/new.md` with SKILL_NAME as the argument.

This creates `skills/{SKILL_NAME}/SKILL.md` from the standard skill template.

## Step 3: Populate SKILL.md

Overwrite the scaffolded `skills/{SKILL_NAME}/SKILL.md` with the composite skill content:

```markdown
---
name: {SKILL_NAME}
description: "{DESCRIPTION or derived from flow title}. Triggers on: '/{SKILL_NAME}', 'run {SKILL_NAME}'."
license: MIT
compatibility: Works on Claude Code. Requires the flow skill.
---

# {SKILL_NAME}

{DESCRIPTION}

## Steps

{numbered list of step commands from the flow}

## Parameters

{If the source flow had parameters, list them here so the invoker knows what to supply; else "None."}

## Instructions

1. Capture any text the user passed when invoking `/{SKILL_NAME}` as `INPUT` (and any `--set key=value` flags).
2. Generate a unique run slug: `{SKILL_NAME}-{timestamp}` (use current date + short random suffix)
3. Create a new flow instance (keep any `{{placeholders}}` verbatim — they resolve at run time):
   ```
   /flow new {run-slug} \
     "{step 1}" \
     "{step 2}" \
     ...
   ```
4. Execute it, forwarding the captured input so `{{placeholders}}` resolve:
   ```
   /flow go {run-slug} "{INPUT}" {--set flags if any}
   ```
5. Report completion with the run slug so the user can inspect it with `/flow status {run-slug}`.
```

## Step 4: Report

```
Composite skill "{SKILL_NAME}" created at skills/{SKILL_NAME}/SKILL.md

  Steps ({N} total):
    1. {step 1}
    2. {step 2}
    ...

Invoke with:
  /{SKILL_NAME}

To audit before shipping:
  /skill critique {SKILL_NAME}
```
