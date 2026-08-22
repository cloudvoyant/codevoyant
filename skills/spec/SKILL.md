---
description: 'Specification-driven development. Triggers on: "spec new", "spec go", "spec guide", "spec review", "spec refresh", "spec update", "spec clean", "spec allow", "spec help", and all legacy /spec:* trigger phrases. Unified dispatcher — pass a subcommand as the first argument.'
name: spec
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list. Core functionality preserved on all platforms.'
argument-hint: '<new|go|guide|update|review|refresh|clean|polish|help> [plan-name] [--branch] [--worktree] [--persistent] [--flags]'
---

> **Compatibility**: AskUserQuestion falls back to numbered list on non-Claude-Code platforms.

## Skill Requirements

```bash
command -v npx >/dev/null 2>&1 || echo "MISSING: npx"
```

## Skill directory resolution

Workflows and the spawned `spec-executor` agent invoke the vendored checker at `scripts/scope.py`. Resolve the skill package root once and export it so every workflow bash block and spawned executor uses the same path — this works both from the repo `skills/spec/` checkout and from an installed copy. Do NOT rely on `$0` (it is the invoking shell, not this file):

```bash
# Resolve the skill package root (the directory containing this SKILL.md).
if [ -n "${BASH_SOURCE:-}" ]; then
  SPEC_SKILL=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
else
  SPEC_SKILL="${SPEC_SKILL:-$HOME/.claude/skills/spec}"
fi
export SPEC_SKILL
```

## Docs directory resolution

The docs directory is `docs/` by default. Override it per project with a `"docs_dir"` field in the codevoyant store's `.codevoyant/metadata.json` (a repo-root-relative path). Resolve once and export so the doc-aware workflows and the spawned validator use the same path:

```bash
resolve_docs_dir() {
  local root cfg d
  root="$(git rev-parse --show-toplevel 2>/dev/null)" || root="$PWD"
  cfg="$root/.codevoyant/metadata.json"
  d=""
  if [ -f "$cfg" ]; then
    d="$(python3 - "$cfg" <<'PY' 2>/dev/null
import json, sys
try:
    print(json.load(open(sys.argv[1])).get("docs_dir", ""))
except Exception:
    pass
PY
)"
  fi
  DOCS_DIR="${d:-docs}"
}
resolve_docs_dir
export DOCS_DIR
```

`$DOCS_DIR` is the single source for where docs live; the doc-aware workflows pass it to `validate_docs.py` and read docs from it instead of the literal `docs/`.

When dispatching, resolve `SPEC_SKILL` to the directory that contains this `SKILL.md` and export it so workflow bash blocks can invoke `python3 "$SPEC_SKILL/scripts/scope.py"`. Workflows that spawn the `spec-executor` agent (`go.md` — the `bg` alias dispatches here too) pass `SPEC_SKILL` into the executor's prompt so the executor can resolve the checker from any working directory.

## Inline Usage

`/spec new` accepts **either** an inline objective (plans immediately, no opening question) **or** a bare plan name (scaffolds `.codevoyant/spec/{name}/intent.md` for you to fill in, then plans on re-run).

```
/spec new add OAuth login to the settings page   # inline objective → plans now
/spec new --persistent add OAuth login             # EXPERIMENTAL — doc-aware planning (docs-first, glob-scoped phases)
/spec new auth-refactor                           # bare name → writes intent.md to fill in
/spec new auth-refactor                           # re-run after filling it → plans
/spec go my-plan
```

`--persistent` is an experimental flag on `new` and `update` that makes the flow doc aware (docs written first, phases glob-scoped, cross-module interaction via documented public interfaces). See `references/doc-aware.md`.

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Empty verb → ask the user what they want** (AskUserQuestion, numbered-list fallback on non-Claude-Code platforms) — never run help silently. **Unknown verb → run `help.md`** — never error silently.
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged
- **Workflow files are authoritative** — do not duplicate workflow logic in this file
- **Coding agents always receive a workflow checklist** — see `references/workflow-checklist.md`
- **Model tiers, never model IDs** — agents declare `metadata: model-tier: light|standard|heavy` and workflows use `model-tier:` tokens; the platform maps tiers to concrete models (see `references/model-tiers.md`). Never hardcode a provider model ID (such as `claude-*`) in this skill.
- **Markdown output: soft-wrap prose, never hard-wrap** — when any spec workflow or agent writes a `.md` artifact (plan.md, phase files, user-guide.md, PR body, or any generated document), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.
- **Plan store: `.codevoyant/spec/` with `.codevoyant/plans/` fallback** — new drafts are written under `.codevoyant/spec/{plan-name}/`. When reading existing drafts, resolve the store root as `.codevoyant/spec` if it exists, else `.codevoyant/plans` (a store not yet v2-migrated still keeps its drafts under `.codevoyant/plans/`). The v1→v2 store migration (`skills/migrate/references/migrate-v1-to-v2.minor.md`) relocates legacy drafts on run.
- See `references/workflows/` for per-verb behaviour; see `references/` for all templates

## Step 0: Parse Arguments

The raw invocation args (filled by Claude Code / OpenCode slash commands): `$ARGUMENTS`. If this line is not filled in, read the verb and remaining args from the user's current message.

Read the invocation from the current request. VERB = first non-flag argument; REMAINING_ARGS = everything after VERB, preserving order and flags. The invocation may arrive inline (Claude Code or OpenCode slash path) or as a plain message (skill-tool loading, other agents). If VERB is empty (nothing parseable was typed), ASK the user what they want (AskUserQuestion: new / go / guide / review / refresh / update / clean / polish / allow / help; numbered-list fallback on non-Claude-Code platforms) instead of silently running help. If the user explicitly typed `help` or an unrecognized verb, run help. Full contract: `skills/shared/arg-handling.md`.

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

# Normalise aliases
case "$VERB" in
  "")          ask the user what they want ;;   # empty invocation → ask, never silent help
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
