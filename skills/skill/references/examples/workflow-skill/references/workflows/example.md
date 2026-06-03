# example

<!--
  WORKFLOW FILE PATTERN
  =====================
  Each workflow file handles ONE verb. It receives $REMAINING_ARGS 
  from the dispatcher and executes a focused sequence of steps.
  
  This file is a template — replace the steps with your own logic.
-->

## Variables

Received from dispatcher:
- `REMAINING_ARGS` — everything after the verb (flags, positional args)

Parse what you need at the top:
```bash
PLAN_NAME="[first non-flag arg, or empty]"
DRY_RUN="[true if --dry-run present]"
```

## Step 1: Validate inputs

Check that required arguments are present. Error clearly if missing:
```
Error: plan name required. Usage: /workflow-example new <name>
```

## Step 2: Do the work

<!--
  Write your implementation steps here.
  
  Tips:
  - Number each step
  - Use code blocks for shell commands, not inline backticks
  - Reference other workflow files by path if you delegate:
    "Read and execute references/workflows/other.md"
  - Use AskUserQuestion for interactive choices (see spec or flow for examples)
  - Keep steps focused: one action per step
-->

Example step:
```bash
echo "Executing with: $PLAN_NAME"
```

## Step 3: Report completion

Always end with a clear status message:
```
✅ Done. Output at: .codevoyant/example/{plan-name}/
```

<!--
  ERROR HANDLING
  ==============
  - Validate inputs in Step 1 before doing any work
  - Use clear error messages: what failed + how to fix it
  - Exit early on unrecoverable errors (don't silently continue)
-->
