---
description: 'Specification-driven development. Triggers on: "spec new", "spec go", "spec guide", "spec review", "spec refresh", "spec update", "spec clean", "spec allow", "spec help", and all legacy /spec:* trigger phrases. Unified dispatcher — pass a subcommand as the first argument.'
name: spec
license: MIT
compatibility: 'Works on Claude Code, OpenCode, VS Code Copilot, and Codex. When interactive questions are unavailable, emit one NEEDS_INPUT line for the essential unresolved decision. New and update always finish by writing and verifying the requested artifact or escalating that question.'
argument-hint: '<new|go|guide|update|review|refresh|clean|polish|help> [plan-name] [--branch] [--worktree] [--usage] [--flags]'
---

> **Compatibility**: On platforms without `AskUserQuestion`, emit one `NEEDS_INPUT:` line for the essential unresolved decision and wait for the caller to provide the answer. Do not replace an artifact write with an unsupported interactive prompt.

## Skill Requirements

```bash
command -v npx >/dev/null 2>&1 || echo "MISSING: npx"
```

## Inline Usage

`/spec new` accepts **either** an inline objective (plans immediately, no opening question) **or** a bare plan name (scaffolds `.codevoyant/plans/{name}/intent.md` for you to fill in, then plans on re-run).

```
/spec new add OAuth login to the settings page   # inline objective → plans now
/spec new --usage add OAuth login to settings     # also record planning AI usage → ai-usage.md
/spec new auth-refactor                           # bare name → writes intent.md to fill in
/spec new auth-refactor                           # re-run after filling it → plans
/spec go my-plan
```

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged
- **Workflow files are authoritative** — do not duplicate workflow logic in this file
- **Coding agents always receive a workflow checklist** — see `references/workflow-checklist.md`
- **Terminal artifact outcome** — `/spec new` and `/spec update` must not end after analysis, a refusal, or a validation finding. They either write and verify the requested plan artifact, deliberately write the documented intent scaffold, or emit exactly one actionable `NEEDS_INPUT:` question.
- **Markdown output: soft-wrap prose, never hard-wrap** — when any spec workflow or agent writes a `.md` artifact (plan.md, phase files, user-guide.md, PR body, or any generated document), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.
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
  "p")         VERB="polish"  ;;  # /spec p → /spec polish
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
- **polish** (`references/workflows/polish.md`) — strip AI-style verbosity from files touched by spec execution
- **allow** (`references/workflows/allow.md`) — pre-approve permissions for background agents
- **help** (`references/workflows/help.md`) — print command reference

## Agent Index

- **spec-executor** (`agents/spec-executor.md`) — executes plan phases autonomously; used by bg and go
- **spec-updater** (`agents/spec-updater.md`) — applies annotations and conversational plan edits; used by update
- **spec-planner** (`agents/spec-planner.md`) — researches scope and drafts multi-phase plans; used by new
