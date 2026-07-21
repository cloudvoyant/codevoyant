---
name: dev-docs
description: 'Deprecated alias — superseded by the standalone `docs` skill; use /docs instead. Triggers on: "dev docs", "generate docs", "create docs", "document {component}", "write docs for", "add docs for".'
license: MIT
compatibility: Works on Claude Code. Superseded by /docs — kept for backwards compatibility only.
---

> **Superseded by `docs`** — this skill has been extracted into the standalone `docs` skill.
> Use `/docs new`, `/docs update`, `/docs review`, or `/docs retcon` instead.
> This file is kept for backwards compatibility only.

# dev docs

Generate and enforce documentation templates for engineering projects.

Triggers: "dev docs", "generate docs", "create docs", "document {component}", "write docs for", "add docs for"

## Critical Rules

- **Markdown output: soft-wrap prose, never hard-wrap** — when this skill writes a `.md` artifact (or any generated document), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences. (If a markdown formatter is available, `prettier --prose-wrap never` enforces this deterministically.)
- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument after 'docs', or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

# Normalise
case "$VERB" in
  "")             VERB="detect" ;;   # /dev docs → auto-detect missing docs
  "arch")         VERB="architecture" ;;
  "arch-readme")  VERB="architecture" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS`.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md`.

## Workflow Index

- **detect** (`references/workflows/docs.md`) — auto-detect missing docs and generate stubs
- **readme** (`references/workflows/docs.md`) — generate/update `docs/README.md`
- **architecture** (`references/workflows/docs.md`) — generate/update `docs/architecture/README.md` or a component file
- **help** (`references/workflows/help.md`) — print command reference
