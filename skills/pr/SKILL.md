---
name: pr
description: 'Code review workflows: create a draft PR/MR, generate AI-powered inline review comments, address change requests, or complete a draft review. Triggers on: "pr open", "pr new", "pr review", "pr address", "pr complete", "open a PR", "create a draft PR", "code review", "pr mr", "pr this PR", "address pr comments", "fix review comments", "complete draft review", "publish review".'
license: MIT
compatibility: Works on Claude Code. Requires gh (GitHub) or glab (GitLab) CLI.
requires_one_of: [gh, glab]
---

# pr

Code review skill dispatcher.

## Dependency Check

Before dispatching, verify that at least one skill from `requires_one_of` is available in your context.

Check whether you can invoke `/gh` or `/glab` (i.e. their instructions are loaded). If neither is present, stop and report:

```
Required skill not installed: gh or glab
Install: npx skills add codevoyant/codevoyant
```

## Inline Usage

Pass the PR/MR number directly: `/pr review 42`, `/pr address 42`.

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
  "")        VERB="help"    ;;
  "new")     VERB="review"  ;;  # alias: /pr new → /pr review
  "create")  VERB="open"    ;;
  "draft")   VERB="open"    ;;
  "ready")   VERB="publish" ;;  # alias: /pr ready → /pr publish
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **open** (`references/workflows/open.md`) — create a draft PR/MR with a standard template
- **review** (`references/workflows/review.md`) — generate inline review comments from a PR/MR diff
- **address** (`references/workflows/address.md`) — pull review comments, propose and apply fixes, respond + resolve threads
- **update** (`references/workflows/update.md`) — apply `<!-- > … -->` annotations or a chat edit to the last artifact (description/review/address)
- **squash** (`references/workflows/squash.md`) — squash branch commits into one or more coherent, changelog-ready commits
- **publish** (`references/workflows/publish.md`) — publish a draft PR/MR (mark ready) and/or its pending draft review; alias `ready`
- **complete** (`references/workflows/complete.md`) — publish a pending draft review
- **help** (`references/workflows/help.md`) — print command reference

## Agent Index

- **slop-detector** (`agents/slop-detector.md`) — detects AI slop and unwanted agent-introduced changes (unnecessary/out-of-scope edits, stochastic churn, boilerplate, leftovers); run by `review` as a dedicated parallel pass
