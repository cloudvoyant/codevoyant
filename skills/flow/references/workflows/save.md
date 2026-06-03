# save

Turn a saved flow into a reusable composite skill by scaffolding it with `/skill new`.

## Step 0: Parse arguments

```
FLOW_NAME    first non-flag arg (required — name of an existing flow)
SKILL_NAME   --skill <name>  (required — name for the new skill, e.g. "auth-refactor")
DESCRIPTION  --desc "..."    (optional — one-line description; derived from flow title if omitted)
```

Error if FLOW_NAME missing: `Error: flow name required. Usage: /flow save <flow-name> --skill <skill-name>`
Error if --skill missing: `Error: --skill <name> required.`

## Step 1: Read the flow

Read `.codevoyant/flows/{FLOW_NAME}/flow.md`.

Extract:
- **Title** — from the `# Flow:` heading
- **Steps** — the ordered list of step commands (the text after each `[ ]` or `[x]`)

If the flow does not exist: `Error: flow "{FLOW_NAME}" not found. Run /flow new {FLOW_NAME} first.`

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

## Instructions

1. Generate a unique run slug: `{SKILL_NAME}-{timestamp}` (use current date + short random suffix)
2. Create a new flow instance:
   ```
   /flow new {run-slug} \
     "{step 1}" \
     "{step 2}" \
     ...
   ```
3. Execute it:
   ```
   /flow go {run-slug}
   ```
4. Report completion with the run slug so the user can inspect it with `/flow status {run-slug}`.
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
