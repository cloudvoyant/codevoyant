---
name: icons
description: "Find and download SVG icons from svgrepo.com, recolored to the project's brand color. Triggers on: 'find icon', 'icon for', 'skill icon', 'download svg icon', 'icons find', 'icons use'."
license: MIT
compatibility: Works on Claude Code. Uses WebFetch to search svgrepo.com.
---

# icons

SVG icon finder and downloader. Searches svgrepo.com and saves icons recolored to `#5555ff`.

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")        VERB="help"  ;;
  "search")  VERB="find"  ;;
  "get")     VERB="use"   ;;
  "download") VERB="use"  ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS`.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md`.

## Workflow Index

- **find** (`references/workflows/find.md`) — search svgrepo.com for icons matching a query
- **use** (`references/workflows/use.md`) — download a specific SVG URL and recolor it
- **help** (`references/workflows/help.md`) — print command reference
