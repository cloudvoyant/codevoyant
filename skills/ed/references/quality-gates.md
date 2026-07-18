# Quality gates (shared by all ed workflows)

Each pipeline stage **scores its own output 0–100** (or against a checklist) and **refuses to advance a weak artifact**. This mirrors the dmccreary intelligent-textbook discipline: quality is enforced between stages, not hoped for at the end.

## STOP vs auto-fix vs log

Every gate follows the same protocol:

1. Score the artifact against the gate below.
2. If it **passes** the threshold → advance.
3. If it **fails** → **auto-fix once** (address the specific failing criteria), then re-score.
4. If it **still fails**:
   - **Interactive run** (no `--yes`): **STOP**. Report the score, the failing criteria, and what a fix would require. Do not silently proceed.
   - **autodidact `--yes`**: **log** the score, failing criteria, and the auto-fix attempt to `state.md` (Decisions/Warnings), mark the stage `warn`, and **continue best-effort** to the next stage.

Record every gate result (score, pass/warn/fail, timestamp) in `state.md` when running under autodidact.

## Brief-completeness gate (before explore/plan-syllabus)

PASS iff every **required** brief field is present and non-placeholder: `topic`, `level` (default `graduate`), `target_outcomes` (≥3), and at least one of `preferred_sources` or `source_material_paths`. Empty, `TODO`, or template-comment values fail. On fail, interactive runs ask the user to fill the brief; autodidact synthesizes a reasonable brief from the topic and logs the assumptions.

## Syllabus gate (≥85)

Score these criteria (weighted to 100); PASS at **≥85**:

- **Dependency ordering (25)** — modules are strictly ordered; every prerequisite link points to an *earlier* module; no cycles.
- **Text source per module (20)** — every module names ≥1 primary text source drawn from `explore/sources.md` (not invented).
- **Bloom program coverage (20)** — objectives are Bloom-tagged and the distribution shifts correctly across the program (introductory modules skew Remember/Understand; late modules reach Analyze/Evaluate/Create) per `blooms-taxonomy.md`.
- **Outcome clarity (15)** — each module states a concrete, assessable Expected Outcome and ≥3 measurable Learning Objectives.
- **Concept coverage (10)** — concepts collectively span the brief's target outcomes with no major gap or unjustified duplication.
- **Mini-project per module (10)** — each module carries a plausible mini-project idea.

### Foundational smell test (hard STOP)

After ordering, confirm the **zero-prerequisite (foundational) modules are genuinely introductory**. Read each module with no prerequisites: if one reads as advanced (assumes concepts a beginner lacks), the dependency direction is inverted → **STOP** and re-order, regardless of the numeric score.

## Module-plan gate (≥80)

Score (weighted to 100); PASS at **≥80**:

- **Every section grounded in a cited source (35)** — each lesson section names the specific source (from the module shortlist) it is built from; no ungrounded sections.
- **Lesson decomposition (20)** — the module is split into coherent lessons with clear, Bloom-tagged learning goals that build on each other.
- **Quiz plan present (15)** — the plan states which concepts the quiz covers and its Bloom mix.
- **Visualization specs present (20)** — each planned visual names the diffbook component (mermaid / Manim / Chart / YouTube / Bookmark / Figure) and what it shows and why (no decorative visuals).
- **Example Q&As (10)** — each lesson lists ≥1 example self-check Q&A seed.

## Lesson gate (scaffolding checklist — all must hold)

A lesson `.mdx` passes only if **every** item holds top-to-bottom:

- **Define-before-display** — every term is defined in prose *before* any diagram, code block, table, or component uses it; tables/visuals reinforce, never introduce; a signpost sentence precedes each complex element.
- **≥1 interactive element per major concept** — each major concept carries at least one interactive/visual element (`<QA>`, mermaid, `<Manim>`, `<Chart>`, `<YouTube>`, a worked question) that earns its place (Mayer coherence — no decoration).
- **Rhythm rule** — no more than 3 consecutive paragraphs of pure prose without a non-text element, and element types vary (not the same component repeated).
- **≥N verified references** — at least N (default **4**) references, each a real, WebFetch-verified source or a properly-cited textbook (title/author/publisher/edition, no fragile URL); rendered via `<Bookmark>`/links.
- **Ends with a check** — the lesson closes with a reinforcement check (`<QA>` or an end-of-lesson `<Quiz>`).
- **Graduate reading level** — full jargon after first definition, research-literature context, LaTeX in `\( \)` / `\[ \]`, soft-wrapped prose.

## Quiz gate (all must hold)

- **Exactly one defensible answer** per single-choice item (multi-choice: an unambiguous correct set).
- **Distractor quality** — distractors are plausible, roughly same length as the key, and target **real misconceptions**, not filler.
- **Answer-position balance** — correct positions spread ~25% each across A/B/C/D; no positional tell.
- **No All/None-of-the-above** options.
- **Bloom distribution** within **±15%** of the module's target mix (`blooms-taxonomy.md`).
- **Explanations** are 50–100 words and explain *why* the key is right *and* why the top distractor is wrong.
- **Links valid** — every referenced URL is WebFetch-verified.

## Project gate (all must hold)

- **Grounded in a real sourced assignment** — the project traces to a specific OCW problem set, repo task, or paper reproduction cited in the sources (not invented).
- **Create-level objectives** — deliverables require synthesis/creation (Bloom Create), not recall.
- **Staged deliverables** with checkpoints, hints behind `<QA>`/`<details>`, an explicit graded **rubric**, and a collapsible solution guide.

## After any gate

- **Interactive**: print score + pass/fail + the specific failing criteria; STOP on repeated failure.
- **autodidact `--yes`**: append the result to `state.md`; `warn`+continue on repeated failure. Never let a `warn` be silent — it must appear in the Decisions/Warnings log.
