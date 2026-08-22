---
name: pr
description: 'Code review workflows: create a draft PR/MR, generate AI-powered inline review comments, address change requests, publish a draft review, or merge a PR/MR. Triggers on: "pr open", "pr new", "pr review", "pr address", "pr publish", "pr merge", "open a PR", "create a draft PR", "code review", "pr mr", "pr this PR", "address pr comments", "fix review comments", "publish review", "merge PR", "land PR".'
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

- **Markdown output: soft-wrap prose, never hard-wrap** — when this skill writes a `.md` artifact (PR/MR body, review doc, or any generated document), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences. (If a markdown formatter is available, `prettier --prose-wrap never` enforces this deterministically.)

- **Model tiers, never model IDs** — the `pr` agents declare `metadata: model-tier: standard`; the platform maps tiers to concrete models (see `references/model-tiers.md`). Never hardcode a provider model ID (such as `claude-*`) in this skill.

- **Terse by default (STE).** Generated prose follows `references/voice.md` and, when drafting PR/MR bodies, review comments, and summaries, the vendored STE ruleset (`references/simple-english/ruleset.md`) in pragmatic mode — short sentences, plain vocabulary, no filler. See `references/voice.md` § STE.

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged

## Step 0: Parse Arguments

The raw invocation args (filled by Claude Code / OpenCode slash commands): `$ARGUMENTS`. If this line is not filled in, read the verb and remaining args from the user's current message.

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")        VERB="help"    ;;
  "new")     VERB="review"  ;;  # alias: /pr new → /pr review
  "create")  VERB="open"    ;;
  "draft")   VERB="open"    ;;
  "ready")   VERB="publish" ;;  # alias: /pr ready → /pr publish
  "land")    VERB="merge"   ;;  # alias: /pr land → /pr merge
esac
```

Note: `complete` is no longer a `pr` verb — it was folded into `publish` (`/pr publish --review-only`). `/pr complete` falls through to `help`. (The platform `/gh complete` / `/glab complete` subcommands are unaffected.)

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **open** (`references/workflows/open.md`) — create a draft PR/MR with a standard template
- **review** (`references/workflows/review.md`) — generate inline review comments from a PR/MR diff
- **address** (`references/workflows/address.md`) — pull review comments, propose and apply fixes, respond + resolve threads
- **update** (`references/workflows/update.md`) — apply `<!-- > … -->` annotations or a chat edit to the last artifact (description/review/address)
- **squash** (`references/workflows/squash.md`) — squash branch commits into one or more coherent, changelog-ready commits
- **publish** (`references/workflows/publish.md`) — publish whatever is pending: mark a draft PR/MR ready, submit its pending review (with a non-empty markdown summary), and/or push+submit an unpublished local review doc; alias `ready`
- **merge** (`references/workflows/merge.md`) — merge the PR/MR (squash by default, semantic-release aware), then best-effort watch post-merge CI on the base branch and notify on failure (opt out with `--no-watch-ci`); `--cleanup` deletes the merged source branch locally + remotely; alias `land`
- **help** (`references/workflows/help.md`) — print command reference

## Agent Index

`review` fans its assessment across parallel subagents, one per dimension:

- **slop-detector** (`agents/slop-detector.md`) — Dimension 2: unnecessary/out-of-scope edits, stochastic churn, boilerplate, dead/debug leftovers, accidental reverts
- **code-quality-auditor** (`agents/code-quality-auditor.md`) — Dimension 3: judges added/edited code against the relevant codevoyant skill or the language/framework standard
- **docs-freshness-checker** (`agents/docs-freshness-checker.md`) — Dimension 4: decides whether docs need updating and invokes `/docs update` when they are stale

(Dimension 1, intent-match & correctness, runs as an inline reviewer agent defined in `references/workflows/review.md`.)
