---
name: git
description: 'Git version control workflows: create conventional commits with CI monitoring, check CI/CD pipeline status, or run interactive rebase. Triggers on: "git commit", "git ci", "git rebase", "git help", "create a commit", "conventional commit", "commit my changes", "check CI", "monitor CI", "did CI pass", "watch pipeline", "CI status", "interactive rebase", "squash commits".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
disable-model-invocation: true
---

# git

Git workflow skill dispatcher.

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
  "")  VERB="help" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **ci** (`references/workflows/ci.md`) — check CI/CD pipeline status after a push
- **commit** (`references/workflows/commit.md`) — create a conventional commit with optional CI monitoring
- **help** (`references/workflows/help.md`) — print command reference
- **rebase** (`references/workflows/rebase.md`) — interactive rebase helper
