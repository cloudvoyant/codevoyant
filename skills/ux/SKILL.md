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

Read and execute `workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `workflows/{VERB}.md` does not exist, fall back to `workflows/help.md` and note the unknown verb.

## Workflow Index

- **allow** (`workflows/allow.md`) — pre-approve permissions for background agents
- **explore** (`workflows/explore.md`) — quick wireframe or approach comparison (single HTML file)
- **help** (`workflows/help.md`) — print command reference
- **prototype** (`workflows/prototype.md`) — full SvelteKit prototype with components
- **style-synthesize** (`workflows/style-synthesize.md`) — extract and synthesize CSS design tokens from a URL
