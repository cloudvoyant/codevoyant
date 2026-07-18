# plan-syllabus — dependency-ordered module program

From the brief and the vetted source catalog, produce a dependency-ordered syllabus: each module has a goal, expected outcome, Bloom-tagged objectives, concept coverage, prerequisites, ≥1 primary text source, and a mini-project idea. Passes a scored gate before it is written. This workflow **only writes `syllabus.md`** — it does not read full texts (that is `plan-module`) or author any lesson.

## ⛔ HARD STOPS — read before every action

This workflow's **only write** is `syllabus.md`. If you are about to do anything else, stop.

| You are about to… | Correct action |
|---|---|
| Read full textbook/paper contents to plan lessons | Stop. That is `plan-module`. Here you only use catalog annotations. |
| Write a module `plan.md`, a `.mdx` lesson, quiz, or project | Stop. Wrong stage. This workflow ends at `syllabus.md`. |
| Proceed with a missing/empty brief | Stop. Tell the user to fill it via `/ed explore {COURSE}`. |
| Proceed with no `explore/sources.md` | Stop. Tell the user to run `/ed explore {COURSE}` first (or offer inline exploration). |
| Cite a module source not present in `sources.md` | Stop. Every Primary Text Source must be an entry from the catalog. |
| Ship a syllabus where a zero-prereq module reads as advanced | Stop. The dependency direction is inverted (foundational smell test). |
| Ship a syllabus below the gate threshold after one auto-fix | Stop and report (interactive). |

## Variables

- `COURSE` — first non-flag token of REMAINING_ARGS (course slug; ask if empty)
- `ART_ROOT` — plan-artifact root; default `.codevoyant`, override via `--dir <path>` (see `references/artifact-layout.md`)
- `COURSE_DIR` — `{ART_ROOT}/ed/{COURSE}/`
- `BRIEF_FILE` — `{COURSE_DIR}/brief.md`
- `SOURCES_FILE` — `{COURSE_DIR}/explore/sources.md`
- `SYLLABUS_FILE` — `{COURSE_DIR}/syllabus.md`
- `MODULE_COUNT` — from the brief's `module_count`, else ~8
- `YES` — true if `--yes` present (autodidact path: log gate results and continue best-effort)
- `BRIEF_CONTEXT`, `SOURCES_CONTEXT` — read in Step 1
- `SPINE` — the chosen course structure (Step 1)

## Step 0: Parse args & preconditions

Parse `COURSE` (first non-flag token) and `--dir`, `--yes` from REMAINING_ARGS. Slug per `references/artifact-layout.md`. Resolve `ART_ROOT`, `COURSE_DIR`, `BRIEF_FILE`, `SOURCES_FILE`, `SYLLABUS_FILE`.

If `COURSE` is empty, ask (AskUserQuestion, free-text via Other): "Which course should I plan a syllabus for?".

Preconditions:

- **`BRIEF_FILE` missing or only the empty scaffold** → STOP: `No filled brief yet. Run /ed explore {COURSE} — it will scaffold brief.md, pause for you to fill it, and build the source catalog.`
- **`SOURCES_FILE` missing** → do not guess. Offer a choice (AskUserQuestion): "Run exploration inline now" or "Stop — I'll run /ed explore {COURSE} myself". If the user chooses inline, read and execute `references/workflows/explore.md` for `COURSE`, then continue here once `sources.md` exists. Otherwise STOP with `Run /ed explore {COURSE} first, then re-run /ed plan-syllabus {COURSE}.`

## Step 1: Read inputs & decide the spine

Read `BRIEF_FILE` → `BRIEF_CONTEXT` and `SOURCES_FILE` → `SOURCES_CONTEXT` (including the "Recommended course spine" note).

Decide `SPINE`:

- **If the brief names an OCW course / textbook**, or the catalog pins one → follow its structure (its lecture/chapter order becomes the backbone of the module order).
- **Else** → synthesize the spine from the catalog plus the `source-tiers.md` recommendation captured in the catalog's spine note.

Set `MODULE_COUNT` from the brief's `module_count`, else default ~8 (let the spine's natural unit count override if it is close).

## Step 2: Derive modules in dependency order

Break the course into `MODULE_COUNT` modules, each a coherent unit of study, ordered by **concept prerequisite** — a module may only depend on modules earlier in the order. Number them `01`, `02`, … reflecting this order (matches the `NN-slug` layout in `references/artifact-layout.md`).

**Foundational smell test (`references/quality-gates.md`):** after ordering, confirm every zero-prerequisite module genuinely reads as *introductory*. If a module with no prereqs reads as advanced (or an advanced topic sits with no dependencies), the dependency direction is inverted → **STOP** and re-order before continuing.

## Step 3: Fill each module

For every module, fill the template `references/templates/syllabus-template.md`:

- **Goal** — what this module is for (one sentence).
- **Expected Outcome** — what the learner can do after it.
- **Learning Objectives** — Bloom-tagged, using `references/blooms-taxonomy.md` action verbs. The distribution shifts across the program: early modules skew Remember/Understand (introductory targets), late modules skew Analyze/Evaluate/Create (advanced targets). Use the per-position target distributions in `blooms-taxonomy.md`.
- **Concepts Covered** — the concept list for the module.
- **Prerequisites** — links to the earlier modules it depends on (by `NN-slug`), or "none" for foundational modules.
- **Primary Text Sources** — cite **specific entries from `sources.md`** (≥1 per module); these are the texts `plan-module` will actually read.
- **Mini-Project idea** — a concrete applied task for the module.

After the module list, add a **module dependency mermaid** diagram (fenced ```mermaid``` flowchart of `NN-slug` nodes with prerequisite edges).

## Step 4: Syllabus gate

Score the syllabus against the **syllabus gate in `references/quality-gates.md`** (threshold **≥85**). The gate checks:

- **Bloom coverage across the program** — the objective mix spans the taxonomy and shifts intro→advanced per `blooms-taxonomy.md`.
- **Strict dependency ordering** — no forward references; foundational smell test holds.
- **≥1 primary text source per module**, each a real `sources.md` entry.
- **A mini-project per module.**

If the score is **below 85**: auto-fix once (re-order, add missing sources/objectives/projects, rebalance Bloom), then re-score. If it **still** fails, **STOP** and report the failing checks (interactive) — do not write a weak syllabus. (Under `--yes` / autodidact, log the score to `state.md` and continue best-effort with a warning, per `quality-gates.md`.)

## Step 5: Write & report

Write the syllabus to `SYLLABUS_FILE` (soft-wrapped, one line per paragraph).

Report:

```
✅ Syllabus ready: {SYLLABUS_FILE}   (gate: {score}/100)

  {MODULE_COUNT} modules, dependency-ordered:
    01 {title}  →  02 {title}  →  … 
  Spine: {SPINE}

Next:  /ed plan-module {COURSE} 1
       (or /ed autodidact {COURSE} to run the whole pipeline)
```

Then stop. Do not read full texts or write any module plan, lesson, quiz, or project — those are later stages.
