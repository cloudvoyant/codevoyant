# create-quiz

Author a graduate-level module quiz as diffbook MDX at `{BOOK_DIR}/{NN-module-slug}/quiz.mdx`, using the diffbook `<Quiz>` group with `SingleChoiceQuestion` / `MultipleChoiceQuestion` / `NumericQuestion` items. Questions are Bloom-distributed for the module's syllabus position and must pass the quiz quality gate.

## ⛔ HARD STOPS — read before every action

This workflow's **only output** is `quiz.mdx` for one module. If you are about to do anything else, stop.

| You are about to… | Correct action |
|---|---|
| Write a lesson `.mdx`, `index.mdx`, or `project.mdx` | Stop. Not this verb. Use `create-lesson` / `create-project`. |
| Edit the module `plan.md`, `syllabus.md`, or `sources.md` | Stop. Those are inputs, read-only here. Fix them via `plan-module` / `update`. |
| Invent quiz content not grounded in the module's plan + authored lessons | Stop. Every question must test a concept covered in this module's lessons. |
| Ship a question with zero or two defensible correct answers | Stop. Fix it — the quiz gate requires exactly one defensible answer. |
| Proceed past a failing quiz gate without `--yes` | Stop. Report the failure and wait. |

**Permitted file write:** `{BOOK_DIR}/{NN-module-slug}/quiz.mdx` only.

## Variables

Received from dispatcher:

- `COURSE` — first non-flag token of `REMAINING_ARGS` (course slug)
- `MODULE` — second non-flag token (module number `NN`, module slug, or `NN-slug`)
- `AUTO_YES` — true if `--yes` present (autodidact drives this; log gate failures and continue best-effort)

Resolve `ART_ROOT` and `BOOK_DIR` per `references/artifact-layout.md`.

## Step 0: Parse and resolve

1. If `COURSE` empty → discover courses (`ls .codevoyant/ed/`); if exactly one, use it; else STOP and ask which course.
2. If `MODULE` empty → STOP and list the module dirs under `$ART_ROOT/ed/{COURSE}/modules/` so the user can pick.
3. Resolve the module to its canonical `NN-slug` using the module dirs and `syllabus.md` order (accept bare `NN`, bare slug, or `NN-slug`). Set:
   - `MODULE_SLUG` = `{NN-slug}`
   - `PLAN_FILE` = `$ART_ROOT/ed/{COURSE}/modules/{NN-slug}/plan.md`
   - `SOURCES_FILE` = `$ART_ROOT/ed/{COURSE}/explore/modules/{NN-slug}.md`
   - `QUIZ_MDX` = `$BOOK_DIR/{NN-module-slug}/quiz.mdx`
   - `MODULE_DOCS_DIR` = `$BOOK_DIR/{NN-module-slug}/`

## Step 1: Require the module plan and authored lessons (scope gate)

The quiz is scoped strictly by what this module actually teaches.

1. **Require `PLAN_FILE`.** If it is missing, STOP:
   ```
   No module plan found for {COURSE}/{MODULE_SLUG}. Run /ed plan-module {COURSE} {MODULE} first.
   ```
2. Read `PLAN_FILE`. Extract:
   - the module's **quiz plan** (the concepts/skills the module author flagged for assessment),
   - the module's **learning objectives** with their Bloom tags,
   - the module's **syllabus position** (early / mid / late — determines the Bloom target below).
3. **Require the module's authored lessons.** Glob `$MODULE_DOCS_DIR*.mdx` excluding `index.mdx`, `quiz.mdx`, `project.mdx`. If **no** lesson `.mdx` exists, STOP:
   ```
   No authored lessons found in {MODULE_DOCS_DIR}. Run /ed create-lesson {COURSE} {MODULE} first — a quiz can only test authored material.
   ```
   Read every authored lesson `.mdx`. These lessons + the quiz plan define the **allowed question surface**: never ask about a term, formula, or result the lessons never define. (Respect `pedagogy.md` define-before-display — the quiz reinforces, it never introduces.)

