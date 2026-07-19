# autodidact

The full chain. From a single topic, produce a complete graduate-level interactive textbook: brief → explore → plan-syllabus → (per module) plan-module → create-lesson → create-quiz → create-project → course landing page. This workflow **orchestrates** by invoking the other `ed` verbs and the `ed-lesson-author` agent — it does **not** re-implement their logic. Between stages it applies the quality gates and records progress in a state ledger.

## ⛔ HARD STOPS — read before every action

| You are about to… | Correct action |
|---|---|
| Re-implement explore / planning / authoring logic inline | Stop. Invoke the verb (`explore`, `plan-syllabus`, `plan-module`, `create-lesson`, `create-quiz`, `create-project`) / the `ed-lesson-author` agent. This file only sequences and gates. |
| Skip the brief when it's missing (no rich inline topic) | Stop. Scaffold the brief and pause, like `explore`. |
| Continue past a failed gate without `--yes` | Stop. Report where it failed and how to resume. |
| Continue past a failed gate silently *with* `--yes` | Stop. Log the failure to `state.md` first, then continue best-effort. |
| Forget to record a stage in `state.md` | Stop. Every stage writes status + score + timestamp before the next begins. |

**Permitted writes:** the state ledger `$ART_ROOT/ed/{COURSE}/state.md`, plus whatever the invoked verbs write (their own artifacts and book MDX), and the course landing `{BOOK_DIR}/index.md`.

## Variables

Received from dispatcher:

- `TOPIC` — the free-text topic (all non-flag `REMAINING_ARGS`)
- `AUTO_YES` — true if `--yes` present (drives every child verb with `--yes`; gate failures are logged and skipped rather than stopping)
- `BOOK_FLAG` / `DIR_FLAG` — pass through `--book` / `--dir` to child verbs

Resolve `ART_ROOT` and `BOOK_DIR` per `references/artifact-layout.md`.

## Step 0: Parse topic → course slug

1. If `TOPIC` empty → STOP and ask for a topic.
2. Derive `COURSE` = kebab-case slug of the topic (lowercase, spaces→hyphens, alphanumeric+hyphens, ≤50 chars) per `references/artifact-layout.md`.
3. Set `STATE_FILE` = `$ART_ROOT/ed/{COURSE}/state.md`, `BRIEF_FILE` = `$ART_ROOT/ed/{COURSE}/brief.md`.
4. `mkdir -p $ART_ROOT/ed/{COURSE}`.

## Step 1: Brief gate (scaffold + pause, like explore)

The brief anchors depth, audience, and scope for the whole book.

- **If `BRIEF_FILE` exists and is filled in** (required fields non-placeholder per `references/templates/brief-template.md`): read it. Continue.
- **Else if a rich inline topic was given AND `AUTO_YES=true`:** synthesize a brief from the topic into `BRIEF_FILE` (best-effort defaults: graduate audience, standard depth) and continue without pausing.
- **Otherwise** (brief missing and not `--yes` with rich topic): scaffold `BRIEF_FILE` from `references/templates/brief-template.md`, best-effort open it in the editor, and **STOP**:
  ```
  📝 Tell me what to teach — fill in:
     {BRIEF_FILE}
  Then run /ed autodidact "{TOPIC}" again — I'll build the whole book.
  ```

## Step 2: Scaffold the diffbook book (if absent)

If the diffbook project is not yet scaffolded (no `astro.config.mjs` at the project root), scaffold it via the diffbook skill — run `/diffbook init` at the PROJECT ROOT (cwd), NOT inside `BOOK_DIR`:

```
/diffbook init --title "{course title from brief/topic}"   (run at the PROJECT ROOT / cwd; sets contentPath = BOOK_DIR)
```

Confirm `astro.config.mjs` at the project root and the `BOOK_DIR/` content dir exist afterward. If `/diffbook` is unavailable, STOP and tell the user to install the diffbook skill (Phase 0 prerequisite).

## Step 3: Initialize the state ledger

