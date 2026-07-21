---
description: 'Unified skill lifecycle management. Triggers on: "skill explore", "skill new", "skill learn", "skill consolidate", "skill update", "skill critique", "skill feedback", "skill help", "skill create", "skill improve", "skill review", "skill scaffold", "explore skills", "create a skill", "make a skill for", "learn from", "extract skill from", "skill from PR", "skill from URL", "skill from path", "merge skills", "consolidate skills", "combine skills", "update skill", "improve skill", "critique skill", "review skill quality", "report skill bug", "skill issue", "scaffold skill repo", "init skill repo", "new skill repo". Pass a subcommand as the first argument.'
name: skill
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list. Core functionality preserved on all platforms.'
argument-hint: '[verb] [args...]'
---

> **Compatibility**: AskUserQuestion falls back to numbered list on non-Claude-Code platforms.

## Skill Requirements

```bash
command -v npx >/dev/null 2>&1 || echo "MISSING: npx"
```

## Inline Usage

Pass your intent directly on the invocation line — `new` and `explore` proceed immediately with no opening question when a description is provided.

```
/skill new add a /summarize command that condenses long files
/skill explore linear integration
/skill update linear-push
```

## Critical Rules

- **Markdown output: soft-wrap prose, never hard-wrap** — when this skill writes a `.md` artifact (SKILL.md, skill docs, critique/review reports, or any generated document), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences. (If a markdown formatter is available, `prettier --prose-wrap never` enforces this deterministically.)

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged
- **Workflow files are authoritative** — do not duplicate workflow logic in this file
- See `references/workflows/` for per-verb behaviour; see `references/` for all templates

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

# Normalise aliases
case "$VERB" in
  "")           VERB="help" ;;
  "create")     VERB="new" ;;
  "improve")    VERB="update" ;;
  "review")     VERB="critique" ;;
  "scaffold")   VERB="scaffold" ;;
  "init")       VERB="scaffold" ;;
  "bootstrap")  VERB="scaffold" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **explore** (`references/workflows/explore.md`) — research existing skills on agentskill.sh before building
- **new** (`references/workflows/new.md`) — create a new Claude Code compatible skill from a description
- **learn** (`references/workflows/learn.md`) — extract a skill from a local path, URL, or PR/MR diff
- **consolidate** (`references/workflows/consolidate.md`) — merge two skills into one, deduplicating workflows
- **update** (`references/workflows/update.md`) — update or improve an existing skill
- **critique** (`references/workflows/critique.md`) — evaluate skill quality across 5 dimensions
- **feedback** (`references/workflows/feedback.md`) — open a GitHub or GitLab issue to report a skill problem
- **scaffold** (`references/workflows/scaffold.md`) — initialise a new skill repo with annotated example skills
- **help** (`references/workflows/help.md`) — print command reference
