# ed

Educational skill that builds literature-grounded, graduate-level interactive textbooks as diffbook MDX. Point it at a course topic and it vets real reference materials (open textbooks, MIT/other OCW, arXiv papers, GitHub repos, lecture playlists), plans a dependency-ordered syllabus, and authors Feynman-style lessons, quizzes, and projects into a diffbook project — every concept scaffolded define-before-display, Bloom-tagged, and backed by verified references.

## Workflows

### explore — vet reference materials

Find and verify the source materials a course will be built from: open/available textbooks, MIT OpenCourseWare and other university course sites, arXiv/ACL/NeurIPS papers, GitHub reference implementations and problem sets, named YouTube lecture series, and reputable blogs and course notes. Every online URL is checked with WebFetch before inclusion (dead links are dropped or replaced), and every entry carries a 20–40 word annotation stating what it covers and why it is relevant. The result is a course-wide catalog that guarantees at least one primary text source per prospective module.

```bash
/ed explore "transformer language models"
```

Output: `.codevoyant/ed/{course}/explore/sources.md`

### plan-syllabus — dependency-ordered module program

Turn the brief and vetted sources into a dependency-ordered program of modules. Each module gets a goal, an expected outcome, Bloom-tagged learning objectives, concept coverage, its primary text sources, and a mini-project idea. A scored gate (≥85) enforces Bloom coverage across the program, strict dependency ordering, at least one text source per module, and a "smell test" that confirms the zero-prerequisite modules are genuinely introductory.

```bash
/ed plan-syllabus transformer-language-models
```

Output: `.codevoyant/ed/{course}/syllabus.md`

### plan-module — lesson-level outline for one module

Read the actual identified text sources for a single module and craft its lesson-level outline: the lessons, per-lesson sections with learning goals, example Q&As, a quiz plan, and visualization specs (which manim, mermaid, chart, YouTube, or bookmark elements to build). It also writes a per-module source shortlist that the lesson author will read from. A scored gate (≥80) requires every lesson section to be grounded in a cited source and every quiz and visualization spec to be present.

```bash
/ed plan-module transformer-language-models 03
```

Output: `.codevoyant/ed/{course}/modules/{NN-slug}/plan.md`

### create-lesson — author a lesson page

Author an actual lesson as diffbook `.mdx`, Feynman-style at graduate level, from the module plan and its source shortlist. Uses diffbook MDX components extensively (Notice, QA, Figure, Bookmark, YouTube, Chart, Manim, mermaid) and carries heavy, verified references. The dedicated `ed-lesson-author` agent self-checks the page against the lesson gate: define-before-display holds top to bottom, every major concept has at least one interactive element, the rhythm rule holds, and the page ends with a check.

```bash
/ed create-lesson transformer-language-models 03
/ed create-lesson transformer-language-models 03 02
```

Output: `{BOOK_DIR}/docs/{NN-module-slug}/{lesson}.mdx`

### create-quiz — author a module quiz

Author a graduate module quiz as `.mdx` using diffbook Quiz and question components (SingleChoiceQuestion, MultipleChoiceQuestion, NumericQuestion). Questions are Bloom-distributed to the module's position, with plausible same-length distractors that target real misconceptions, ~25% A/B/C/D balance, no all/none-of-the-above, and 50–100-word explanations.

```bash
/ed create-quiz transformer-language-models 03
```

Output: `{BOOK_DIR}/docs/{NN-module-slug}/quiz.mdx`

### create-project — author a project + solution guide

Author a graduate project and its solution guide as `.mdx`, grounded in real sourced assignments such as OCW problem sets and reference-repo tasks. The project reaches the "Create" level of Bloom's taxonomy and its solution guide is scaffolded rather than dumped, so learners are led to the answer.

```bash
/ed create-project transformer-language-models 03
```

Output: `{BOOK_DIR}/docs/{NN-module-slug}/project.mdx`

### autodidact — one-shot the whole book

Chain the entire pipeline for a topic: brief → explore → plan-syllabus → per-module plan-module → create-lesson → create-quiz → create-project. It scaffolds the diffbook project via `/diffbook init`, runs a scored gate between stages, and writes a pipeline ledger to `state.md`. Run non-interactively with `--yes`: a failing stage auto-fixes once, then logs a warning and continues best-effort rather than stopping.

```bash
/ed autodidact "transformer language models"
/ed autodidact "transformer language models" --yes
```

Output: whole diffbook book + all plan artifacts under `.codevoyant/ed/{course}/`

### update — smart re-application

