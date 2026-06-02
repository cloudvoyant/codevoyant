---
name: pr
description: 'Code review workflows: generate AI-powered inline review comments, address change requests, or complete a draft review. Triggers on: "pr new", "pr address", "pr complete", "code review", "pr review", "pr mr", "pr this PR", "address pr comments", "fix review comments", "complete draft review", "publish review".'
license: MIT
compatibility: Works on Claude Code. Requires gh (GitHub) or glab (GitLab) CLI.
---

# rev

Code review skill dispatcher.

## Inline Usage

Pass the PR/MR number directly: `/pr new 42`, `/pr address 42`.

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
  "")     VERB="help" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **new** (`references/workflows/new.md`) — generate an AI-powered inline code review for a PR/MR
- **address** (`references/workflows/address.md`) — pull review comments, propose and apply fixes, respond via draft
- **complete** (`references/workflows/complete.md`) — publish a pending draft review
- **help** (`references/workflows/help.md`) — print command reference