## Step 2: Determine the Bloom distribution

Read `references/blooms-taxonomy.md`. Pick the target distribution for this module's syllabus position (Introductory / Intermediate / Advanced). Compute question counts for a quiz of **8–12 questions** (default 10) so the mix lands **within ±15%** of the target per level. Bias toward the module's own objective Bloom tags where the target allows a choice. Record the intended per-level counts before writing any question.

## Step 3: Generate questions

For each question, pick the diffbook component that fits the cognitive task:

- **`SingleChoiceQuestion`** — one defensible answer among plausible distractors (most Remember/Understand/Apply/Analyze items).
- **`MultipleChoiceQuestion`** — genuinely multi-select (e.g. "which of these hold"); make the correct-set size non-obvious.
- **`NumericQuestion`** — computation/derivation with a single numeric answer; set `tolerance` for real-valued results, `unit` when meaningful.

Author each with a real teaching **explanation** (see gate). Ground every prompt in a specific concept from the lessons; for Apply/Analyze levels, prefer a short worked scenario over recall.

## Step 4: Enforce the quiz gate (quality-gates.md)

Score the quiz against `references/quality-gates.md` **quiz gate**. Every item must satisfy:

1. **Exactly one defensible answer** (single-choice) / an exact correct set (multiple) / a single numeric answer within stated tolerance. No "arguably also correct" distractor.
2. **Plausible distractors** — same approximate length and grammatical form as the key, each targeting a **real, nameable misconception** a graduate student could hold. No throwaway/joke options.
3. **A/B/C/D balance ~25% each** for single-choice keys, with **no positional pattern** (not all `correct: 0`, no ABCD/DCBA runs). Shuffle keys across the quiz.
4. **Ban "All of the above" / "None of the above"** and their paraphrases.
5. **Bloom distribution** within **±15%** of the Step 2 target.
6. **Explanations 50–100 words**, teaching *why the key is right and why each distractor is wrong / which misconception it targets*.
7. **Valid links** — any URL referenced in an explanation is verified via WebFetch; drop or replace dead links.

**On fail:** auto-fix once (rebalance keys, rewrite weak distractors, lengthen/shorten explanations, re-tag Bloom), then re-score. If it still fails:
- **`AUTO_YES=true`** → log the failure (gate + score + shortfall) to `$ART_ROOT/ed/{COURSE}/state.md` and continue best-effort with the strongest version.
- **`AUTO_YES=false`** → STOP and report the specific failures; do not write `quiz.mdx`.

## Step 5: Write quiz.mdx

Write `QUIZ_MDX` from `references/templates/quiz-template.mdx`. Requirements:

- Frontmatter: `title` (e.g. "Module {N} review"), `order` placing the quiz after the lessons and before/with the project per `references/artifact-layout.md`, a one-line `description`.
- A single grouped **`<Quiz id="m{NN}-quiz" title="…" questions={[…]} />`** whose `questions` array uses the discriminated-union item shapes from `references/diffbook-components.md` (`type: 'single' | 'multiple' | 'numeric'`), each with a unique `id` (`q1`, `q2`, …), `prompt`, `choices`/`answer`, `correct`, and `explanation`. Component tags mean this is a `.mdx` file.
- LaTeX in prompts/explanations uses `\( \)` / `\[ \]`, never `$…$`.
- Soft-wrap all prose (one line per paragraph).

Do not write any other file.

## Step 6: Report

```
✅ Quiz authored — {COURSE} / {MODULE_SLUG}

  File:   {QUIZ_MDX}
  Items:  {N} ({single}/{multiple}/{numeric})
  Bloom:  R{..} U{..} Ap{..} An{..} E{..} C{..}  (target {position}: …)
  Gate:   {score}/100 {PASS | PASS after auto-fix | FAIL logged (--yes)}

Preview:  npx diffbook dev   (in {BOOK_DIR})
Next:     /ed create-project {COURSE} {MODULE}
```
