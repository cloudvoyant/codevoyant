---
name: glab
description: 'GitLab workflows: watch CI pipelines, manage MR review comments, create and publish draft reviews. Triggers on: "glab ci", "watch gitlab ci", "pull mr comments", "push mr comments", "glab draft", "glab resolve", "glab complete", "gitlab review", "submit mr review".'
license: MIT
compatibility: Requires GitLab CLI (glab). Works on Claude Code and any platform with glab installed.
---

# glab

GitLab skill dispatcher.

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
  "")       VERB="help" ;;
  "watch")  VERB="ci"   ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **ci** (`references/workflows/ci.md`) — watch GitLab CI for the current branch
- **pull-comments** (`references/workflows/pull-comments.md`) — fetch MR discussion threads to a doc
- **push-comments** (`references/workflows/push-comments.md`) — submit inline notes to an MR
- **draft** (`references/workflows/draft.md`) — create a draft MR note
- **resolve-comments** (`references/workflows/resolve-comments.md`) — resolve MR discussion threads
- **complete** (`references/workflows/complete.md`) — publish a draft MR or submit pending review
- **help** (`references/workflows/help.md`) — print command reference
