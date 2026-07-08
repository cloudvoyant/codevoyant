# Pedagogy reference — how ed writes teaching material

Every note, guide, and lecture ed produces must teach *well*, not just correctly. Apply all of the following. `new-notes` and `new-guide` both cite this file.

## 1. Feynman technique

- Explain each concept as if teaching a smart person who has never seen it. Plain English first, jargon second.
- Never introduce a term without a one-sentence plain-English gloss before it.
- Lead with a concrete analogy or scenario, then the formal definition — not the other way round.
- If you can't explain it simply, you don't understand it well enough yet: simplify until you can.

## 2. Progressive disclosure

- Build from simple to complex. Each idea rests only on ideas already introduced — never forward-reference.
- Reveal complexity in layers: intuition → minimal formalism → full detail → edge cases.
- In guides, keep solutions hidden behind `<details>`/hints so the learner discovers the answer; disclose one layer at a time.
- Start each section with the smallest complete version of the idea, then extend it.

## 3. Visual aids — use diagrams whenever possible

Prefer a diagram over a paragraph whenever a concept has spatial, structural, sequential, or flow character. Aim for **at least one diagram per major concept**.

- **mermaid** — for flows, architectures, pipelines, decision trees, state machines, sequences:
  ```mermaid
  flowchart LR
    A[Input] --> B[Transform] --> C[Output]
  ```
- **ASCII** — for matrix/tensor shapes, memory/data layout, alignment, or anything grid-like:
  ```
  x:  [batch, seq, dim]
        │     │    └── feature dimension
        │     └─────── sequence position
        └───────────── batch index
  ```

## 4. Clickable external links

- Cite sources and further reading as clickable Markdown links: `[Title](https://…)`.
- Prefer primary sources: papers (arXiv/ACL/NeurIPS/ICML/ICLR), textbook chapters, canonical course notes (CS231n, CS224n, MIT 6.S191).
- When giving terminal instructions (e.g. in `assist`), surface the most relevant link inline so the learner can click through.

## 5. Reinforce understanding

- End each concept with a check: a question, a "predict the output", or a "why does this work?" prompt.
- Prefer worked examples that show every intermediate step over stating a result.
