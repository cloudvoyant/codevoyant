# docs

Generate, update, review, and retroactively create engineering documentation for any project.

Triggers: "docs new", "docs update", "docs review", "docs retcon", "create docs", "generate docs for", "update docs", "review docs", "document this", "add docs"

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")              VERB="help" ;;
  "generate")      VERB="new" ;;
  "create")        VERB="new" ;;
  "add")           VERB="new" ;;
  "architecture")  VERB="new" ;;   # /docs architecture → /docs new (architecture)
  "readme")        VERB="new" ;;   # /docs readme → /docs new (readme)
  "audit")         VERB="review" ;;
  "check")         VERB="review" ;;
  "backfill")      VERB="retcon" ;;
  "retrofit")      VERB="retcon" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS`.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md`.

## Workflow Index

- **new** (`references/workflows/new.md`) — generate one or more specific doc files
- **update** (`references/workflows/update.md`) — update an existing doc from session context
- **review** (`references/workflows/review.md`) — audit docs/ files for template adherence
- **retcon** (`references/workflows/retcon.md`) — generate complete docs/ for a repo with none
- **help** (`references/workflows/help.md`) — print command reference