Locate where a change belongs in the pipeline and re-run the minimal slice: a topic change regenerates, a new OCW course or textbook re-grounds explore and the affected modules, and a single-lesson tweak regenerates just that lesson. It also consumes inline `<!-- > -->` (minor) and `<!-- >> -->` (major) annotations you leave in any ed artifact.

```bash
/ed update transformer-language-models
/ed update transformer-language-models 03
```

Output: varies with the located change

## Pipeline

The recommended order builds a course incrementally, pausing at each scored gate:

```bash
/ed explore "transformer language models"
/ed plan-syllabus transformer-language-models
/ed plan-module transformer-language-models 03
/ed create-lesson transformer-language-models 03
/ed create-quiz transformer-language-models 03
/ed create-project transformer-language-models 03
```

Or one-shot the entire book:

```bash
/ed autodidact "transformer language models"
```

Bare verb aliases are accepted for ergonomics: `syllabus` → `plan-syllabus`, `module` → `plan-module`, `lesson` → `create-lesson`, `quiz` → `create-quiz`, `project` → `create-project`.

## Output Layout

Planning artifacts (the working source of truth) live under `.codevoyant/ed/{course}/`. Published MDX lives in the diffbook project (default `book/`, overridable with `--book`).

```
.codevoyant/ed/{course}/
  brief.md                       # structured intent (template-filled)
  state.md                       # autodidact pipeline ledger + gate scores
  explore/
    sources.md                   # course-wide vetted source catalog
    modules/{NN-slug}.md         # per-module source shortlist
  syllabus.md                    # dependency-ordered module program
  modules/{NN-slug}/
    plan.md                      # lesson-level outline for the module

{BOOK_DIR}/                      # diffbook project, scaffolded via /diffbook init
  astro.config.mjs
  docs/
    index.md                     # course landing page (derived from syllabus)
    {NN-module-slug}/            # module = diffbook chapter (folder)
      index.mdx                  # module overview (goal, outcomes, lesson map)
      {MM-lesson-slug}.mdx       # lesson pages
      quiz.mdx                   # module quiz
      project.mdx                # module project + solution guide
      references.md              # module annotated references
```

Courses and slugs are kebab-case (≤50 chars). Module and lesson prefixes (`NN`, `MM`) are two-digit zero-padded and reflect syllabus order. All `.md`/`.mdx` prose is soft-wrapped (one line per paragraph).

## Grounding & Pedagogy

- **Verified, annotated references.** Every online URL is confirmed reachable with WebFetch before it is cited; textbooks are cited by title/author/publisher/edition rather than fragile URLs; each source carries a 20–40 word annotation of what it covers and why it matters.
- **Bloom's taxonomy.** The revised six levels (Remember/Understand/Apply/Analyze/Evaluate/Create) drive objectives, per-lesson goals, quiz question mixes, and project depth, with target distributions that shift from introductory to advanced as modules progress.
- **Define-before-display scaffolding.** Every term is defined in prose before any diagram, table, or code uses it; tables reinforce and never introduce; a signpost sentence precedes each complex element.
- **Graduate-level Feynman explanations.** Progressive disclosure (intuition → minimal formalism → full detail → edge cases), Mayer coherence (no decorative visuals — every visual earns its place and is interactive), a rhythm rule (no more than three pure-prose paragraphs without a non-text element), and LaTeX via `\( \)` / `\[ \]` (never `$…$`).
- **diffbook interactive components.** Lessons are authored as MDX with auto-available components — Notice, QA, Figure, Bookmark, YouTube, Chart, Manim, and the quiz family (SingleChoiceQuestion, MultipleChoiceQuestion, NumericQuestion, Quiz) — plus mermaid fences; authoring runs through the `/diffbook` skill.

This pedagogy is grounded in the "intelligent textbook" patterns pioneered by [Dan McCreary's claude-skills](https://dmccreary.github.io/claude-skills/) — scored quality gates between stages, Bloom-tagged objectives, concept scaffolding, and verified references — retargeted here onto diffbook MDX with added source classes (papers, repos, lecture series).

## Annotation Format

Add an HTML-comment annotation anywhere in an ed artifact to mark it for later refinement — `<!-- > ... -->` for minor fixes, `<!-- >> ... -->` for major additions:

```markdown
## Scaled Dot-Product Attention

<!-- > clarify why the scaling factor is 1/sqrt(d_k) here -->
<!-- >> add a worked example computing attention for a 3-token sequence end to end -->
```

Then run `/ed update` to consume the annotations and apply them in the correct pipeline slice (`update` scans `<!-- >>` before `<!-- >`).
