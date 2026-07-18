# create-lesson — author lesson `.mdx` into the diffbook book

`create-lesson <course> <module> [lesson]` turns a module's `plan.md` into published, graduate-level, Feynman-style diffbook lessons. It resolves (and if needed scaffolds) the diffbook book, ensures the module's chapter directory and overview exist, then delegates the actual authoring of each `.mdx` to the **ed-lesson-author** agent. It never invents sources — it hands the agent the module's vetted source shortlist.

## ⛔ HARD STOPS — read before every action

This workflow writes **only** into the diffbook book (`{BOOK_DIR}/docs/{NN-module-slug}/…`) and that chapter's `references.md`. If you are about to do anything else, stop.

| You are about to… | Correct action |
|---|---|
| Write anywhere under `{ART_ROOT}/ed/` (the plan artifacts) | Stop. Those are inputs (read-only here). Only the book is written. |
| Invent a source, URL, or citation | Stop. Use only the module source shortlist (`explore/modules/{NN_slug}.md`). If it's missing a needed source, note the gap — do not fabricate. |
| Author a lesson with no module `plan.md` | Stop. Require the plan first; tell the user to run `/ed plan-module`. |
| Hand-write a component-heavy `.mdx` yourself | Stop. Delegate authoring to the `ed-lesson-author` agent — that is its job. |
| Author a module quiz or project | Stop. Those are `create-quiz` / `create-project`. |
| Regenerate `plan.md` or `syllabus.md` | Stop. This verb consumes them; it does not rewrite them. |

## Variables

Received from the dispatcher (`REMAINING_ARGS` = everything after the verb):

- `COURSE_ARG` — first non-flag token (required)
- `MODULE_ARG` — second non-flag token (required; number `03` or slug)
- `LESSON_ARG` — optional third non-flag token (a lesson number `02` or slug); empty ⇒ author **all** lessons in the module
- `ART_ROOT` — plan-artifact root, default `.codevoyant`; override via `--dir <path>`
- `BOOK_DIR` — diffbook root, default `book/`; override via `--book <path>`
- `YES` — true if `--yes` present (autodidact path: continue best-effort on gate fail)

Resolve `ART_ROOT`, `BOOK_DIR`, `COURSE`, `COURSE_DIR = {ART_ROOT}/ed/{COURSE}/`, and the slug rule per `references/artifact-layout.md`.

## Step 0: Parse course + module + optional lesson

Split `REMAINING_ARGS` (flags stripped) into `COURSE_ARG`, `MODULE_ARG`, `LESSON_ARG`.

- Empty `COURSE_ARG` → list `ls {ART_ROOT}/ed/` and ask which course.
- Empty `MODULE_ARG` → show the module list from `syllabus.md` and ask which module.
- Kebab-case `COURSE_ARG` → `COURSE`.

## Step 1: Require the module plan; resolve `NN-slug` and the lesson list

Resolve the module exactly as `plan-module` Step 1 does: read `{COURSE_DIR}syllabus.md` for module order, map `MODULE_ARG` (number or slug) to `NN`, compute `MODULE_SLUG`, `NN_SLUG = {NN}-{MODULE_SLUG}`.

