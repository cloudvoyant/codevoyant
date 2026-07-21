---
name: gh
description: 'GitHub workflows: watch CI pipelines, manage PR review comments, create and publish draft reviews. Triggers on: "gh ci", "watch github ci", "pull pr comments", "push pr comments", "gh draft", "gh resolve", "gh complete", "github review", "submit pr review", "gh retcon", "retcon pr commits", "fix commit messages on pr".'
license: MIT
compatibility: Requires GitHub CLI (gh). Works on Claude Code and any platform with gh installed.
---

# gh

GitHub skill dispatcher.

## Critical Rules

- **Markdown output: soft-wrap prose, never hard-wrap** — when this skill writes a `.md` artifact (review doc, comment body, or any generated document), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences. (If a markdown formatter is available, `prettier --prose-wrap never` enforces this deterministically.)

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")         VERB="help"         ;;
  "watch")    VERB="ci"           ;;
  "report")   VERB="report-issue" ;;
  "bug")      VERB="report-issue" ;;
  "rc")       VERB="retcon"  ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **ci** (`references/workflows/ci.md`) — watch GitHub Actions CI for the current branch
- **pull-comments** (`references/workflows/pull-comments.md`) — fetch PR review threads to a doc
- **push-comments** (`references/workflows/push-comments.md`) — submit inline review comments to a PR
- **draft** (`references/workflows/draft.md`) — create a pending draft PR review
- **resolve-comments** (`references/workflows/resolve-comments.md`) — mark threads resolved
- **complete** (`references/workflows/complete.md`) — publish a pending draft review
- **report-issue** (`references/workflows/report-issue.md`) — create a GitHub issue from a bug report or QA report file
- **retcon** (`references/workflows/retcon.md`) — propose and apply commit message edits for the current branch's open GitHub PR
- **help** (`references/workflows/help.md`) — print command reference
