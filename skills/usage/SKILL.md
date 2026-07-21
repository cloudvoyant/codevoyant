---
name: usage
description: 'Generate a responsible-AI usage and decision-attribution report for the current session. Triggers on: "usage report", "usage generate", "usage run", "usage help".'
license: MIT
compatibility: Designed for Claude Code. Core functionality preserved on all platforms.
argument-hint: '<report|help> [name] [--flags]'
---

# usage

Generate a responsible-AI usage and decision-attribution report for the current session.

## Critical Rules

- **Markdown output: soft-wrap prose, never hard-wrap** — when this skill writes a `.md` artifact (usage report or any generated document), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences. (If a markdown formatter is available, `prettier --prose-wrap never` enforces this deterministically.)

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **NEVER add Co-Authored-By, co-authored-by, or any AI attribution comment to any commit** — not as a suggestion, not in examples, not anywhere

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")         VERB="help" ;;
  "generate") VERB="report" ;;
  "run")      VERB="report" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **report** (`references/workflows/report.md`) — analyze session artifacts and write `.codevoyant/usage/{date}.md`
- **help** (`references/workflows/help.md`) — print command reference
