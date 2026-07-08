# ed

Educational learning skill for ML graduate students — create study notes, pedagogical guides, module-based syllabi, and quizzes using LLMs as a learning tool.

## Workflows

### new notes -- create Feynman-style study notes

Generate graduate-level notes from lecture slides + deep web research. Notes use Feynman-style explanations, progressive disclosure, mermaid and ASCII diagrams, worked examples, sample Q&A, and clickable references. Provided resources are mined for examples and pedagogical detail, not just skimmed.

```bash
/ed new notes "attention mechanisms" --resources slides/lec3.pdf papers/vaswani.pdf
/ed new notes "backpropagation" --resources slides/lec2.pdf --level undergrad
/ed new notes "CS231n" --syllabus syllabus/cs231n/syllabus.md   # one note per module
```

Missing resources are a hard blocker — the skill will stop and ask you to provide them. Point at a syllabus to fan out one note per module (never combined).

Output: `notes/{slug}/notes.md`

### new guide -- create a pedagogical assignment guide

Break a project or assignment into pedagogical phases with hint-controlled disclosure. Applies the shared pedagogy guide (Feynman explanations, progressive disclosure, an ASCII/mermaid diagram per phase where it helps, clickable references). Never provides complete solutions — only learning objectives, hints, and approach sketches. Any `--resources` you pass are mined for examples and pedagogical detail.

```bash
/ed new guide "implement a transformer from scratch" --vim
/ed new guide "CS231n" --syllabus syllabus/cs231n/syllabus.md   # one guide per module
```

Flags:
- `--vim` adds **navigation & selection** drills (motions and text objects — how to move and select, not just task-local keys).
- `--syllabus <file>` fans out one guide per module (also triggers on a plain-language "a guide for each module" request).
- `--resources <files>` are mined for examples and pedagogy.

Output: `guides/{slug}/guide.md`

### new syllabus -- create a module-based learning syllabus

Generate a self-paced study syllabus at graduate level, organized into **modules** (units of study, not calendar weeks). Follows a source syllabus if provided; otherwise finds resources via deep research.

```bash
/ed new syllabus "deep learning fundamentals" --modules 8
/ed new syllabus "Stanford CS231n" --syllabus syllabus.pdf
```

Output: `syllabus/{slug}/syllabus.md`

### update -- apply annotations

Scan ed artifacts for `<!-- > -->` (minor) and `<!-- >> -->` (major) annotations added inline, and apply them in-place.

```bash
/ed update notes/attention-mechanisms/notes.md
/ed update    # scan all ed artifacts in cwd
```

### assist -- interactive guided walkthrough

Free-flowing, step-by-step walkthrough of a guide. It shows the next step, then you reply in plain language with trigger words — no multiple-choice prompts. Starts autonomously (picks the most recent guide if you don't name one), and stays responsive by defaulting to a fast model, escalating only for questions the guide doesn't answer. `--vim` adds navigation/selection hints.

```bash
/ed assist                              # autonomously starts the most recent guide
/ed assist guides/transformer/guide.md --vim
```

Trigger words: `hint` · `answer` · `check <your attempt>` · `next` · `skip` · `exit` — or just ask a question.

### quiz -- generate or administer a quiz

Create a quiz from notes or slides. Answers go in a separate file.

```bash
/ed quiz "attention mechanisms" --source notes/attention-mechanisms/notes.md --questions 15
/ed quiz --interactive quizzes/attention-mechanisms/quiz.md
```

Output:
- `quizzes/{slug}/quiz.md` — questions only
- `quizzes/{slug}/answers.md` — answers only

## Output Directory Structure

```
notes/{slug}/
  notes.md             # Feynman-style notes + diagrams + Q&A

guides/{slug}/
  guide.md             # pedagogical guide with hint blocks

syllabus/{slug}/
  syllabus.md          # module-based learning syllabus

quizzes/{slug}/
  quiz.md              # questions only
  answers.md           # answers only (keep closed during study!)
```

## Annotation Format

Add an HTML-comment annotation anywhere in an ed artifact to mark it for later refinement — `<!-- > ... -->` for minor fixes, `<!-- >> ... -->` for major additions:

```markdown
## Attention Mechanism

<!-- > clarify the softmax temperature here -->
<!-- >> add a worked example showing the full attention computation for a 3-token sequence -->
```

Then run `/ed update` to consume the annotations and apply them.
