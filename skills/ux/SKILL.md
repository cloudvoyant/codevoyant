---
name: ux
description: 'UX design workflows: quick wireframes and approach comparisons, full SvelteKit prototypes, or CSS design token synthesis from a live URL. Triggers on: "ux explore", "ux prototype", "ux style-synthesize", "ux allow", "ux help", "quick wireframe", "wireframe this", "explore approach", "single file prototype", "html mockup", "ux prototype", "synthesize styles", "extract design tokens".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
disable-model-invocation: true
---

# ux

UX design skill dispatcher.

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
  "")           VERB="help" ;;
  "synth")      VERB="style-synthesize" ;;
  "synthesize") VERB="style-synthesize" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **allow** (`references/workflows/allow.md`) — pre-approve permissions for background agents
- **explore** (`references/workflows/explore.md`) — quick wireframe or approach comparison (single HTML file)
- **help** (`references/workflows/help.md`) — print command reference
- **prototype** (`references/workflows/prototype.md`) — full SvelteKit prototype with components
- **style-synthesize** (`references/workflows/style-synthesize.md`) — extract and synthesize CSS design tokens from a URL
