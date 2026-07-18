---
name: ed
description: 'Builds high-quality, literature-grounded, graduate-level interactive textbooks as diffbook MDX. Triggers on: "ed explore", "ed plan-syllabus", "ed plan-module", "ed create-lesson", "ed create-quiz", "ed create-project", "ed autodidact", "ed update", "ed help", plus natural language like "build an interactive textbook", "create a course on", "study syllabus for", "graduate lesson on", "quiz me on", "course project for". Unified dispatcher — pass a subcommand as the first argument.'
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list. Core functionality preserved on all platforms. Requires the diffbook skill and `npx diffbook` for authoring MDX books.'
argument-hint: '<explore|plan-syllabus|plan-module|create-lesson|create-quiz|create-project|autodidact|update|help> [course] [module] [lesson] [--book <path>] [--dir <path>] [--yes]'
---

> **Compatibility**: AskUserQuestion falls back to numbered list on non-Claude-Code platforms.

# ed

Author graduate-level, literature-grounded **interactive textbooks** as diffbook MDX — vetted sources, a dependency-ordered syllabus, scaffolded lessons, Bloom-distributed quizzes, and real-assignment projects, all behind scored quality gates.

## Skill Requirements

```bash
command -v npx >/dev/null 2>&1 || echo "MISSING: npx"
# diffbook skill provides /diffbook init|author; used to scaffold and validate the book.
```

## Inline Usage

Each verb operates on a `{course}` slug; planning artifacts live under `.codevoyant/ed/{course}/`, published MDX under the diffbook book (default `book/`).

```
/ed explore "transformer architectures"                 # vet & annotate reference materials
/ed plan-syllabus transformer-architectures             # dependency-ordered module program (gate ≥85)
/ed plan-module transformer-architectures 02            # lesson-level outline for one module (gate ≥80)
/ed create-lesson transformer-architectures 02 01       # author one lesson .mdx into the book
/ed create-quiz transformer-architectures 02            # author the module quiz .mdx
/ed create-project transformer-architectures 02         # author the module project + solution guide
/ed autodidact "reinforcement learning" --yes           # one-shot: brief → … → whole book, gated, best-effort
/ed update transformer-architectures 02/01              # re-run the minimal affected slice / apply annotations
/ed help
```

Bare-noun ergonomics: `/ed syllabus …`, `/ed module …`, `/ed lesson …`, `/ed quiz …`, `/ed project …` map to the `plan-`/`create-` verbs.

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — the workflow receives `$REMAINING_ARGS` unchanged (course, module, lesson, and all `--book`/`--dir`/`--yes` flags)
- **MDX output goes to the diffbook book**, plan/draft artifacts go to `.codevoyant/ed/{course}/` — see `references/artifact-layout.md`
- **Markdown/MDX output: soft-wrap prose, never hard-wrap** — every workflow and agent writes each paragraph as one continuous line; newlines separate paragraphs, list items, headings, and fences only. LaTeX uses `\( \)` / `\[ \]`, never `$…$`. (Full guidance: `references/pedagogy.md`.)
- **Gates before advancing** — every stage scores its output and refuses to advance a weak artifact; interactive runs STOP on repeated failure, `autodidact --yes` logs to `state.md` and continues best-effort (see `references/quality-gates.md`)
- See `references/workflows/` for per-verb behaviour; see `references/` for shared references and templates

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

# Normalise bare-noun aliases to their full verbs
case "$VERB" in
  "")         VERB="help" ;;
  "syllabus") VERB="plan-syllabus" ;;   # /ed syllabus → /ed plan-syllabus
  "module")   VERB="plan-module" ;;     # /ed module   → /ed plan-module
  "lesson")   VERB="create-lesson" ;;   # /ed lesson   → /ed create-lesson
  "quiz")     VERB="create-quiz" ;;     # /ed quiz     → /ed create-quiz
  "project")  VERB="create-project" ;;  # /ed project  → /ed create-project
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **explore** (`references/workflows/explore.md`) — find & vet reference materials for a course; verify URLs; annotate → `explore/sources.md`
- **plan-syllabus** (`references/workflows/plan-syllabus.md`) — dependency-ordered module program with Bloom objectives (gate ≥85) → `syllabus.md`
- **plan-module** (`references/workflows/plan-module.md`) — read a module's sources and craft a lesson-level outline (gate ≥80) → `modules/{NN}/plan.md`
- **create-lesson** (`references/workflows/create-lesson.md`) — author one lesson `.mdx` into the book, Feynman-style at graduate level
- **create-quiz** (`references/workflows/create-quiz.md`) — author a Bloom-distributed module quiz `.mdx`
- **create-project** (`references/workflows/create-project.md`) — author a module project + solution guide grounded in a real sourced assignment
- **autodidact** (`references/workflows/autodidact.md`) — chain everything from a topic into a whole book, gated, with a `state.md` ledger
- **update** (`references/workflows/update.md`) — re-run the minimal affected slice; consume `<!-- > -->` / `<!-- >> -->` annotations
- **help** (`references/workflows/help.md`) — print command reference

## Agent Index

- **ed-lesson-author** (`agents/ed-lesson-author.md`) — authors ONE lesson `.mdx` from `{module}/plan.md` + the module's source shortlist; self-checks against the lesson gate; used by create-lesson (single) and autodidact (per-lesson fan-out)
