---
name: explore
description: 'Pure technical exploration: research a problem space, compare technical approaches, compare repos, and generate decision-oriented proposals. No code is written. Triggers on: "explore new", "explore diff", "explore allow", "explore help", "technical exploration", "research approaches", "explore options", "compare repos", "how does X work".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# explore

Technical exploration skill dispatcher. Exploration only — this skill never writes application code. Research notes, proposals, and repo comparisons are the only artifacts produced; the sole exception is a rare, clearly-labelled demo snippet inside a proposal, used to illustrate an approach and never shipped.

## Inline Usage

Pass your intent directly on the invocation line — `new` proceeds immediately with no opening question when a description is provided.

```
/explore new how the auth middleware works
/explore new "caching strategy" --aspects
/explore diff https://github.com/org/other-repo
```

## Critical Rules

- **Exploration only — no code.** This skill researches, compares, and proposes. It does not write application code, produce implementation plans or task breakdowns, or create Linear issues. The only permitted code is a rare demo snippet inside a proposal, clearly labelled as illustrative and not for production.
- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged
- **Markdown output: soft-wrap prose, never hard-wrap** — when any explore workflow or agent writes a `.md` artifact (proposals, research notes, summaries, comparisons), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.
- **Model tiers, never model IDs** — the `explore` agents declare `metadata: model-tier: light|standard|heavy` in frontmatter and workflows use `model-tier:` tokens; the platform maps tiers to concrete models (see `references/model-tiers.md`). Never hardcode a provider model ID (such as `claude-*`) in this skill.

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")         VERB="help"    ;;
  "explore")  VERB="new"     ;;  # alias: /explore explore → /explore new (pre-rename muscle memory)
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **new** (`references/workflows/new.md`) — research a technical problem, compare approaches, generate parallel proposals
- **diff** (`references/workflows/diff.md`) — compare two repos for structural differences
- **allow** (`references/workflows/allow.md`) — pre-approve permissions for background agents
- **help** (`references/workflows/help.md`) — print command reference

## Agent Index

- **proposal-writer** (`agents/proposal-writer.md`) — writes technical proposals; used by new
- **researcher** (`agents/researcher.md`) — researches technical approaches; used by new