Create/refresh `STATE_FILE` from `references/templates/state-template.md`. It tracks, per stage: **stage name · status (pending/running/pass/warn/fail) · gate score · timestamp · note**. Seed rows for: `explore`, `plan-syllabus`, then (filled in after the syllabus is known) one block per module with `plan-module`, `create-lesson`, `create-quiz`, `create-project`, and finally `course-index`.

Helper used after every stage:

```
record(stage, status, score, note):
  set the stage's row in STATE_FILE → status, score, $(date -u +%FT%TZ), note
```

## Step 4: Run the pipeline in order

Between every stage, apply the relevant gate from `references/quality-gates.md`. On a gate **fail**: `AUTO_YES=true` → `record(..., warn, score, reason)` and continue best-effort; `AUTO_YES=false` → `record(..., fail, score, reason)`, then **STOP** and report where to resume.

Invoke each child verb with the same `--book`/`--dir` and `--yes` (when `AUTO_YES`) flags. Mark a stage `running` before, and `pass`/`warn`/`fail` after.

1. **explore** — `record(explore, running)` → invoke `/ed explore {COURSE}` → gate the source catalog (≥1 verified text source/module surface, annotations present) → `record`.
2. **plan-syllabus** — `record(plan-syllabus, running)` → invoke `/ed plan-syllabus {COURSE}` → **syllabus gate ≥85** + **foundational smell test** (foundational modules genuinely introductory; inverted dependency → fail) → `record`. On pass, read `syllabus.md` to enumerate modules (`NN-slug`, in order) and expand the per-module rows in `STATE_FILE`.
3. **Per module, in syllabus (dependency) order** — for each `MODULE = NN-slug`:
   a. **plan-module** — `record` running → `/ed plan-module {COURSE} {MODULE}` → **module-plan gate ≥80** → `record`.
   b. **create-lesson (all lessons)** — `record` running → `/ed create-lesson {COURSE} {MODULE}` to author **every** lesson in the module. This may **fan out** one `ed-lesson-author` agent per lesson in parallel (the module's lessons are independent given the plan + sources). Apply the **lesson gate** to each authored lesson; aggregate the module's lesson score → `record` (note any lesson that failed its gate).
   c. **create-quiz** — `record` running → `/ed create-quiz {COURSE} {MODULE}` → **quiz gate** → `record`.
   d. **create-project** — `record` running → `/ed create-project {COURSE} {MODULE}` → project must cite a real source (its own hard stop) → `record`.
   Complete each module fully before starting the next (later modules depend on earlier ones).
4. **Course landing page** — write `{BOOK_DIR}/index.md` from `references/templates/course-index-template.md`, derived from `syllabus.md` (course goal, module map with links, prerequisites, how to use the book). `record(course-index, ...)`.

## Step 5: Report (staged progress)

Report the ledger as a staged table plus next steps. With `--yes`, surface every logged gate failure so nothing is silently dropped.

```
📚 autodidact — "{TOPIC}"  →  course: {COURSE}

  Stage                         Status   Score  When
  ─────────────────────────────────────────────────────────
  explore                       ✅ pass    —     {ts}
  plan-syllabus                 ✅ pass    92    {ts}
  01-{slug} plan-module         ✅ pass    88    {ts}
  01-{slug} create-lesson (×N)  ✅ pass    90    {ts}
  01-{slug} create-quiz         ✅ pass    91    {ts}
  01-{slug} create-project      ✅ pass    —     {ts}
  02-{slug} …                   …
  course-index                  ✅ pass    —     {ts}

  {if any failures under --yes:}
  ⚠️ Logged gate failures (best-effort output written):
     • {stage} — {score} — {reason}   (fix via /ed update {COURSE} {target})

Book:      {BOOK_DIR}
Ledger:    {STATE_FILE}

Preview the book:   npx diffbook dev        (run in {BOOK_DIR})
Iterate / fix:      /ed update {COURSE} [target]
```

If the run **STOPped** at a failed gate (no `--yes`), report the failing stage, its score and reason, and:

```
⛔ Stopped at {stage} (score {score}). Fix the input, then resume:
   /ed autodidact "{TOPIC}"        (re-runs from the first incomplete stage per state.md)
   /ed update {COURSE} {target}    (to re-run just the affected slice)
```
