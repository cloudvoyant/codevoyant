---
name: em
description: 'Engineering management workflows: plan epics with Linear tasks, approve milestones, review roadmaps, update plans, or manage execution permissions. Triggers on: "em plan", "em approve", "em review", "em update", "em allow", "em help", "plan an epic", "engineering project planning", "push milestones to Linear", "engineering roadmap", "eng plan".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
disable-model-invocation: true
---

# em

Engineering management skill dispatcher.

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")    VERB="help" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **allow** (`references/workflows/allow.md`) — pre-approve permissions for background agents
- **approve** (`references/workflows/approve.md`) — promote plan to docs/ and push milestones to Linear
- **help** (`references/workflows/help.md`) — print command reference
- **plan** (`references/workflows/plan.md`) — plan an engineering epic with Linear tasks
- **review** (`references/workflows/review.md`) — review roadmap quality and realism
- **update** (`references/workflows/update.md`) — apply feedback or annotations to an existing plan

## Agent Index

- **linear-push-agent** (`agents/linear-push-agent.md`) — pushes milestones and tasks to Linear; used by approve
