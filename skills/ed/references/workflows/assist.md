# assist — interactive step-by-step guide walkthrough

## Variables

- `GUIDE_PATH` — file path from REMAINING_ARGS (required; ask if empty)
- `VIM_MODE` — true if `--vim` present
- `HELIX_MODE` — true if `--helix` present
- `CURRENT_PHASE` — index of current phase (starts at 1)
- `CURRENT_STEP` — index of current step within phase (starts at 1)

## Step 0: Parse args

Parse GUIDE_PATH, VIM_MODE, HELIX_MODE.

If GUIDE_PATH empty or not provided:
- `find . -path './guides/**/*.md' 2>/dev/null` to list available guides
- Ask (AskUserQuestion): "Which guide would you like to work through?" listing discovered guides

Verify the guide file exists. If not: stop and suggest `ed new guide "{topic}"`.

## Step 1: Load guide

Read GUIDE_PATH. Parse:
- List of phases (`## Phase N: ...`)
- For each phase: learning objective, list of steps (numbered), hint `<details>` blocks, self-check items
- Extract editor hints (`<details><summary>Vim hints</summary>` / `<details><summary>Helix hints</summary>`) per step if present

Store as `GUIDE_STRUCTURE`: `{ phases: [{ title, objective, steps: [{ title, body, hint, vim_hint, helix_hint }] }] }`.

## Step 2: Session start

Report:
```
📖 {Guide title}

Phases ({N} total):
  {for each phase: N. Title — Objective}

Starting at Phase 1, Step 1.
```

## Step 3: Interactive loop

For each phase in order, for each step in order:

**Display step header:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase {CURRENT_PHASE}: {phase title}
Step {CURRENT_STEP}: {step title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{step body — the goal/question, no hints yet}
```

**Ask (AskUserQuestion):**
```
question: "How would you like to proceed?"
header: "Step {CURRENT_PHASE}.{CURRENT_STEP}"
options:
  - label: "Got it — next step"
    description: "Move to the next step"
  - label: "Give me a hint"
    description: "Reveal one hint for this step"
  - label: "Show full approach"
    description: "See the background and all hints (no solution code)"
  - label: "Skip this step"
    description: "Move on without hints"
  - label: "End session"
    description: "Stop here and see your progress summary"
```

**Handle response:**

- **"Got it — next step"**: advance CURRENT_STEP (or CURRENT_PHASE if last step). Log `✓ Phase {P}, Step {S}`.
- **"Give me a hint"**: display one hint from the step's `<details>` block. Then re-ask the same AskUserQuestion (stay on same step).
- **"Show full approach"**: display the phase Background + all hints for the step. Re-ask the same AskUserQuestion.
- **"Skip this step"**: advance without displaying hints.
- **"End session"**: go to Step 4.

**Editor hints (display after step body if mode active):**

If VIM_MODE and vim_hint exists for step: display inline below step body (not in a details block — always visible in assist mode).
If HELIX_MODE and helix_hint exists: same.

## Step 4: Phase self-check (after last step in a phase)

Before advancing to the next phase:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase {N} Self-Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before moving on, verify:
{self-check checklist items from guide}
```

Ask:
```
question: "Ready to move to Phase {N+1}?"
header: "Phase check"
options:
  - label: "Yes, move on"
  - label: "I need to review a step"
    description: "Type which step in Other"
  - label: "End session here"
```

If "I need to review a step": jump back to that step and re-enter the loop.

## Step 5: Session end / completion

If all phases complete:
```
🎉 Guide complete: {guide title}

  You worked through {N} phases and {M} steps.

Next:
  /ed quiz "{topic}" --source {notes file if it exists}
```

If ended early:
```
📌 Session paused at Phase {P}, Step {S}

  Completed: Phases {1..P-1} fully, Phase {P} steps {1..S-1}

To resume: /ed assist {GUIDE_PATH}
(Note: resume restarts from beginning — step into your stopping point)
```
