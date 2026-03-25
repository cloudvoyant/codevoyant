---
name: dev
description: 'Developer workflows: plan feature architecture, explore technical approaches, compare repos, generate docs, create PRs/MRs, approve tasks in Linear, or fix PR issues. Triggers on: "dev plan", "dev explore", "dev diff", "dev docs", "dev approve", "dev pr-fix", "dev mr", "dev allow", "dev help", "architecture plan", "plan architecture", "technical design", "explore options", "research approaches", "compare repos", "create PR", "open MR", "create merge request", "dev fix", "fix PR".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
disable-model-invocation: true
---

# dev

Developer skill dispatcher.

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
  "")         VERB="help" ;;
  "fix")      VERB="pr-fix" ;;
  "pr")       VERB="pr-fix" ;;
  "pr-create") VERB="mr" ;;
  "pull-request") VERB="mr" ;;
  "merge-request") VERB="mr" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `workflows/{VERB}.md` does not exist, fall back to `workflows/help.md` and note the unknown verb.

## Workflow Index

- **allow** (`workflows/allow.md`) — pre-approve permissions for background agents
- **approve** (`workflows/approve.md`) — push tasks to Linear
- **diff** (`workflows/diff.md`) — compare two repos for structural differences
- **docs** (`workflows/docs.md`) — generate or update documentation
- **explore** (`workflows/explore.md`) — research technical approaches, generate proposals
- **help** (`workflows/help.md`) — print command reference
- **mr** (`workflows/mr.md`) — create a pull request or merge request
- **plan** (`workflows/plan.md`) — plan feature or system architecture
- **pr-fix** (`workflows/pr-fix.md`) — review and fix PR issues

## Agent Index

- **linear-tasks-agent** (`agents/linear-tasks-agent.md`) — pushes tasks to Linear; used by approve
- **proposal-writer** (`agents/proposal-writer.md`) — writes technical proposals; used by explore
- **researcher** (`agents/researcher.md`) — researches technical approaches; used by explore
