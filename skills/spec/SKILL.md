---
description: 'Specification-driven development. Triggers on: "spec new", "spec go", "spec bg", "spec list", "spec review", "spec refresh", "spec update", "spec done", "spec stop", "spec delete", "spec rename", "spec doctor", "spec allow", "spec help", and all legacy /spec:* trigger phrases. Unified dispatcher — pass a subcommand as the first argument.'
name: spec
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list. Core functionality preserved on all platforms.'
argument-hint: '<new|bg|go|list|review|refresh|update|done|stop|delete|rename|doctor|allow|help> [plan-name] [--flags]'
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
- See `workflows/` for per-verb behaviour; see `references/` for all templates

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

# Normalise aliases
case "$VERB" in
  "")          VERB="help" ;;
  "status")    VERB="list" ;;   # /spec status → /spec list
  "pause")     VERB="stop" ;;   # /spec pause  → /spec stop
  "run")       VERB="go"   ;;   # /spec run    → /spec go
esac
```

## Step 1: Dispatch to Workflow

Read and execute `workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `workflows/{VERB}.md` does not exist, fall back to `workflows/help.md` and note the unknown verb.

## Workflow Index

- **new** (`workflows/new.md`) — create a structured implementation plan
- **bg** (`workflows/bg.md`) — execute plan autonomously in background
- **go** (`workflows/go.md`) — execute plan interactively
- **list** (`workflows/list.md`) — list plans with status and progress
- **review** (`workflows/review.md`) — review plan quality before execution
- **refresh** (`workflows/refresh.md`) — sync checklist status with actual progress
- **update** (`workflows/update.md`) — apply annotations or conversational changes
- **done** (`workflows/done.md`) — archive plan, optionally commit and create PR
- **stop** (`workflows/stop.md`) — halt execution or capture session insights
- **delete** (`workflows/delete.md`) — permanently remove a plan
- **rename** (`workflows/rename.md`) — rename a plan and update references
- **doctor** (`workflows/doctor.md`) — diagnose and fix setup issues
- **allow** (`workflows/allow.md`) — pre-approve permissions for background agents
- **help** (`workflows/help.md`) — print command reference

## Agent Index

- **spec-executor** (`agents/spec-executor.md`) — executes plan phases autonomously; used by bg and go
- **spec-updater** (`agents/spec-updater.md`) — applies annotations and conversational plan edits; used by update
- **spec-planner** (`agents/spec-planner.md`) — researches scope and drafts multi-phase plans; used by new
