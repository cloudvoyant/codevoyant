---
name: workflow-example
description: "Example of a workflow dispatcher skill. Triggers on: 'workflow-example new', 'workflow-example go', 'run workflow-example'. Replace name and triggers with your own."
license: MIT
compatibility: Works on Claude Code. Uses AskUserQuestion for interactive prompts.
---

# workflow-example

<!--
  WORKFLOW SKILL PATTERN
  ======================
  This skill is a dispatcher: it reads the first argument (the verb),
  then loads and executes the matching workflow file.
  
  Best for:
  - Multi-step processes (plan → execute → review)
  - Skills with multiple sub-commands (/mytool new, /mytool go, /mytool help)
  - Operations that need their own focused workflow logic
  
  Pattern used by: spec, git, gh, glab, pr, flow, skill, qa
-->

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions  
- **Unknown verb → run help.md** — never error silently
- **Pass all remaining args through** — workflow receives $REMAINING_ARGS unchanged

## Step 0: Parse Arguments

<!--
  Extract the verb (first non-flag argument) and everything else.
  Add aliases as needed.
-->

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB]"

case "$VERB" in
  "")       VERB="help" ;;
  "run")    VERB="go"   ;;   # alias: /workflow-example run → go
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS`.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md`.

## Workflow Index

<!--
  One entry per workflow file. Keep in sync with the files you create.
-->

- **new** (`references/workflows/example.md`) — example workflow demonstrating the pattern
- **go** (`references/workflows/example.md`) — alias target for demonstration
- **help** (`references/workflows/help.md`) — print command reference

<!--
  NEXT STEPS:
  1. Rename this skill (update name, description, and dispatcher above)
  2. Replace the example workflow with your real workflows
  3. Run /skill critique workflow-example to audit quality
-->
