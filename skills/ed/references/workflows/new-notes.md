# new-notes — create Feynman-style study notes

## Variables

- `TOPIC` — first non-flag arg (required; ask if empty)
- `RESOURCES` — space-separated list of file paths from `--resources` flag (may be empty)
- `LEVEL` — value of `--level` flag; defaults to `grad`
- `SLUG` — kebab-case version of TOPIC (lowercase, hyphens for spaces, alphanum+hyphens only)
- `ART_ROOT` — `.codevoyant` by default; override via `--dir <path>` (see `references/artifact-dir.md`)
- `SYLLABUS` — file path from `--syllabus` (optional; triggers per-entry fan-out)
- `NOTES_DIR` — `{ART_ROOT}/notes/{SLUG}/`
- `NOTES_FILE` — `{ART_ROOT}/notes/{SLUG}/notes.md`

## Step 0: Parse args

Parse TOPIC, RESOURCES (all args after `--resources` until the next flag or end), LEVEL from REMAINING_ARGS.

If TOPIC is empty, ask:
```
question: "What topic are these notes for?"
header: "Topic"
options:
  - label: "Type the topic name"
    description: "e.g. 'attention mechanisms', 'backpropagation', 'variational autoencoders'"
```
Use free-text (Other) response.

## Step 0.5: Syllabus fan-out (if --syllabus given)

If `--syllabus <file>` is provided:
1. Read the syllabus file. Parse each entry (`### Week N: {Topic}` or equivalent) into `{ entry_slug, entry_topic, entry_resources }`.
2. For **each** entry, run the full notes pipeline (Steps 1–6) independently, writing a **separate** artifact to `{ART_ROOT}/notes/{entry_slug}/notes.md`. Never combine entries into one file.
3. After all entries, report a summary list of every file written, then stop.

Do not proceed to the single-topic path below when `--syllabus` is set.

## Step 1: Validate resources — HARD BLOCKER

For each file path in RESOURCES:
- Attempt to Read the file
- If any file does not exist or cannot be read: STOP immediately

When any resource is missing, report:
```
⛔ Missing resources — cannot proceed:

  ✗ {path}  ← file not found

Please provide the missing file(s) and re-run:
  /ed new notes "{TOPIC}" --resources {all-paths-including-fixed}
```

Do NOT continue until all resources are confirmed readable.

If RESOURCES is empty: warn the user that notes will be based on deep research only (no lecture materials), and confirm:
```
question: "No --resources provided. Proceed with deep research only?"
header: "Resources"
options:
  - label: "Yes — research only"
    description: "Generate notes from web research without lecture materials"
  - label: "No — I'll add resources"
    description: "Re-run with --resources <files...>"
```
If user chooses "No", stop.

## Step 2: Read all resource files

For each valid file in RESOURCES, read its full content. Concatenate into `SOURCE_CONTENT`.

## Step 3: Deep research

Launch an Agent (using the `deep-research` skill or inline agent) to find 3–5 authoritative external sources for TOPIC:

```
You are a research assistant helping a graduate ML student study "{TOPIC}".

Find 3–5 authoritative sources:
- Prefer: original papers (arXiv/ACL/NeurIPS/ICML/ICLR), textbook chapters (deep learning book, PRML, ESL), well-regarded lecture notes (Stanford CS231n, MIT 6.S191, etc.)
- Avoid: blog posts, unofficial tutorials, Wikipedia as primary source

For each source, return:
- title
- URL (clickable)
- 2–3 sentence summary of what it contributes to understanding {TOPIC}
- key equations or concepts it covers
```

Store result as `RESEARCH_SOURCES`.

## Step 4: Synthesize notes

Write `NOTES_FILE` with the following structure. Level defaults to graduate (`LEVEL=grad`).

```markdown
# {TOPIC}

> *Level: Graduate | Generated: {date}*

## Overview

{3–5 sentence plain-English overview. Lead with an analogy or concrete scenario. Then state the formal problem.}

## Core Concepts

{For each major concept:}

### {Concept Name}

**Intuition (Feynman style):** {Explain as if teaching a smart undergraduate who has never seen this. Use a concrete analogy.}

**Formal definition:**
{Mathematical definition, equations in LaTeX code blocks}

{Insert mermaid or ASCII diagram here if the concept has spatial, structural, or flow components}

## Key Diagrams

{At minimum: one mermaid diagram for the overall architecture/flow, one ASCII diagram for tensor shapes or data layout if applicable}

```mermaid
{diagram}
```

```
{ascii diagram}
```

## Worked Examples

### Example {N}: {Title}

{Step-by-step worked example. Show the calculation / derivation in full.}

## Sample Questions & Answers

### Q1: {Question testing conceptual understanding}

**A:** {Full answer, graduate level}

### Q2: {Question testing ability to apply}

**A:** {Full answer}

### Q3: {Question testing deeper insight or connection}

**A:** {Full answer}

## References

{For each source in RESEARCH_SOURCES and each resource file provided:}
- [{title}]({url}) — {one-line description}
```

Apply Feynman style rules:
- Never use jargon without a plain-English sentence first
- Prefer concrete analogies before abstract definitions
- Every spatial/structural concept gets a diagram

Apply diagram rules:
- `mermaid` for flows, architectures, decision trees
- ASCII for matrix/tensor shapes, visual intuitions
- At least one diagram per major concept

## Step 5: Create output directory and write file

```bash
mkdir -p {ART_ROOT}/notes/{SLUG}
```

Write synthesized notes to `NOTES_FILE`.

Report: `✓ Notes written to {NOTES_FILE}`

## Step 6: Post-creation validation

Re-read `NOTES_FILE` and check:
- [ ] Contains `## Overview` section
- [ ] Contains `## Core Concepts` section with at least one subsection
- [ ] Contains at least one mermaid diagram (` ```mermaid `)
- [ ] Contains `## Sample Questions & Answers` section with at least 3 questions
- [ ] Contains `## References` section with at least one clickable link `[title](url)`
- [ ] No section is empty (no `<!-- TODO -->` stubs)

If any check fails: fix the missing content inline and re-validate. Do not report success until all checks pass.

Report:
```
✅ Notes ready: {NOTES_FILE}

  Sections: Overview · Core Concepts ({N} concepts) · Diagrams · Worked Examples · Q&A ({N} questions) · References ({N} sources)

To annotate: add > or >> comments inline, then run /ed update {NOTES_FILE}
To quiz yourself: /ed quiz "{TOPIC}" --source {NOTES_FILE}
```
