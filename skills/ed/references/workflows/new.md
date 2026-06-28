# new — sub-dispatch to notes / guide / syllabus

## Variables

- `SUBVERB` — first word of REMAINING_ARGS (`notes`, `guide`, or `syllabus`)
- `REMAINING_ARGS` — everything after SUBVERB

## Step 0: Parse sub-verb

```bash
SUBVERB="[first word of REMAINING_ARGS, lowercased]"
REMAINING_ARGS="[everything after SUBVERB]"

case "$SUBVERB" in
  "notes"|"note")        SUBVERB="notes" ;;
  "guide"|"guides")      SUBVERB="guide" ;;
  "syllabus"|"syllabi")  SUBVERB="syllabus" ;;
  "plan"|"plans")        SUBVERB="syllabus" ;;  # legacy alias
  "")
    # Ask user
    ;;
esac
```

If SUBVERB is empty, use AskUserQuestion:

```
question: "What would you like to create?"
header: "ed new"
options:
  - label: "notes"
    description: "Feynman-style study notes from lecture slides and research"
  - label: "guide"
    description: "Pedagogical assignment/project guide with hint-controlled phases"
  - label: "syllabus"
    description: "Week-by-week learning syllabus for a course or topic"
```

## Step 1: Dispatch

Read and execute `references/workflows/new-{SUBVERB}.md`, passing `$REMAINING_ARGS`.

If file does not exist, fall back to `references/workflows/help.md`.
