---
name: ed
description: 'Educational learning skill for graduate students: create Feynman-style study notes, pedagogical assignment guides, week-by-week syllabi, interactive walkthroughs, and quizzes. Triggers on: "ed new notes", "ed new guide", "ed new syllabus", "ed update", "ed assist", "ed quiz", "study notes for", "learning plan for", "quiz me on", "create study guide".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# ed

Educational skill for ML graduate students — create notes, guides, syllabi, and quizzes using LLMs as a learning tool.

## Inline Usage

Pass your intent directly:

```
/ed new notes "attention mechanisms" --resources slides/week3.pdf
/ed new guide "implement transformer"
/ed new syllabus "deep learning fundamentals"
/ed new notes "cs231n" --syllabus .codevoyant/syllabus/cs231n/syllabus.md
/ed update .codevoyant/notes/attention-mechanisms/notes.md
/ed assist .codevoyant/guides/transformer/guide.md --vim
/ed quiz "attention mechanisms"
```

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged
- **Markdown output: soft-wrap prose, never hard-wrap** — when any ed workflow writes a `.md` artifact (study notes, guides, syllabi, quizzes), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences. (Full guidance: `references/pedagogy.md`.)

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")         VERB="help" ;;
  "notes")    VERB="new"; REMAINING_ARGS="notes $REMAINING_ARGS" ;;   # /ed notes → /ed new notes
  "guide")    VERB="new"; REMAINING_ARGS="guide $REMAINING_ARGS" ;;   # /ed guide → /ed new guide
  "syllabus") VERB="new"; REMAINING_ARGS="syllabus $REMAINING_ARGS" ;; # /ed syllabus → /ed new syllabus
  "plan")     VERB="new"; REMAINING_ARGS="syllabus $REMAINING_ARGS" ;; # legacy: /ed plan → /ed new syllabus
  "walkthrough") VERB="assist" ;;
  "annotate")    VERB="update" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **new** (`references/workflows/new.md`) — sub-dispatch to notes / guide / syllabus creation
- **update** (`references/workflows/update.md`) — apply `<!-- > -->` / `<!-- >> -->` annotations from any ed artifact
- **assist** (`references/workflows/assist.md`) — interactive step-by-step guide walkthrough
- **quiz** (`references/workflows/quiz.md`) — create or interactively administer a quiz
- **help** (`references/workflows/help.md`) — print command reference
