# new-guide — create a pedagogical assignment/project guide

## Variables

- `TOPIC` — first non-flag arg (required; ask if empty)
- `SLUG` — kebab-case of TOPIC
- `ART_ROOT` — `.codevoyant` by default; override via `--dir <path>` (see `references/artifact-dir.md`)
- `GUIDE_DIR` — `{ART_ROOT}/guides/{SLUG}/`
- `GUIDE_FILE` — `{ART_ROOT}/guides/{SLUG}/guide.md`
- `VIM_MODE` — true if `--vim` present
- `SYLLABUS` — file path from `--syllabus` (optional; triggers per-entry fan-out)
- `RESOURCES` — optional `--resources` files describing the assignment

## Step 0: Parse args

Parse TOPIC, RESOURCES, VIM_MODE, SYLLABUS from REMAINING_ARGS.

If TOPIC is empty, ask:
```
question: "What assignment or project is this guide for?"
header: "Guide topic"
options:
  - label: "Describe the assignment"
    description: "e.g. 'implement a VAE from scratch', 'assignment 2 — image segmentation'"
```
Use free-text (Other) response.

## Step 0.5: Syllabus fan-out (one guide per module)

Trigger this fan-out when **either**:
- `--syllabus <file>` is provided, **or**
- the learner's request references building guides from a syllabus/course outline (e.g. "make a guide for each module of this syllabus", or they point at a `syllabus.md` produced by `/ed new syllabus`). If the file path is implied but not given, resolve it (look under `{ART_ROOT}/syllabus/`) or ask once for the path.

When triggered: read the syllabus and parse each entry (`### Module N: {Title}`, or `### Week N:` for older syllabi). For **each** entry, run Steps 1–4 independently, writing a **separate** guide to `{ART_ROOT}/guides/{entry_slug}/guide.md` — one guide per module. Never combine entries into a single guide. If the syllabus lists per-entry resources, pass them into Step 1 as that entry's references. After all entries, report the full list of guides written, then stop.

## Step 1: Understand the assignment and mine references

If RESOURCES provided, read each file **in full** and mine it — do not just skim for the prompt. Extract:
- What is being asked (problem statement)
- Any constraints (languages, libraries, time limits)
- Evaluation criteria if present
- **Worked examples, sample inputs/outputs, and figures** — reuse these to shape concrete hints and self-checks
- **Pedagogical detail** — definitions, analogies, notation, and the order the source introduces ideas; mirror that scaffolding so the guide's phases build the same way
- **Citable links** — capture any URLs/references in the material to surface as clickable links in the guide

If no RESOURCES, ask for a brief description of the assignment objectives.

## Step 2: Plan pedagogical phases

Determine 3–6 phases that break the work into learnable chunks. Each phase should:
- Have a clear learning objective (what skill/concept is exercised)
- Build on the previous phase
- Be completable in one sitting (1–3 hours)

Example for "implement a transformer":
- Phase 1: Understand the architecture and math (no code)
- Phase 2: Implement multi-head attention
- Phase 3: Implement positional encoding + feed-forward layers
- Phase 4: Assemble the full encoder block
- Phase 5: Training loop + evaluation

## Step 3: Write guide file

**Apply `references/pedagogy.md` throughout** — Feynman explanations, progressive disclosure (phases and hints reveal complexity in layers), at least one ASCII or mermaid diagram per phase where the concept is spatial/structural/flow, and clickable external links for further reading. Add a `### Diagram` block to any phase whose concept benefits from a picture.

Create `GUIDE_DIR` and write `GUIDE_FILE`:

```markdown
# Guide: {TOPIC}

> *This guide provides hints and pedagogical breakdowns — not complete solutions. Work through each phase yourself; use `/ed assist` for interactive hint disclosure.*

## Prerequisites

{What the student should know before starting. Reference specific concepts or prior lectures.}

## Phase {N}: {Phase Name}

### Learning Objective

{What skill or concept this phase develops. One sentence.}

### Background

{2–3 sentences of context or theory the student needs. Reference their notes or course materials. No solutions.}

### Diagram

{Optional — a mermaid or ASCII diagram when the concept is spatial/structural/flow (see `references/pedagogy.md`). Omit this heading if the phase has nothing worth drawing.}

### Steps

1. **{Step title}**

   {What to accomplish. Frame as a question or goal, not instructions. E.g. "How does the attention mechanism compute its weights?" not "Multiply Q and K and divide by sqrt(d_k)."}

   <details>
   <summary>Hint</summary>

   {One hint that points toward the approach without giving it away. E.g. "Think about what 'similarity' means between two vectors — what operation measures that?"}

   </details>

   {IF VIM_MODE:}
   <details>
   <summary>Vim hints — navigation & selection first</summary>

   Drill motions, not one-off keys (see `/vim "navigation"`). **Navigate:** `w b e` word · `f<c>`/`t<c>` to char · `{ }` paragraph · `%` bracket · `gg G` ends · `/pat` `n` search · `gd` def · `Ctrl-o` jump back — prefer a motion over holding `hjkl`. **Select by structure:** `viw` word · `vi{` inside braces · `vap` paragraph · `vit` inside tag. **Then operate:** `c`/`d`/`y` + the motion/object you just used (`ciw`, `di{`, `yap`), `.` to repeat. The point is to move and select well, not memorize task-specific keys.

   </details>

2. **{Next step}**
   ...

### Self-check

Before moving to the next phase, verify:
- [ ] {Concrete observable check — e.g. "Your attention weights sum to 1 across the sequence dimension"}
- [ ] {Another check}
```

Repeat for all phases.

## Step 4: Write file

```bash
mkdir -p {ART_ROOT}/guides/{SLUG}
```

Write guide to `GUIDE_FILE`.

Report:
```
✅ Guide ready: {GUIDE_FILE}

  Phases: {N} phases covering {TOPIC}
  {N} steps total | Hints available via /ed assist

To walk through interactively:
  /ed assist {GUIDE_FILE} {--vim if VIM_MODE}

To annotate: add <!-- > ... --> or <!-- >> ... --> comments, then run /ed update {GUIDE_FILE}
```
