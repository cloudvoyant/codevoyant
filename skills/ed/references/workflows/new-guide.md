# new-guide — create a pedagogical assignment/project guide

## Variables

- `TOPIC` — first non-flag arg (required; ask if empty)
- `SLUG` — kebab-case of TOPIC
- `GUIDE_DIR` — `guides/{SLUG}/`
- `GUIDE_FILE` — `guides/{SLUG}/guide.md`
- `VIM_MODE` — true if `--vim` present
- `HELIX_MODE` — true if `--helix` present
- `RESOURCES` — optional `--resources` files describing the assignment

## Step 0: Parse args

Parse TOPIC, RESOURCES, VIM_MODE, HELIX_MODE from REMAINING_ARGS.

If TOPIC is empty, ask:
```
question: "What assignment or project is this guide for?"
header: "Guide topic"
options:
  - label: "Describe the assignment"
    description: "e.g. 'implement a VAE from scratch', 'assignment 2 — image segmentation'"
```
Use free-text (Other) response.

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

   {Contextually relevant Vim shortcuts for this step. E.g. if reading code: `gd` go to definition, `<C-o>` jump back, `/pattern` search.}

   </details>

   {IF HELIX_MODE:}
   <details>
   <summary>Helix hints</summary>

   {Contextually relevant Helix shortcuts. E.g. `gd` go to definition, `<C-s>` save selection, `space + f` file picker.}

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
mkdir -p guides/{SLUG}
```

Write guide to `GUIDE_FILE`.

Report:
```
✅ Guide ready: {GUIDE_FILE}

  Phases: {N} phases covering {TOPIC}
  {N} steps total | Hints available via /ed assist

To walk through interactively:
  /ed assist {GUIDE_FILE} {--vim if VIM_MODE} {--helix if HELIX_MODE}

To annotate: add > or >> comments, then run /ed update {GUIDE_FILE}
```