- `PLAN_FILE = {COURSE_DIR}modules/{NN_SLUG}/plan.md`. If it does not exist: **STOP.** Report: `No module plan at {PLAN_FILE}. Run /ed plan-module {COURSE} {module} first.`
- `SHORTLIST_FILE = {COURSE_DIR}explore/modules/{NN_SLUG}.md`. If missing, warn (the agent will fall back to the plan's inline citations, but the shortlist is the intended source of truth).
- Read `PLAN_FILE`. Extract the ordered lesson list (each lesson's `MM-lesson-slug`, learning goals, section outline with cited sources, example Q&As, quiz plan, visualization specs).
- Determine `LESSONS_TO_CREATE`:
  - `LESSON_ARG` empty → **all** lessons in `plan.md`.
  - `LESSON_ARG` numeric/slug → the single matching lesson (ambiguous/no match → list lessons and ask).

## Step 2: Resolve and (if needed) scaffold the diffbook book

Resolve `BOOK_DIR` per `references/artifact-layout.md`.

- If `BOOK_DIR` is **not** a scaffolded diffbook project (no `astro.config.mjs` / no `docs/` root): run `/diffbook init` to scaffold it at `BOOK_DIR` (when invoked under `autodidact`, autodidact has already scaffolded the book — skip and just verify). If `/diffbook` is unavailable, **STOP** and tell the user to install the diffbook skill and run `/diffbook init` (Phase 0 prerequisite).
- Ensure the course landing page `docs/index.md` exists (derived from `syllabus.md`); if absent, create it from `references/templates/course-index-template.md`.

## Step 3: Ensure the module chapter directory + overview

`CHAPTER_DIR = {BOOK_DIR}/docs/{NN_SLUG}/` (`mkdir -p` it).

Ensure `CHAPTER_DIR/index.mdx` (the module overview, `order: 0`) exists — module goal, expected outcomes, and the lesson map — derived from `plan.md` + the module's `syllabus.md` entry. If absent, create it (frontmatter `title`, `order: 0`, `description`; soft-wrapped prose; a `mermaid` lesson-dependency map is encouraged). If present, leave it unless a lesson was added/removed (then update the lesson map).

## Step 4: Author each lesson via the ed-lesson-author agent

For **each** lesson in `LESSONS_TO_CREATE`, delegate to the **`ed-lesson-author`** agent (definition: `agents/ed-lesson-author.md`). Pass:

- `COURSE`, `NN_SLUG` (module), and the **single lesson spec** for that lesson (the exact block from `plan.md`: `MM-lesson-slug`, Bloom-tagged learning goals, section outline with cited sources + anchors, example Q&As, quiz plan, visualization specs).
- `PLAN_FILE` path (for context) and `SHORTLIST_FILE` path (the module source shortlist — the agent's authoritative, closed set of sources).
- `BOOK_DIR` and the target output path `{CHAPTER_DIR}/{MM-lesson-slug}.mdx`.

Fan-out:
- **Single lesson** (`LESSON_ARG` given) → run one `ed-lesson-author` agent.
- **All lessons** → launch one agent **per lesson**; these are independent and **may run in parallel**. Each writes its own `.mdx`; none depends on another's output.

The agent reads the cited sources itself, authors the `.mdx` per `references/pedagogy.md` + `references/diffbook-components.md`, self-verifies against the lesson gate, and returns a summary (path, components used, gate result).

## Step 5: Validate component placement (optional)

After authoring, you MAY call `/diffbook author` over the new/changed `.mdx` pages to validate component syntax and placement (required props present, only the twelve components used, Mermaid via fenced block, `.mdx` extension for component pages). Fix any reported issues in place.

## Step 6: Lesson gate + one auto-fix (`references/quality-gates.md`)

For each authored lesson, confirm the agent's self-check against the lesson gate:

- **define-before-display** holds top-to-bottom (every term defined in prose before any diagram/code/table/quiz uses it).
- **≥1 interactive element per major concept** (`<QA>`, quiz item, `Manim`, `Chart`, or mermaid tied to that concept).
- **rhythm rule** satisfied (≤3 consecutive pure-prose paragraphs; element types varied).
- **≥4 verified references**, cited inline and listed at the end.
- The lesson **ends with a check** (a `<QA>` or a `Quiz`/question).
- Graduate reading level; all code runnable with shown intermediate outputs; no ellipses/placeholders.

On fail: **auto-fix once** (re-invoke the agent for that lesson with the specific failing checks), then re-verify. If still failing: interactive (`YES=false`) → **STOP** and report the failing lesson + checks; `--yes` → log to `{COURSE_DIR}state.md` and continue.

## Step 7: Write/update the module `references.md`

Write `CHAPTER_DIR/references.md` (plain `.md`, prose-only) from the module source shortlist (`SHORTLIST_FILE`): every source that grounds a lesson in this module, as an annotated reference list (title, author/venue, URL or citation, 20–40 word annotation per `references/source-tiers.md`). This is the module's consolidated bibliography — it must not introduce any source absent from the shortlist.

## Step 8: Report

```
✅ Lessons authored into {BOOK_DIR}/docs/{NN_SLUG}/

   {count} lesson(s): {list of MM-lesson-slug.mdx}   (gate: all ≥ pass)
   Chapter overview: docs/{NN_SLUG}/index.mdx
   References: docs/{NN_SLUG}/references.md

Preview:  npx diffbook dev   (in {BOOK_DIR})
Next:     /ed create-quiz {COURSE} {module}
```

Then stop. Do not author the quiz or project; do not touch other modules.
