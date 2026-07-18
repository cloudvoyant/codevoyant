# create-project

Author a graduate-level module **project + solution guide** as diffbook MDX at `{BOOK_DIR}/docs/{NN-module-slug}/project.mdx`. The project must be **adapted from a REAL, sourced assignment** (an MIT OCW problem set, another course's assignment, or a course-repo task) drawn from the module's vetted sources — located, cited, and never fabricated.

## ⛔ HARD STOPS — read before every action

This workflow's **only output** is `project.mdx` for one module. If you are about to do anything else, stop.

| You are about to… | Correct action |
|---|---|
| Write a lesson, `index.mdx`, or `quiz.mdx` | Stop. Not this verb. |
| Edit the module `plan.md`, `syllabus.md`, or `sources.md` | Stop. Read-only inputs here. |
| Invent an assignment with no real source | Stop. You MUST locate and cite a real sourced assignment to adapt. If none can be found, STOP and report — do not fabricate one. |
| Paste a source's problem statement verbatim | Stop. Adapt and attribute; cite the origin with a `<Bookmark>`. |
| Present a solution you did not ground in real solution material where it exists | Stop. Ground the solution guide in the actual solution code/text when the source provides it; otherwise mark clearly as an author-derived reference solution. |

**Permitted file write:** `{BOOK_DIR}/docs/{NN-module-slug}/project.mdx` only.

## Variables

Received from dispatcher:

- `COURSE` — first non-flag token (course slug)
- `MODULE` — second non-flag token (`NN`, slug, or `NN-slug`)
- `AUTO_YES` — true if `--yes` present

Resolve `ART_ROOT` and `BOOK_DIR` per `references/artifact-layout.md`.

## Step 0: Parse and resolve

1. `COURSE` empty → discover (`ls .codevoyant/ed/`); one → use it; else STOP and ask.
2. `MODULE` empty → STOP and list module dirs under `$ART_ROOT/ed/{COURSE}/modules/`.
3. Canonicalize to `MODULE_SLUG` = `{NN-slug}`. Set:
   - `PLAN_FILE` = `$ART_ROOT/ed/{COURSE}/modules/{NN-slug}/plan.md`
   - `SOURCES_FILE` = `$ART_ROOT/ed/{COURSE}/explore/modules/{NN-slug}.md`
   - `COURSE_SOURCES` = `$ART_ROOT/ed/{COURSE}/explore/sources.md`
   - `PROJECT_MDX` = `$BOOK_DIR/docs/{NN-module-slug}/project.mdx`

## Step 1: Require the module plan and sources

1. **Require `PLAN_FILE`.** Missing → STOP: `Run /ed plan-module {COURSE} {MODULE} first.`
2. Read `PLAN_FILE` — take the module's **mini-project idea**, learning objectives, and the concepts the project should exercise.
3. **Require sources.** Read `SOURCES_FILE` (module shortlist) and, if present, `COURSE_SOURCES`. If neither exists, STOP: `No vetted sources for this module. Run /ed explore {COURSE} (and plan-module) first.` Per `references/source-tiers.md`, the sources that matter here are **OCW course sites**, **GitHub course/problem-set repos**, and any assignment-bearing course pages.

## Step 2: Find a REAL assignment to adapt

From the module's sources, locate an actual assignment aligned with the module's objectives:

1. Prefer sources already tagged as OCW or course repos in `SOURCES_FILE`. For each candidate:
   - **OCW:** WebFetch the course's *Assignments* / *Problem Sets* / *Projects* page; identify a problem set or project matching this module's concepts. Note the exact assignment title, number, URL, and license (OCW is typically CC BY-NC-SA — attribute accordingly).
   - **GitHub:** WebFetch / browse the repo's `assignments/`, `psets/`, `homework/`, `labs/`, or `projects/` paths; identify the task and, crucially, whether a **solution** (`solutions/`, `sol/`, reference implementation, or answer branch) exists.
2. If the module's own sources yield nothing suitable, run a scoped **WebSearch** (e.g. `MIT OCW {course topic} problem set`, `{topic} course assignment github`) and **WebFetch** to confirm a real, reachable assignment. Add its URL to the citation set; verify it loads.
3. Capture: `ASSIGNMENT_TITLE`, `ASSIGNMENT_URL`, `ASSIGNMENT_ORIGIN` (course/institution), `SOLUTION_AVAILABLE` (yes/no) and, if yes, the solution's location + key steps/code.
4. **If no real assignment can be located and verified:** STOP (or, under `AUTO_YES`, log to `state.md` and skip this module's project with a warning). Never invent one.

## Step 3: Write the project brief (Create-level)

Per `references/blooms-taxonomy.md`, a project targets the **Create** level. Adapt (do not copy) the sourced assignment into a graduate brief with:

- **Objectives** — 2–4 outcome statements tied to the module's objectives, phrased with Create-level verbs (design, build, synthesize, implement, evaluate).
- **Staged deliverables** — 3–5 milestones of increasing difficulty (e.g. scaffold → core algorithm → extension → analysis writeup), each with a concrete acceptance description.
- **Starter scaffolding** — minimal starter structure/signatures the student begins from (fenced code where useful), mirroring the real assignment's scaffold when it has one.
- **Hints** — progressive, revealable, so they don't spoil: put each hint in a `<QA question="Stuck on …?">…</QA>` or a `<details>` block, ordered from gentle nudge to concrete pointer.
- **Grading rubric** — a criteria table (correctness, design, analysis, code quality, etc.) with weights and level descriptors; align it to the deliverables.

## Step 4: Write the solution guide (collapsible)

- Put the full solution guide inside a collapsed **`<details><summary>Solution guide</summary> … </details>`** so students can attempt first.
- Ground it in **actual solution material** when the source provides it (Step 2 `SOLUTION_AVAILABLE=yes`): walk through the real approach and key code, adapted and explained — not pasted wholesale. Cite where the solution lives.
- When no official solution exists, write a correct **author-derived reference solution** and label it as such (`Reference solution (author-derived — no official solution published)`).
- Explain *why* the approach works (Feynman-style), call out common pitfalls, and map each deliverable to its solved counterpart.

## Step 5: Cite the source (mandatory)

- Add a **`<Bookmark url="{ASSIGNMENT_URL}" />`** and a prose attribution line naming `ASSIGNMENT_TITLE`, `ASSIGNMENT_ORIGIN`, and the license (e.g. "Adapted from {title}, {origin} (OCW, CC BY-NC-SA)."). If solution code was used, cite that too.
- All URLs used here must have been WebFetch-verified in Step 2. Drop or replace any that don't resolve.

## Step 6: Write project.mdx and report

Write `PROJECT_MDX` from `references/templates/project-template.mdx`:

- Frontmatter: `title` ("Module {N} project — {short name}"), `order` after the quiz per `references/artifact-layout.md`, one-line `description`.
- Sections: brief (objectives, staged deliverables, starter scaffolding), hints (`<QA>`/`<details>`), rubric table, collapsible solution guide, source citation (`<Bookmark>` + attribution). LaTeX via `\( \)` / `\[ \]`. Soft-wrap prose. `.mdx` (uses components).

Report:

```
✅ Project authored — {COURSE} / {MODULE_SLUG}

  File:      {PROJECT_MDX}
  Adapted:   {ASSIGNMENT_TITLE} — {ASSIGNMENT_ORIGIN}
  Source:    {ASSIGNMENT_URL}  (verified)
  Solution:  {grounded in real solution | author-derived reference}
  Rubric:    {K} criteria · {D} staged deliverables

Preview:     npx diffbook dev   (in {BOOK_DIR})
```
