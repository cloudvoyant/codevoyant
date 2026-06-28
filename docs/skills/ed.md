# ed

Educational learning skill for ML graduate students — create study notes, pedagogical guides, learning plans, and quizzes using LLMs as a learning tool.

## Workflows

### new notes -- create Feynman-style study notes

Generate graduate-level notes from lecture slides + deep web research. Notes use Feynman-style explanations, mermaid diagrams, ASCII diagrams, worked examples, sample Q&A, and clickable references.

```bash
/ed new notes "attention mechanisms" --resources slides/week3.pdf papers/vaswani.pdf
/ed new notes "backpropagation" --resources slides/lec2.pdf --level undergrad
```

Missing resources are a hard blocker — the skill will stop and ask you to provide them.

Output: `notes/{slug}/notes.md`

### new guide -- create a pedagogical assignment guide

Break a project or assignment into pedagogical phases with hint-controlled disclosure. Never provides complete solutions — only learning objectives, hints, and approach sketches.

```bash
/ed new guide "implement a transformer from scratch" --vim
```

Flags: `--vim` appends editor keyboard hints to each step.

Output: `guides/{slug}/guide.md`

### new plan -- create a week-by-week learning plan

Generate a structured study schedule at graduate level. Follows a syllabus if provided; otherwise finds resources via deep research.

```bash
/ed new plan "deep learning fundamentals" --weeks 10
/ed new plan "Stanford CS231n" --syllabus syllabus.pdf
```

Output: `plans/{slug}/plan.md`

### update -- apply annotations

Scan ed artifacts for `>` (minor) and `>>` (major) annotations added inline, and apply them in-place.

```bash
/ed update notes/attention-mechanisms/notes.md
/ed update    # scan all ed artifacts in cwd
```

### assist -- interactive guided walkthrough

Step-by-step walkthrough of a guide. AskUserQuestion controls how much of each hint is revealed. Supports `--vim` for keyboard hints.

```bash
/ed assist guides/transformer/guide.md --vim
```

At each step, choose: Got it / Hint / Full approach / Skip / End session.

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

plans/{slug}/
  plan.md              # week-by-week learning plan

quizzes/{slug}/
  quiz.md              # questions only
  answers.md           # answers only (keep closed during study!)
```

## Annotation Format

Add `>` or `>>` anywhere in an ed artifact to annotate it for later refinement:

```markdown
## Attention Mechanism

> clarify the softmax temperature here
>> add a worked example showing the full attention computation for a 3-token sequence
```

Then run `/ed update` to consume the annotations and apply them.
