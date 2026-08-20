---
name: docs
description: 'Generate, review, and update engineering documentation in simple technical English. `new` scaffolds the doc skeleton via a script (@agent prompts, no prose); `retcon` authors real content from the codebase. Review produces a replacement report; update consumes it. Triggers on: "docs new", "docs update", "docs review", "docs retcon", "create docs", "generate docs for", "update docs", "review docs", "document this", "add docs".'
license: MIT
compatibility: Works on Claude Code. AskUserQuestion falls back to a numbered list on non-Claude-Code platforms.
---

# docs

Generate, update, review, and retroactively create engineering documentation for any project.

Triggers: "docs new", "docs update", "docs review", "docs retcon", "create docs", "generate docs for", "update docs", "review docs", "document this", "add docs"

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Empty verb → ask the user what they want** (AskUserQuestion, numbered-list fallback on non-Claude-Code platforms) — never run help silently. **Unknown verb → run `help.md`** — never error silently.
- **Markdown output: soft-wrap prose, never hard-wrap** — when any docs workflow writes a `.md` artifact, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences. (Full guidance: `references/language-guide.md`.)

## Skill directory resolution

Workflows invoke the vendored scripts (`scripts/scaffold.py`, `scripts/scope.py`) via `$SKILL/scripts/...`. Resolve the skill package root once and export it so every workflow bash block uses the same path — this works both from the repo `skills/docs/` checkout and from an installed copy. Do NOT rely on `$0` (it is the invoking shell, not this file):

```bash
if [ -n "${BASH_SOURCE:-}" ]; then
  SKILL=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
else
  SKILL="${SKILL:-$HOME/.claude/skills/docs}"
fi
export SKILL
```

## Step 0: Parse Arguments

Read the invocation from the current request. VERB = first non-flag argument; REMAINING_ARGS = everything after VERB, preserving order and flags. The invocation may arrive inline (Claude Code) or as a plain message. If VERB is empty (nothing parseable was typed), ASK the user what they want (AskUserQuestion: new / update / review / retcon / validate / help; numbered-list fallback on non-Claude-Code platforms) instead of silently running help. If the user explicitly typed `help` or an unrecognized verb, run help. Full contract: `skills/shared/arg-handling.md`.

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")              ask the user what they want ;;   # empty invocation → ask, never silent help
  "generate")      VERB="new" ;;
  "create")        VERB="new" ;;
  "add")           VERB="new" ;;
  "architecture")  VERB="new"; REMAINING_ARGS="architecture $REMAINING_ARGS" ;;   # /docs architecture → /docs new (architecture)
  "readme")        VERB="new"; REMAINING_ARGS="readme $REMAINING_ARGS" ;;         # /docs readme → /docs new (readme)
  "user-guide")    VERB="new"; REMAINING_ARGS="user-guide $REMAINING_ARGS" ;;     # /docs user-guide → /docs new (user-guide)
  "development-guide") VERB="new"; REMAINING_ARGS="development-guide $REMAINING_ARGS" ;;  # /docs development-guide → /docs new (development-guide)
  "ci")            VERB="new"; REMAINING_ARGS="ci $REMAINING_ARGS" ;;             # /docs ci → /docs new (ci); ci.md covers CI/CD + infrastructure
  "audit")         VERB="review" ;;
  "check")         VERB="review" ;;
  "validate")      VERB="validate" ;;
  "backfill")      VERB="retcon" ;;
  "retrofit")      VERB="retcon" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS`.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md`.

## Workflow Index

- **new** (`references/workflows/new.md`) -- initialize the docs SKELETON: scan the repo and run `scripts/scaffold.py` to copy template skeletons with `@agent` prompts (no prose, no code analysis). Bare `/docs new` scaffolds the base structure (README + `docs/{user-guide,ci,development-guide,architecture/index}`, monorepo per-app/lib component docs); named targets scaffold a single skeleton
- **update** (`references/workflows/update.md`) -- update an existing doc: consumes review report if present, otherwise audits and applies minimal fixes, escalates to review-first when changes are too large; `--scaffold` creates missing files/sections with template headings only
- **review** (`references/workflows/review.md`) -- audit docs for template/language compliance and write a replacement report to `.codevoyant/review/{slug}/docs-review.md` (read-only)
- **retcon** (`references/workflows/retcon.md`) -- intelligent backward authoring: the ONLY command that writes real content — moves existing docs to `docs/legacy/` (carrying their facts forward), analyzes the codebase, and fills the full mandated doc structure with accurate prose, diagrams, and tables; ends by validating every doc's `globs` against the real code tree
- **validate** (`references/workflows/validate.md`) -- code-reading check: confirms each doc's `globs` are valid (point at real paths) and comprehensive (every discovered component has an owning doc), and that docs obey glob/component boundaries
- **help** (`references/workflows/help.md`) -- print command reference
