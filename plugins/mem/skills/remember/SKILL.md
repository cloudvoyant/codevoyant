---
description: 'Use at session start to load team knowledge into context. Triggers on: "mem remember", "load knowledge", "session start", "what does the team know". Fast, non-interactive bulk dump.'
argument-hint: ''
---

Session-start bulk index dump. Loads all indexed team knowledge into context.

## Step 1: Run Remember

```bash
npx @codevoyant/agent-kit mem remember
```

## Step 2: Print Output

Print the terse table output directly into context. Do not reformat or add commentary.

## Step 3: Tip (First Run Only)

If `CLAUDE.md` does not contain `mem remember` and this appears to be a first run,
append a non-blocking tip:

```
Tip: run /mem:init to configure automatic loading every session.
```

Do NOT ask a blocking question. Keep remember fast and non-interactive.
