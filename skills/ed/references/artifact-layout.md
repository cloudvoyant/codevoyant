# Artifact layout (shared by all ed workflows)

ed separates **planning artifacts** (drafts — the working source of truth) from **published MDX** (the diffbook book). Planning artifacts live under `.codevoyant/ed/{course}/`; MDX lives in the diffbook book (default `book/`).

## Layout

```
.codevoyant/ed/{course}/
  brief.md                       # structured intent, user-filled (see templates/brief-template.md)
  state.md                       # autodidact pipeline ledger + gate scores (templates/state-template.md)
  explore/
    sources.md                   # course-wide vetted source catalog (from explore)
    modules/{NN-slug}.md         # per-module source shortlist (written by plan-module)
  syllabus.md                    # dependency-ordered module program (from plan-syllabus)
  modules/{NN-slug}/
    plan.md                      # lesson-level outline for the module (from plan-module)

{PROJECT_ROOT}/                  # diffbook PROJECT root = cwd/repo root, scaffolded via /diffbook init
  astro.config.mjs               # diffbook({ ..., contentPath: './book' }) — written by /diffbook init
  package.json
  .diffbook/
  {BOOK_DIR}/                     # the CONTENT dir (diffbook contentPath, default book/) — content directly here, no docs/ layer
    index.md                     # course landing page (derived from syllabus)
    _animations/                 # Manim scene scripts (resolved by diffbook from the content dir)
    {NN-module-slug}/            # module = diffbook chapter (folder). NN = zero-padded order.
      index.mdx                  # module overview (order:0) — goal, outcomes, lesson map
      {MM-lesson-slug}.mdx       # lesson pages (order:MM)
      quiz.mdx                   # module quiz
      project.mdx                # module project + solution guide
      references.md              # module annotated references
```

**Layout note (PL-29):** diffbook's convention is a project at the repo root with `book/` as the `contentPath` **content** dir — content sits directly under `book/`, nested folders are chapters. `ed` runs `/diffbook init` at `PROJECT_ROOT` (never inside `BOOK_DIR`) and writes content straight into `BOOK_DIR/` with no intervening `docs/` layer. To repair a book scaffolded the old (buried) way, use `/ed doctor`.

## Resolving `ART_ROOT`, `PROJECT_ROOT`, and `BOOK_DIR`

Every workflow resolves these roots up front from `REMAINING_ARGS`:

```bash
# Plan-artifact root: default .codevoyant, override with --dir <path>
ART_ROOT=".codevoyant"
# if "--dir <path>" appears in REMAINING_ARGS: ART_ROOT="<path>"
ED_ROOT="$ART_ROOT/ed"

# diffbook PROJECT root: where /diffbook init runs and astro.config.mjs/.diffbook/ live.
# Default the cwd (repo root). (Content lives under BOOK_DIR below.)
PROJECT_ROOT="."

# diffbook CONTENT dir = diffbook `contentPath`: default book/, override with --book <path>.
# This is a dir NAME/relative path under PROJECT_ROOT — NOT a separate project.
BOOK_DIR="book"
# if "--book <path>" appears in REMAINING_ARGS: BOOK_DIR="<path>"

# Course slug: first non-flag positional after the verb (kebab-cased, see slug rule)
COURSE="<slug>"
COURSE_DIR="$ED_ROOT/$COURSE"

mkdir -p "$COURSE_DIR"                 # always ensure the plan dir exists before writing
```

`--yes` (skip gate pauses) is parsed the same way but affects gate behaviour, not paths (see `quality-gates.md`).

## Slug rule

`{course}` and every `{…-slug}` are **kebab-case**: lowercase, spaces→hyphens, keep alphanumerics and hyphens only, collapse repeats, trim leading/trailing hyphens, truncate to ≤50 chars.

```bash
slugify() { echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-50; }
# "Transformer Architectures!" → "transformer-architectures"
```

## Module and lesson ordering

Module directory prefix `NN` is a **two-digit zero-padded** integer reflecting the module's position in the syllabus (`01-`, `02-`, `10-`). Lesson prefix `MM` is likewise two-digit zero-padded, reflecting lesson order within `plan.md`. Derive `NN` from the module's position in `syllabus.md` (never guess); derive `MM` from the lesson's position in the module `plan.md`.

```bash
NN=$(printf '%02d' "$MODULE_INDEX")     # e.g. 2 → "02"
MODULE_SLUG="$NN-$(slugify "$MODULE_TITLE")"      # 02-attention-and-self-attention
MM=$(printf '%02d' "$LESSON_INDEX")
LESSON_SLUG="$MM-$(slugify "$LESSON_TITLE")"      # 01-scaled-dot-product-attention
```

A `<module>` argument may be given as the bare index (`2`, `02`) or the full slug (`02-attention`); resolve it against `syllabus.md` / the existing `modules/` and `docs/` dirs.

## Course discovery

List existing courses and inspect one:

```bash
ls .codevoyant/ed/                            # all courses
ls .codevoyant/ed/{course}/modules/           # planned modules
ls {BOOK_DIR}/                           # published chapters
```

## MDX vs MD

Use `.mdx` for any page that carries diffbook component tags (`<QA>`, `<Quiz>`, `<Manim>`, `<YouTube>`, `<Bookmark>`, `<Figure>`, `<Chart>`, question components) — lessons, quizzes, projects, module `index.mdx`. Use plain `.md` for prose-only pages (module `references.md`, course `index.md`, and all `.codevoyant/ed/**` plan artifacts). Mermaid is a fenced ```` ```mermaid ```` block, not a tag, so it is allowed in either.

## Soft-wrap

All `.md` and `.mdx` prose is **soft-wrapped**: one continuous line per paragraph. Newlines separate paragraphs, list items, headings, and code fences only. Never hard-wrap prose at a column width. LaTeX uses `\( \)` inline and `\[ \]` display, never `$…$`.
