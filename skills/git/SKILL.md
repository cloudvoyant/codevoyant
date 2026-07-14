---
name: git
description: 'Git version control workflows: create conventional commits or run interactive rebase. Triggers on: "git commit", "git rebase", "git help", "create a commit", "conventional commit", "commit my changes", "interactive rebase", "squash commits".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
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

- **commit** (`references/workflows/commit.md`) — create a conventional commit with optional CI monitoring
- **hooks** (`references/workflows/hooks.md`) — install/manage the commit-msg hook that strips agent self-attribution
- **help** (`references/workflows/help.md`) — print command reference
- **rebase** (`references/workflows/rebase.md`) — interactive rebase helper
- **worktree** (`references/workflows/worktree.md`) — create/switch a branch and/or create a worktree (shared routine reused by spec)
