# quiz — generate or administer a quiz

## Variables

- `TOPIC` — first non-flag arg (required unless `--interactive` mode)
- `SLUG` — kebab-case of TOPIC
- `QUIZ_DIR` — `quizzes/{SLUG}/`
- `QUIZ_FILE` — `quizzes/{SLUG}/quiz.md`
- `ANSWERS_FILE` — `quizzes/{SLUG}/answers.md`
- `SOURCE` — file path from `--source` (optional)
- `QUESTION_COUNT` — integer from `--questions`, default 10
- `INTERACTIVE` — true if `--interactive` present; value is quiz file path

## Step 0: Parse args and branch

Parse all variables.

**If INTERACTIVE is set:**
- `INTERACTIVE_TARGET` = the path after `--interactive` flag
- Jump directly to **Interactive Mode** (Step 5)

**Otherwise:** proceed with quiz generation (Steps 1–4).

## Step 1: Parse topic (generation mode)

If TOPIC empty, ask (AskUserQuestion, free-text): "What topic is this quiz on?"

## Step 2: Find source material

Priority order:
1. `--source <file>` if provided (read it)
2. `notes/{SLUG}/notes.md` if it exists (read it)
3. Deep research agent: find key concepts and testable facts for TOPIC at graduate level

Store as `SOURCE_CONTENT`.

## Step 3: Generate questions

Generate `QUESTION_COUNT` questions from SOURCE_CONTENT. Mix of:
- **Conceptual [easy/medium]:** "Explain X in your own words", "What is the difference between X and Y?"
- **Mathematical [medium/hard]:** "Derive X", "Prove that Y holds when...", "Compute Z given..."
- **Application [medium/hard]:** "Given scenario S, what would happen if...", "How would you use X to solve Y?"
- **Synthesis [hard]:** "Connect X and Y — how does understanding one help with the other?"

Target distribution: ~30% easy, ~50% medium, ~20% hard.

For each question, prepare:
- `question_text` — the question as asked (no hints)
- `answer_text` — full answer with working/derivation where applicable
- `difficulty` — easy | medium | hard
- `notes_ref` — section in SOURCE_CONTENT this tests (for answers.md link)

## Step 4: Write quiz files

Create `QUIZ_DIR`:
```bash
mkdir -p quizzes/{SLUG}
```

**Write `QUIZ_FILE`:**

```markdown
# Quiz: {TOPIC}

> *Generated: {date} | {QUESTION_COUNT} questions | Graduate level*
> *Complete all questions before checking answers.md*

---

**1.** [{difficulty}] {question_text}

{blank space}

---

**2.** [{difficulty}] {question_text}

{blank space}

---

{... repeat for all questions}
```

**Write `ANSWERS_FILE`:**

```markdown
# Answers: {TOPIC}

> *⚠️ Only open this after completing quiz.md*

---

**1.** [{difficulty}] {question_text}

**Answer:** {answer_text}

{For medium/hard: show full derivation or working}

{If applicable: *See also: notes/{SLUG}/notes.md § {section}*}

---

{... repeat for all questions}
```

Report:
```
✅ Quiz ready:

  Questions: {QUIZ_FILE}
  Answers:   {ANSWERS_FILE}

  {QUESTION_COUNT} questions ({easy} easy · {medium} medium · {hard} hard)

To take the quiz: open {QUIZ_FILE} and answer each question before opening answers.md
To run interactively: /ed quiz --interactive {QUIZ_FILE}
```

## Step 5: Interactive Mode

Load `INTERACTIVE_TARGET` quiz file. Parse questions.

Also attempt to load the corresponding `answers.md` (same dir, `answers.md`).

Report:
```
📝 Quiz: {title from quiz file}
   {N} questions

I'll show you one question at a time. Self-assess your answer, then move on.
```

For each question (index Q):

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question {Q} of {N} [{difficulty}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{question_text}

Take a moment to answer mentally (or write it down).
```

Ask (AskUserQuestion):
```
question: "How did you do on Question {Q}?"
header: "Q{Q}/{N}"
options:
  - label: "Got it — show answer"
    description: "I answered correctly, show me the answer to compare"
  - label: "Partial — show answer"
    description: "I got part of it, want to see the full answer"
  - label: "Didn't get it — show answer"
    description: "Show me the answer and explanation"
  - label: "Skip"
    description: "Move to next question without seeing the answer"
```

If any option other than "Skip": display the answer from `answers.md` for this question.

Track: `{ got_it: N, partial: M, missed: K, skipped: S }`.

After all questions, report:
```
📊 Quiz complete: {title}

  ✅ Got it:  {N}/{TOTAL}
  ⚠️  Partial: {M}/{TOTAL}
  ❌ Missed:  {K}/{TOTAL}
  ⏭️  Skipped: {S}/{TOTAL}

Missed concepts to review:
  {list question topics where missed/partial}

To make notes on these: /ed new notes "{topic}" --resources {source if known}
```
