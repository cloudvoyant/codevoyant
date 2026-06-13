# new — sub-dispatch to notes / guide / plan

## Variables

- `SUBVERB` — first word of REMAINING_ARGS (`notes`, `guide`, or `plan`)
- `REMAINING_ARGS` — everything after SUBVERB

## Step 0: Parse sub-verb

```bash
SUBVERB="[first word of REMAINING_ARGS, lowercased]"
REMAINING_ARGS="[everything after SUBVERB]"

case "$SUBVERB" in
  "notes"|"note")  SUBVERB="notes" ;;
  "guide"|"guides") SUBVERB="guide" ;;
  "plan"|"plans")  SUBVERB="plan" ;;
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
  - label: "plan"
    description: "Week-by-week learning plan for a course or topic"
```

## Step 1: Dispatch

Read and execute `references/workflows/new-{SUBVERB}.md`, passing `$REMAINING_ARGS`.

If file does not exist, fall back to `references/workflows/help.md`.
