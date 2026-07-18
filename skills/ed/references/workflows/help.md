# help

Print the ed command reference.

## Variables

- `TOPIC` — optional; if provided, show detailed help for that subcommand (future use)

## Step 1: Print Reference

Print the following text exactly as written. Do not reformat, create tables, add headers, or add commentary.

ed — Build graduate-level, literature-grounded interactive textbooks as diffbook MDX

  Pipeline (run in order, or one-shot with autodidact):

  /ed explore  <course>                 [--dir <path>]
      Find & vet reference materials (open textbooks, MIT/other OCW, arXiv/papers,
      GitHub repos, YouTube lecture series, reputable blogs). Verify every URL. Annotate.
      → .codevoyant/ed/<course>/explore/sources.md
      e.g.  /ed explore "transformer architectures"

  /ed plan-syllabus  <course>           [--dir <path>] [--yes]      (alias: /ed syllabus)
      From brief + sources, produce a dependency-ordered module program: goal, expected
      outcome, Bloom-tagged objectives, concept coverage, primary text sources, mini-project.
      Scored gate ≥85. → .codevoyant/ed/<course>/syllabus.md
      e.g.  /ed plan-syllabus transformer-architectures

  /ed plan-module  <course> <module>    [--dir <path>] [--yes]      (alias: /ed module)
      Read the identified sources for one module and craft a lesson-level outline: lessons,
      per-lesson sections + learning goals, example Q&As, quiz plan, visualization specs.
      Scored gate ≥80. → .codevoyant/ed/<course>/modules/<NN-slug>/plan.md
      e.g.  /ed plan-module transformer-architectures 02

  /ed create-lesson  <course> <module> [lesson]   [--book <path>] [--dir <path>]   (alias: /ed lesson)
      Author the actual lesson .mdx into the diffbook book, Feynman-style at graduate level,
      define-before-display, interactive components, heavy verified references.
      → <book>/docs/<NN-module-slug>/<MM-lesson-slug>.mdx
      e.g.  /ed create-lesson transformer-architectures 02 01

  /ed create-quiz  <course> <module>    [--book <path>] [--dir <path>]             (alias: /ed quiz)
      Author a graduate module quiz .mdx with diffbook Quiz components, Bloom-distributed,
      quality distractors. → <book>/docs/<NN-module-slug>/quiz.mdx
      e.g.  /ed create-quiz transformer-architectures 02

  /ed create-project  <course> <module> [--book <path>] [--dir <path>]            (alias: /ed project)
      Author a graduate project + solution guide grounded in a real sourced assignment
      (OCW problem set, repo task). → <book>/docs/<NN-module-slug>/project.mdx
      e.g.  /ed create-project transformer-architectures 02

  /ed autodidact  <topic>               [--book <path>] [--dir <path>] [--yes]
      One-shot: brief → explore → plan-syllabus → (per module) plan-module → create-lesson
      → create-quiz → create-project. Scaffolds the book via /diffbook init. Scored gate
      between stages; writes a pipeline ledger to state.md. → whole book + all plan artifacts
      e.g.  /ed autodidact "reinforcement learning" --yes

  /ed update  <course> [target]         [--book <path>] [--dir <path>]
      Smart re-application. Locate where the change belongs and re-run the minimal slice:
      topic change → regenerate; new OCW/textbook → re-ground explore + affected modules;
      single-lesson tweak → regenerate that lesson. Also consumes inline
      <!-- > --> (minor) / <!-- >> --> (major) annotations from any ed artifact.
      e.g.  /ed update transformer-architectures 02/01

  /ed help
      Show this reference

  Global flags:
      --book <path>   diffbook book root (default: book/)
      --dir  <path>   plan-artifact root (default: .codevoyant)
      --yes           skip gate pauses; log warnings and continue (used by autodidact)

  Artifact layout:
      Plan artifacts (drafts, source of truth):
        .codevoyant/ed/<course>/brief.md, state.md, syllabus.md
        .codevoyant/ed/<course>/explore/sources.md, explore/modules/<NN-slug>.md
        .codevoyant/ed/<course>/modules/<NN-slug>/plan.md
      Published MDX (the diffbook book, default book/):
        <book>/docs/index.md                        course landing page
        <book>/docs/<NN-module-slug>/index.mdx      module overview (order:0)
        <book>/docs/<NN-module-slug>/<MM-lesson>.mdx  lesson pages (order:MM)
        <book>/docs/<NN-module-slug>/quiz.mdx        module quiz
        <book>/docs/<NN-module-slug>/project.mdx     module project + solution guide
        <book>/docs/<NN-module-slug>/references.md   module annotated references
      NN / MM = two-digit zero-padded order (01-, 02-) reflecting syllabus / lesson order.
      Slugs are kebab-case (lowercase, spaces→hyphens, alphanumeric+hyphens, ≤50 chars).
      List courses with: ls .codevoyant/ed/

  Annotations (for /ed update):
      <!-- > minor note -->    a small tweak — clarify, fix, adjust
      <!-- >> major note -->   a structural change — re-ground, re-plan, regenerate
      update scans <!-- >> before <!-- >.

  Recommended pipeline order:
      explore → plan-syllabus → plan-module → create-lesson → create-quiz → create-project
      (or one-shot: /ed autodidact "<topic>")
