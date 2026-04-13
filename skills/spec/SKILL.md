---
description: 'Specification-driven development. Triggers on: "spec new", "spec go", "spec guide", "spec review", "spec refresh", "spec update", "spec clean", "spec allow", "spec help", and all legacy /spec:* trigger phrases. Unified dispatcher — pass a subcommand as the first argument.'
name: spec
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list. Core functionality preserved on all platforms.'
argument-hint: '<new|go|guide|update|review|refresh|clean|help> [plan-name] [--flags]'
disable-model-invocation: true
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
- **Coding agents always receive a workflow checklist** — see `references/workflow-checklist.md`
- See `references/workflows/` for per-verb behaviour; see `references/` for all templates

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

# Normalise aliases
case "$VERB" in
  "")          VERB="help" ;;
  "status")    VERB="clean" ;;  # /spec status → /spec clean
  "list")      VERB="clean" ;;  # /spec list   → /spec clean
  "pause")     VERB="clean" ;;  # /spec pause  → /spec clean
  "stop")      VERB="clean" ;;  # /spec stop   → /spec clean
  "done")      VERB="clean" ;;  # /spec done   → /spec clean
  "delete")    VERB="clean" ;;  # /spec delete → /spec clean
  "bg")        VERB="go"    ;;  # /spec bg     → /spec go
  "run")       VERB="go"    ;;  # /spec run    → /spec go
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **new** (`references/workflows/new.md`) — create a structured implementation plan
- **go** (`references/workflows/go.md`) — execute plan autonomously in background
- **guide** (`references/workflows/guide.md`) — guided walkthrough: step-by-step tutorial with next/skip/improvise/chat
- **review** (`references/workflows/review.md`) — review plan quality before execution
- **refresh** (`references/workflows/refresh.md`) — sync checklist status with actual progress
- **update** (`references/workflows/update.md`) — apply annotations or conversational changes
- **clean** (`references/workflows/clean.md`) — session wrap-up: stop agents, archive to docs, triage active plans (done or cancel)
- **allow** (`references/workflows/allow.md`) — pre-approve permissions for background agents
- **help** (`references/workflows/help.md`) — print command reference

## Agent Index

- **spec-executor** (`agents/spec-executor.md`) — executes plan phases autonomously; used by bg and go
- **spec-updater** (`agents/spec-updater.md`) — applies annotations and conversational plan edits; used by update
- **spec-planner** (`agents/spec-planner.md`) — researches scope and drafts multi-phase plans; used by new
