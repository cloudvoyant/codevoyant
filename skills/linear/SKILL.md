---
name: linear
description: "Linear issue management. Create bug reports and issues in Linear projects and teams. Triggers on: 'linear report', 'report to linear', 'create linear issue', 'log bug in linear'."
license: MIT
compatibility: Works on Claude Code with the Linear MCP server configured. Requires mcp__claude_ai_Linear tools.
---

## Dispatcher

```
VERB = first non-flag arg
case VERB:
  ""         → help
  "report"   → report-issue
  "bug"      → report-issue
  "issue"    → report-issue
Dispatch to references/workflows/{VERB}.md
```

## Workflow index

- **report-issue** — create a Linear issue from a bug report
- **help** — usage reference
