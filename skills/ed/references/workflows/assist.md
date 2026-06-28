# assist — interactive step-by-step guide walkthrough

## Variables

- `GUIDE_PATH` — file path from REMAINING_ARGS (required; ask if empty)
- `VIM_MODE` — true if `--vim` present
- `CURRENT_PHASE` — index of current phase (starts at 1)
- `CURRENT_STEP` — index of current step within phase (starts at 1)
- `QUESTION_COUNTS` — map of normalized-question → times asked (for model escalation)
- `REPEAT_THRESHOLD` — escalate to Opus when a question is asked more than this many times (default 3)

## Model tiering

Spawn a sub-agent (Agent tool) with an explicit model for each operation:

- **Hint** and **Verify** → `model: claude-haiku-4-5-20251001` (fast, cheap)
- **Free-text question** → `model: claude-sonnet-4-6`
- **Repeated question** (asked more than `REPEAT_THRESHOLD` times) → `model: claude-opus-4-8`

Normalize a question for counting: lowercase, strip punctuation/whitespace. Increment `QUESTION_COUNTS[normalized]` each time; if it exceeds `REPEAT_THRESHOLD`, use Opus and prepend "You've asked this a few times — here's a deeper, more careful answer:".

## Step 0: Parse args

Parse GUIDE_PATH, VIM_MODE.

If GUIDE_PATH empty or not provided:
- `find .codevoyant/guides -path '*/*.md' 2>/dev/null` to list available guides (fall back to `find . -path '*/guides/*/*.md'` for legacy locations)
- Ask (AskUserQuestion): "Which guide would you like to work through?" listing discovered guides

Verify the guide file exists. If not: stop and suggest `ed new guide "{topic}"`.

## Step 1: Load guide

Read GUIDE_PATH. Parse:
- List of phases (`## Phase N: ...`)
- For each phase: learning objective, list of steps (numbered), hint `<details>` blocks, self-check items
- Extract Vim hints (`<details><summary>Vim hints</summary>`) per step if present

Store as `GUIDE_STRUCTURE`: `{ phases: [{ title, objective, steps: [{ title, body, hint, vim_hint }] }] }`.

## Step 2: Session start

Report:
```
📖 {Guide title}

Phases ({N} total):
  {for each phase: N. Title — Objective}

Starting at Phase 1, Step 1.   (Esc to exit anytime)
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

If `VIM_MODE` and the step has a `vim_hint`, display it as one terse line below the body (mirror the "Navigation hints (compact)" block in `skills/vim/SKILL.md`).

**Ask (AskUserQuestion):**
```
question: "Step {CURRENT_PHASE}.{CURRENT_STEP} — what next?  (Esc to exit)"
header: "Step {CURRENT_PHASE}.{CURRENT_STEP}"
options:
  - label: "Hint"
    description: "Reveal one nudge for this step (quick)"
  - label: "Show answer"
    description: "Show the full approach for this step (no solution code unless the guide has it)"
  - label: "Verify"
    description: "Paste your attempt in Other — I'll check it (quick)"
  - label: "Next"
    description: "Move to the next step"
```

**Handle response:**

- **Hint** → spawn a Haiku agent: "Give one short hint for this step (≤2 sentences), no full solution. Step: {body}. Guide hint: {hint}." Display it. Re-ask (stay on step).
- **Show answer** → display the phase Background + the step's stored hint/approach. If the user typed a follow-up in Other, answer it with Sonnet (or Opus if repeated past threshold). Re-ask.
- **Verify** → the user's attempt is in the Other free-text. Spawn a Haiku agent: "The learner is on this step: {body}. Their attempt: {user text}. In ≤3 sentences say whether it's on track and the single most useful correction." Display. Re-ask.
- **Next** → advance CURRENT_STEP (or CURRENT_PHASE if last step). Log `✓ Phase {P}, Step {S}`.
- **Esc / dismissed / "End"** → go to Step 5 (session end).

Any free-text the user types that is a question (not an attempt) is answered with Sonnet, escalating to Opus per the model-tiering rules, then re-ask the same step.

## Step 4: Phase self-check (after last step in a phase)

Before advancing to the next phase, display the phase's self-check checklist, then continue to the next phase's first step. (No separate question — the user can Esc to exit or pick Next.)

## Step 5: Session end / completion

If all phases complete:
```
🎉 Guide complete: {guide title}

  You worked through {N} phases and {M} steps.

Next:
  /ed quiz "{topic}" --source {notes file if it exists}
```

If exited early (Esc):
```
📌 Session paused at Phase {P}, Step {S}

  Completed: Phases {1..P-1} fully, Phase {P} steps {1..S-1}

To resume: /ed assist {GUIDE_PATH}
```
