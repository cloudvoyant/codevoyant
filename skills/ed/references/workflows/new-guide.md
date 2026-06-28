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

## Step 0.5: Syllabus fan-out (if --syllabus given)

If `--syllabus <file>` is provided: parse each entry and run Steps 1–4 independently per entry, writing a **separate** guide to `{ART_ROOT}/guides/{entry_slug}/guide.md`. Never combine entries. Report all files written, then stop.

## Step 1: Understand the assignment

If RESOURCES provided, read each file. Extract:
- What is being asked (problem statement)
- Any constraints (languages, libraries, time limits)
- Evaluation criteria if present

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

### Steps

1. **{Step title}**

   {What to accomplish. Frame as a question or goal, not instructions. E.g. "How does the attention mechanism compute its weights?" not "Multiply Q and K and divide by sqrt(d_k)."}

   <details>
   <summary>Hint</summary>

   {One hint that points toward the approach without giving it away. E.g. "Think about what 'similarity' means between two vectors — what operation measures that?"}

   </details>

   {IF VIM_MODE:}
   <details>
   <summary>Vim hints</summary>

   Terse, context-relevant keys (see /vim "navigation"): e.g. reading code → `gd` def · `Ctrl-o` jump back · `/pat` search · `n` next. Editing → `ciw` change word · `dd` del line · `>i{` indent block · `u` undo · `.` repeat.

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

To annotate: add > or >> comments, then run /ed update {GUIDE_FILE}
```
