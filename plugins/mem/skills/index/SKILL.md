---
description: 'Use to re-index project knowledge docs after manual edits. Triggers on: "mem index", "reindex docs", "update knowledge index". Thin wrapper around agent-kit mem index.'
argument-hint: ''
---

Re-index project knowledge docs. Useful after editing docs outside of `/mem:learn`.

## Step 1: Run Index

```bash
npx @codevoyant/agent-kit mem index
```

## Step 2: Report

Print the output (number of docs indexed). Example:
```
Indexed 5 doc(s) -> .codevoyant/mem.json
```
