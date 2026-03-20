---
description: 'Use to search project knowledge docs by type or tag. Triggers on: "mem find", "find docs about", "search knowledge", "look up". Thin wrapper around agent-kit mem find.'
argument-hint: '[--type <type>] [--tag <tag>] [--json]'
---

Search indexed project knowledge docs by type and/or tag.

## Step 1: Parse Arguments

Extract `--type`, `--tag`, and `--json` from the user's request. Infer type/tag from
natural language if not explicitly provided.

## Step 2: Run Find

```bash
npx @codevoyant/agent-kit mem find [--type <type>] [--tag <tag>] [--json]
```

## Step 3: Report

Print matching paths (or full JSON entries if `--json` was specified).

If no matches, suggest broadening the search or using `/mem:learn` to capture new knowledge.
