# assist — interactive step-by-step guide walkthrough

## Variables

- `GUIDE_PATH` — file path from REMAINING_ARGS (required; ask if empty)
- `VIM_MODE` — true if `--vim` present
- `CURRENT_PHASE` — index of current phase (starts at 1)
- `CURRENT_STEP` — index of current step within phase (starts at 1)
- `QUESTION_COUNTS` — map of normalized-question → times asked (for model escalation)
- `REPEAT_THRESHOLD` — escalate to Opus when a question is asked more than this many times (default 3)

## Model tiering — Haiku-first, responsiveness over depth

Default to the fast, low-cost model for everything. Escalate ONLY when the learner asks something the guide itself does not answer. Spawn a sub-agent (Agent tool) with an explicit model:

- **Everything routine** — showing the next step, `hint`, `verify`/`check`, `answer`/`show`, and any question whose answer is already in the guide → `model: claude-haiku-4-5-20251001` (low effort, fast). This is the default; keep the session snappy.
- **A question the guide does NOT answer** (learner asks something beyond the guide's hints/background) → escalate to `model: claude-sonnet-4-6` (medium effort).
- **Repeated or still-unresolved question** (asked more than `REPEAT_THRESHOLD` times) → `model: claude-opus-4-8` (high effort). Prepend "You've asked this a few times — here's a deeper, more careful answer:".

Before escalating, check the guide first: if the step body, its hint, or the phase Background already answers it, respond on Haiku. Only reach for Sonnet/Opus when the guide is genuinely silent. Normalize a question for counting: lowercase, strip punctuation/whitespace; increment `QUESTION_COUNTS[normalized]` each time.

## Step 0: Parse args

Parse GUIDE_PATH, VIM_MODE.

If GUIDE_PATH empty or not provided, select one **autonomously — do not ask**:
- `find .codevoyant/guides -path '*/*.md' 2>/dev/null` (fall back to `find . -path '*/guides/*/*.md'` for legacy locations).
- If exactly one guide exists: use it.
- If several exist: pick the **most recently modified** and announce it — `📖 Starting the most recent guide: {path}` (the learner can re-run with an explicit path to pick another).
- If none exist: stop and suggest `ed new guide "{topic}"`.

Verify the resolved guide file exists. If not: stop and suggest `ed new guide "{topic}"`. The whole session is free-flowing — never open with a question.

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

## Step 3: Interactive loop (free-flow — no AskUserQuestion)

The point of `assist` is a free-flowing session. **Never use AskUserQuestion in this loop.** Show the step, then simply invite the learner to reply in plain language. You stay in the conversation and act on trigger words.

For each phase in order, for each step in order:

**Display step header + body:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase {CURRENT_PHASE}: {phase title}
Step {CURRENT_STEP}: {step title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{step body — the goal/question, no hints yet}
```

**External links (when relevant):** If the guide's References, the step body, or the step's linked notes contain `[title](url)` links relevant to this step, list them as clickable Markdown links under the body so the learner can click through in the terminal:
```
🔗 {title} — {url}
```
Only include links that genuinely help this step; omit the line otherwise.

If `VIM_MODE` and the step has a `vim_hint`, display it as one terse line below the body, mirroring the `## Navigation hints (compact)` section (the navigation-and-selection drill) in `skills/vim/SKILL.md` — movement + selection first, not just task-local keys.

**Then invite a reply (plain prompt, no options):**
```
Tell me what you'd like: type `hint`, `answer`, `check <your attempt>`, `next`, `skip`,
or just ask a question. (`exit` to stop — resume later with the same command.)
```

**Interpret the learner's free text by trigger word (match loosely, case-insensitive):**

- `hint` / `nudge` / `stuck` → spawn a **Haiku** agent: "Give one short hint for this step (≤2 sentences), no full solution. Step: {body}. Guide hint: {hint}." Display it. Stay on the step.
- `answer` / `show` / `solution` → display the phase Background + the step's stored hint/approach (no solution code unless the guide has it). Stay on the step.
- `check …` / `verify …` / `is this right …` (the learner's attempt follows the word, or is their message) → spawn a **Haiku** agent: "The learner is on this step: {body}. Their attempt: {user text}. In ≤3 sentences say whether it's on track and the single most useful correction." Display. Stay on the step.
- `next` / `done` / `got it` / `continue` → advance CURRENT_STEP (or CURRENT_PHASE if last step). Log `✓ Phase {P}, Step {S}`.
- `skip` → advance without logging completion; note `⏭ skipped Phase {P}, Step {S}`.
- `exit` / `quit` / `stop` / `end` / Esc → go to Step 5 (session end).
- **Anything else** = a question. First check the guide (step body, its hint, phase Background). If the guide answers it, respond on **Haiku**. If the guide is silent, escalate to **Sonnet** (or **Opus** if asked more than `REPEAT_THRESHOLD` times) per Model tiering. After answering, stay on the same step and re-show the invite line.

Keep replies tight and end each interaction by re-showing the one-line invite so the flow continues naturally. Do not summarize the trigger words every time — show them once per step (in the invite line above).

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
