# plan-module — craft a lesson-level outline for one module, grounded in its actual sources

`plan-module <course> <module>` reads the **actual identified text sources** for a single module and turns them into a concrete lesson-level plan: lessons, per-lesson sections (each naming its cited source), Bloom-tagged learning goals, example Q&As, a quiz plan, and visualization specs naming specific diffbook components. The mandatory act here is **reading the real sources** — the outline is derived from what those sources actually contain, never invented.

## ⛔ HARD STOPS — read before every action

This workflow's **only outputs** are the module plan and its source shortlist. If you are about to do anything else, stop.

| You are about to… | Correct action |
|---|---|
| Write or edit a lesson `.mdx` | Stop. That is `create-lesson`. This verb only writes `plan.md` + the shortlist. |
| Scaffold the diffbook book / run `/diffbook init` | Stop. That belongs to `create-lesson`/`autodidact`, not here. |
| Write a section outline without having read its source | Stop. Read the source first (WebFetch/Read). Every section must be grounded in text you actually read. |
| Invent a URL, paper, or reading not in `sources.md`/`syllabus.md` | Stop. Only use sources already vetted upstream. If a source is missing, note the gap in the plan and continue with what exists. |
| Skip reading a Primary Text Source because it is "obvious" | Stop. Reading the module's Primary Text Sources is mandatory, not optional — it grounds the entire outline. |
| Author quiz questions or a quiz `.mdx` | Stop. Here you write the **quiz plan** (concepts + Bloom mix), not the quiz itself. That is `create-quiz`. |

Everything else is off-limits.

## Variables

Received from the dispatcher (`REMAINING_ARGS` = everything after the verb):

- `COURSE_ARG` — first non-flag token (required; the course slug or name)
- `MODULE_ARG` — second non-flag token (required; a module **number** like `3`/`03`, or a module **slug** like `attention`)
- `ART_ROOT` — plan-artifact root, default `.codevoyant`; override via `--dir <path>` (see `references/artifact-layout.md`)
- `BOOK_DIR` — diffbook root, default `book/`; override via `--book <path>` (resolved in `references/artifact-layout.md`; not written here, only reported)
- `YES` — true if `--yes` present (autodidact path: log gate results and continue best-effort instead of pausing)

Resolve `ART_ROOT`, `COURSE` (kebab-case slug), `COURSE_DIR = {ART_ROOT}/ed/{COURSE}/`, and the slug rule per `references/artifact-layout.md`.

## Step 0: Parse course + module

Split `REMAINING_ARGS` (flags stripped) into `COURSE_ARG` and `MODULE_ARG`.

- If `COURSE_ARG` is empty: list available courses with `ls {ART_ROOT}/ed/ 2>/dev/null` and ask (AskUserQuestion, free-text via Other): "Which course?"
- Kebab-case `COURSE_ARG` → `COURSE` per the slug rule.
- If `MODULE_ARG` is empty: stop and tell the user `plan-module` needs a module — show the module list from `syllabus.md` (Step 1) and ask which one.

## Step 1: Require the syllabus, resolve the module to `NN-slug`

`SYLLABUS = {COURSE_DIR}syllabus.md`.

- If `SYLLABUS` does not exist: **STOP.** Report: `No syllabus at {SYLLABUS}. Run /ed plan-syllabus {COURSE} first.` Do not fabricate a module list.
- Read `SYLLABUS`. Parse the ordered module list (module title, its goal/outcome, Bloom-tagged objectives, concept coverage, **Primary Text Sources**, mini-project idea). The syllabus order defines each module's two-digit prefix `NN` (`01-`, `02-`, …).
- Resolve `MODULE_ARG` to a single module:
  - If `MODULE_ARG` is numeric (`3`, `03`): pick the module at that 1-based syllabus position; `NN` = zero-padded position.
  - If `MODULE_ARG` is a slug/title fragment: match it (case-insensitive, kebab-compared) against module titles; `NN` = its syllabus position.
  - Ambiguous or no match → list the modules with their `NN` and ask which one.
- Compute `MODULE_SLUG` = kebab-case of the module title (slug rule), `NN_SLUG = {NN}-{MODULE_SLUG}` (e.g. `03-attention`).
- Set `MODULE_DIR = {COURSE_DIR}modules/{NN_SLUG}/`, `PLAN_FILE = {MODULE_DIR}plan.md`, `SHORTLIST_FILE = {COURSE_DIR}explore/modules/{NN_SLUG}.md`.
- If `PLAN_FILE` already exists: this is a re-plan. Read it, preserve any `<!-- > -->` / `<!-- >> -->` annotations, and regenerate rather than blindly appending.

## Step 2: Gather this module's sources (from the vetted catalog)

Read `{COURSE_DIR}explore/sources.md` (the course-wide vetted catalog written by `explore`).

Build `MODULE_SOURCES` — the set of sources relevant to this module — by intersecting:

1. The module's **Primary Text Sources** named in `syllabus.md`, and
2. Any catalog entries in `sources.md` whose annotation covers this module's concepts (textbook chapters, OCW lecture pages, papers, repos, YouTube lectures, notes/blogs).

Every source in `MODULE_SOURCES` must already exist in `sources.md` or `syllabus.md` — do **not** invent new ones here. Classify each by tier per `references/source-tiers.md` (textbook / OCW / paper / repo / YouTube / blog-notes). If a module has **zero** primary text sources identified, that is a gate failure to record in Step 6 (the syllabus should guarantee ≥1/module).

## Step 3: READ the sources (mandatory — this grounds the outline)

This is the load-bearing step. You may not outline a section you have not read the source for.

For every source in `MODULE_SOURCES`:

- **Online** (OCW lecture pages, lecture notes PDFs/HTML, arXiv/ACL/NeurIPS papers, repo READMEs/problem-set files, blog/notes): **WebFetch** the URL and read the substantive content — the actual definitions, derivations, notation, worked examples, figures described, and problem sets it contains. For a YouTube lecture, WebFetch the video page / description / any linked notes to capture what it teaches and its chapter structure.
- **Local file** (a path in `sources.md` pointing into the repo or a downloaded reading): **Read** it.
- If a fetch fails (dead link, paywall, JS-only page): retry once, then WebSearch for a mirror/canonical copy. If still unreachable, mark that source `[unreachable]` in the shortlist, drop it from the sections it would have grounded, and note the gap — never fabricate its contents.

As you read, capture per source: which **concepts** it authoritatively covers, the **exact section/chapter/page or timestamp** anchors you will cite, notation it introduces, worked examples/figures you can reuse, and any problem sets (for later `create-project`). These notes are the raw material for the outline — the plan must reflect what the sources actually say, not a generic template.

## Step 4: Decompose the module into lessons

From the module's goal, concept coverage, and what the sources actually contain, split the module into **lessons** (typically 2–5). Each lesson is a coherent, self-contained learning session ordered by dependency (foundational concepts first — apply the learning-graph smell test from `references/quality-gates.md`: a lesson with no prerequisites must genuinely read as introductory; if an advanced lesson reads as foundational, the ordering is inverted — fix it). Assign each lesson a two-digit `MM` prefix (`01-`, `02-`) and a kebab slug → `{MM}-{lesson-slug}`.

## Step 5: Fill the module-plan template (per lesson)

Write `PLAN_FILE` using `references/templates/module-plan-template.md`. For the module as a whole record: module title, `NN_SLUG`, goal, expected outcome, and the resolved lesson list. Then for **each lesson** fill:

- **Learning Goals** — 3–6 goals, each **Bloom-tagged** per `references/blooms-taxonomy.md`, with the tag mix skewed to this module's position (Introductory / Intermediate / Advanced distribution from that reference). Use the taxonomy's action verbs.
- **Section outline** — the lesson's sections in order. **Every section NAMES its cited source** (title + the exact chapter/section/page/timestamp anchor captured in Step 3) and states, in one line, what that source grounds. A section with no cited source is not allowed — it fails the gate.
- **Example Q&As** — 1–3 Feynman-style self-check question/answer pairs the lesson will surface (these seed the `<QA>` components in `create-lesson`).
- **Quiz plan** — the concepts this lesson contributes to the module quiz, with a target **Bloom mix** per `references/blooms-taxonomy.md` (e.g. "2 Understand, 1 Apply, 1 Analyze"). Concepts + Bloom mix only — not authored questions.
- **Visualization specs** — for each planned visual, name the **specific diffbook component** and what it depicts:
  - `mermaid` — flow/structure/architecture/dependency diagram (fenced block) — say what nodes/edges it shows.
  - `Manim` — math intuition/animation (name a scene, e.g. `softmax_temperature`) — say what it animates and why prose can't.
  - `Chart` — a data chart (`line`/`bar`/`area`/`pie`) — name the data it plots.
  - `YouTube` — a specific lecture from `MODULE_SOURCES` — give the video id/URL and the chapters worth marking.
  - `Bookmark` — a reference card for a specific source URL.
  - `Figure` — a captioned diagram/image and what it illustrates.
  Every visual must earn its place (Mayer coherence, `references/pedagogy.md`) — no decorative visuals. Tie each to the concept it clarifies.

All prose is soft-wrapped (one line per paragraph) per `references/artifact-layout.md`.

## Step 5b: Write the module source shortlist

Write `SHORTLIST_FILE` = `{COURSE_DIR}explore/modules/{NN_SLUG}.md` (`mkdir -p {COURSE_DIR}explore/modules` first). This is the per-module shortlist `create-lesson`/`ed-lesson-author` will consume — it must be self-sufficient. For each source in `MODULE_SOURCES` record: title, author/venue, tier (per `source-tiers.md`), the URL or local path, the exact anchors (chapter/section/page/timestamp) captured in Step 3, a 20–40 word annotation (what it covers + why it's relevant to this module, per `source-tiers.md`), which lessons/sections it grounds, and reachability status (`[verified]` / `[unreachable]`). Do not include sources you did not read.

## Step 6: Module-plan gate (`references/quality-gates.md`, threshold ≥80)

Score `PLAN_FILE` 0–100 against the module-plan gate:

- **Every section is grounded in a cited source** (named source + anchor; no unsourced section).
- **Quiz plan present** for every lesson (concepts + Bloom mix, distribution matching the module's position within ±15%).
- **Visualization specs present** and each names a specific diffbook component and what it depicts (no decorative/unspecified visuals).
- Learning goals are Bloom-tagged with the correct distribution skew.
- Lessons pass the learning-graph smell test (foundational-first ordering).
- ≥1 primary text source per lesson (else the syllabus under-sourced this module — record it).

On fail: **auto-fix once** (usually: read a source you skipped, add the missing citation/quiz/viz spec, reorder lessons), then re-score. If it still fails:
- Interactive (`YES=false`): **STOP** and report the failing checks and score.
- `--yes` (autodidact): log the score + failing checks to `{COURSE_DIR}state.md` and continue best-effort with a warning.

## Step 7: Report

```
✅ Module plan ready: {PLAN_FILE}   (gate: {score}/100)
   Shortlist: {SHORTLIST_FILE}

   Module {NN}: {module title}
   {L} lessons · {sourced-section count} grounded sections · {source count} sources read

Next:
  /ed create-lesson {COURSE} {module}          author all lessons for this module
  /ed create-lesson {COURSE} {module} {lesson}  author a single lesson
```

Then stop. Do not author any `.mdx`. Do not scaffold the book.
