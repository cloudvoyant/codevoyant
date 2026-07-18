# update

Smart re-application for a course: first consume inline annotations across the plan artifacts and book MDX, then translate conversational change requests into the **smallest correct** slice of the pipeline to re-run. Uses `state.md` to understand current progress. Never regenerates the whole book for a local edit.

## ⛔ HARD STOPS — read before every action

| You are about to… | Correct action |
|---|---|
| Re-run `autodidact` for a single-lesson or single-quiz change | Stop. Make the SMALLEST correct change — regenerate just that lesson/quiz/project. |
| Re-implement a verb's logic inline | Stop. Invoke the verb / `ed-lesson-author` agent; this file only routes. |
| Scan `<!-- >` before `<!-- >>` | Stop. Major annotations (`<!-- >> -->`) are scanned and applied BEFORE minor (`<!-- > -->`). |
| Leave an applied annotation comment in the file | Stop. Remove the entire `<!-- … -->` comment after applying it. |
| Re-ground sources for a local prose tweak | Stop. Only re-run `explore` when the *grounding itself* changes (new OCW course / different textbook). |

**Permitted writes:** the specific artifacts/MDX the located change touches, and `state.md` (record what was re-run).

## Variables

Received from dispatcher:

- `COURSE` — first non-flag token (course slug)
- `TARGET` — optional second token / trailing description: a file path, a module (`NN`/slug), a lesson, or a conversational change request
- `AUTO_YES` — true if `--yes` present (pass through to any re-run verb)

Resolve `ART_ROOT` and `BOOK_DIR` per `references/artifact-layout.md`. `STATE_FILE` = `$ART_ROOT/ed/{COURSE}/state.md`.

## Step 0: Resolve course

If `COURSE` empty → discover (`ls .codevoyant/ed/`); one → use it; else STOP and ask which course. Read `STATE_FILE` (if present) to understand what stages exist and their status — this tells you where in the chain any change lands.

## Step 1: Consume inline annotations FIRST

Annotations are the primary, cheapest change channel. Scan the course's plan artifacts **and** its book MDX:

```bash
# plan artifacts
find "$ART_ROOT/ed/{COURSE}" -name '*.md' 2>/dev/null
# book MDX + docs
find "$BOOK_DIR/docs" \( -name '*.mdx' -o -name '*.md' \) 2>/dev/null
```

If `TARGET` is a concrete file path, scan only that file.

In each file, find HTML-comment annotations, scanning **`<!-- >>` (major) BEFORE `<!-- >` (minor)** — this ordering is a hard rule:

- `<!-- >> instruction -->` — **major**: add a section, expand treatment, add examples/visuals/questions as described.
- `<!-- > instruction -->` — **minor**: fix, rephrase, or correct in place.

A bare `>` line is an ordinary blockquote — ignore it. Comments may span multiple lines; the instruction is the text between the marker and `-->`.

For each annotation: read ±10 lines of context, apply the change with Edit, then **remove the entire `<!-- … -->` comment**. Log each: `✓ Applied [{major|minor}] {file}:{line} — {summary}`.

If an annotation lands in book MDX, keep it valid diffbook MDX per `references/diffbook-components.md` and the pedagogy/quality gates in `references/pedagogy.md` / `references/quality-gates.md`.

## Step 2: Route the conversational change (if any)

If `TARGET` (or the user's message) is a conversational change request rather than a pure annotation pass, locate **where in the chain** it belongs and re-run the **minimal slice**. Use `STATE_FILE` to know what already exists. Decide by scope:

| Change scope | Minimal slice to re-run |
|---|---|
| **Whole-topic change** (different subject, fundamentally different book) | Re-run **`autodidact`** from scratch: `/ed autodidact "{new topic}"`. |
| **New grounding** — different OCW course / different primary textbook to teach from | Re-run **`explore`** (re-ground sources) → **`plan-syllabus`** → then the **affected** `plan-module` + `create-lesson` for modules whose sources changed. Do NOT touch unaffected modules. |
| **Syllabus / module-ordering / scope change** | Re-run **`plan-syllabus`**, then the affected `plan-module` (+ downstream lessons/quiz/project only for modules that actually changed). |
| **Module outline / coverage change** (one module) | Re-run **`plan-module {COURSE} {MODULE}`**, then re-author that module's lessons/quiz/project as needed. |
| **Single lesson / section tweak** | Regenerate **just that lesson** via the `ed-lesson-author` agent (or `/ed create-lesson {COURSE} {MODULE} {lesson}`). Nothing else. |
| **Quiz change** (one module) | Re-run **`/ed create-quiz {COURSE} {MODULE}`** only. |
| **Project change** (one module) | Re-run **`/ed create-project {COURSE} {MODULE}`** only. |

Rules:

- Pick the **narrowest** row that fully covers the request. When unsure between two adjacent scopes, prefer the smaller and widen only if the smaller can't satisfy the request.
- Pass `--yes` through when `AUTO_YES` is set. Apply the relevant gate from `references/quality-gates.md` to each re-run stage; on failure, behave like the invoked verb (STOP without `--yes`; log to `state.md` and continue with `--yes`).
- Update `STATE_FILE` rows for every stage you re-run (status + score + timestamp + note "re-run via update: {reason}").

## Step 3: Report exactly what was re-run

```
✅ Update applied — {COURSE}

  Annotations:  {N} minor, {M} major consumed
                {file}:{line} — {summary}  …

  Re-ran:       {none | the exact stages, e.g. "plan-module 03-attention → create-lesson 03-attention (2 lessons) → create-quiz 03-attention"}
  Reason:       {why this was the minimal correct slice}
  Gates:        {stage}: {score}  …

Preview:        npx diffbook dev        (in {BOOK_DIR})
```

If nothing was found to do:

```
No annotations and no change request. Add <!-- > … --> / <!-- >> … --> to any ed artifact or book page, or tell me what to change, then run /ed update {COURSE}.
```
