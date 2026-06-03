---
name: dev
description: 'Developer workflows: plan feature architecture, explore technical approaches, compare repos, generate docs, or approve tasks in Linear. Triggers on: "dev plan", "dev explore", "dev diff", "dev docs", "dev approve", "dev allow", "dev help", "architecture plan", "plan architecture", "technical design", "explore options", "research approaches", "compare repos".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# dev

Developer skill dispatcher.

## Inline Usage

Pass your intent directly on the invocation line — `explore` and `plan` proceed immediately with no opening question when a description is provided.

```
/dev explore how the auth middleware works
/dev plan auth system --mode arch
```

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
  "")              VERB="help" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **allow** (`references/workflows/allow.md`) — pre-approve permissions for background agents
- **approve** (`references/workflows/approve.md`) — push tasks to Linear
- **diff** (`references/workflows/diff.md`) — compare two repos for structural differences
- **docs** (`references/workflows/docs.md`) — generate or update documentation
- **explore** (`references/workflows/explore.md`) — research technical approaches, generate proposals
- **help** (`references/workflows/help.md`) — print command reference
- **plan** (`references/workflows/plan.md`) — plan feature or system architecture

## Agent Index

- **linear-tasks-agent** (`agents/linear-tasks-agent.md`) — pushes tasks to Linear; used by approve
- **proposal-writer** (`agents/proposal-writer.md`) — writes technical proposals; used by explore
- **researcher** (`agents/researcher.md`) — researches technical approaches; used by explore
