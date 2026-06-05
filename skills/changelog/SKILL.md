---
name: changelog
description: 'Changelog and conventional commit hygiene. Triggers on: "changelog retcon", "changelog preview", "retcon commits", "preview changelog", "what version will this be". Requires gh or glab CLI.'
license: MIT
compatibility: 'Designed for Claude Code. AskUserQuestion falls back to numbered list on non-Claude-Code platforms.'
argument-hint: '<retcon|preview|help> [--apply] [--platform github|gitlab]'
requires_one_of: [gh, glab]
---

> **Compatibility**: AskUserQuestion falls back to numbered list on non-Claude-Code platforms.

## Dependency Check

Before proceeding, verify that at least one of `gh` or `glab` is available:

```bash
command -v gh >/dev/null 2>&1 || command -v glab >/dev/null 2>&1 || echo "MISSING: gh or glab — install one to use changelog retcon"
```

If neither is available: warn the user but allow `changelog preview` to proceed (it only needs git).

## Critical Rules

- **Never rebase on protected branches** — refuse if branch is main, master, develop, or matches `*-stable`
- **Never force-push without --force-with-lease** — always protect against concurrent pushes
- **retcon --apply requires a clean working tree** — refuse if `git status --porcelain` is non-empty
- **preview never writes files** — output to conversation only
- **Unknown verb → help** — never error silently

## Step 0: Parse Arguments

```bash
VERB="[first non-flag arg, default: help]"
APPLY_MODE=false
PLATFORM=""
[[ "$*" =~ --apply ]] && APPLY_MODE=true
[[ "$*" =~ --platform[[:space:]]github ]] && PLATFORM="github"
[[ "$*" =~ --platform[[:space:]]gitlab ]] && PLATFORM="gitlab"

case "$VERB" in
  "")         VERB="help"    ;;
  "rc")       VERB="retcon"  ;;
esac
```

## Step 1: Dispatch

Read and execute `references/workflows/{VERB}.md`.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md`.

## Workflow Index

- **retcon** (`references/workflows/retcon.md`) — propose and apply commit message edits on open PR/MR
- **preview** (`references/workflows/preview.md`) — show predicted changelog and next version inline
- **help** (`references/workflows/help.md`) — print command reference
