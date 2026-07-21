---
name: glab
description: 'GitLab workflows: watch CI pipelines, manage MR review comments, create and publish draft reviews. Triggers on: "glab ci", "watch gitlab ci", "pull mr comments", "push mr comments", "glab draft", "glab resolve", "glab complete", "gitlab review", "submit mr review", "glab retcon", "retcon mr commits", "fix commit messages on mr".'
license: MIT
compatibility: Requires GitLab CLI (glab). Works on Claude Code and any platform with glab installed.
---

# glab

GitLab skill dispatcher.

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

- **ci** (`references/workflows/ci.md`) — watch GitLab CI for the current branch
- **pull-comments** (`references/workflows/pull-comments.md`) — fetch MR discussion threads to a doc
- **push-comments** (`references/workflows/push-comments.md`) — submit inline notes to an MR
- **draft** (`references/workflows/draft.md`) — create a draft MR note
- **resolve-comments** (`references/workflows/resolve-comments.md`) — resolve MR discussion threads
- **complete** (`references/workflows/complete.md`) — publish a draft MR or submit pending review
- **report-issue** (`references/workflows/report-issue.md`) — create a GitLab issue from a bug report or QA report file
- **retcon** (`references/workflows/retcon.md`) — propose and apply commit message edits for the current branch's open GitLab MR
- **help** (`references/workflows/help.md`) — print command reference
