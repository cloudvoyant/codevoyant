---
description: 'Unified skill lifecycle management. Triggers on: "skill explore", "skill new", "skill update", "skill critique", "skill help", "skill create", "skill improve", "skill review", "explore skills", "create a skill", "make a skill for", "update skill", "improve skill", "critique skill", "review skill quality". Pass a subcommand as the first argument.'
name: skill
disable-model-invocation: true
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list. Core functionality preserved on all platforms.'
argument-hint: '[verb] [args...]'
---

> **Compatibility**: AskUserQuestion falls back to numbered list on non-Claude-Code platforms.

## Skill Requirements

```bash
command -v npx >/dev/null 2>&1 || echo "MISSING: npx"
```

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged
- **Workflow files are authoritative** — do not duplicate workflow logic in this file
- See `workflows/` for per-verb behaviour; see `references/` for all templates

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

# Normalise aliases
case "$VERB" in
  "")         VERB="help" ;;
  "create")   VERB="new" ;;
  "improve")  VERB="update" ;;
  "review")   VERB="critique" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `workflows/{VERB}.md` does not exist, fall back to `workflows/help.md` and note the unknown verb.

## Workflow Index

- **explore** (`workflows/explore.md`) — research existing skills on agentskill.sh before building
- **new** (`workflows/new.md`) — create a new Claude Code compatible skill
- **update** (`workflows/update.md`) — update or improve an existing skill
- **critique** (`workflows/critique.md`) — evaluate skill quality across 5 dimensions
- **help** (`workflows/help.md`) — print command reference
