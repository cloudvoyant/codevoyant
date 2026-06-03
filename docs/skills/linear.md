---
title: linear
---

# linear

Linear skill — create issues and bug reports in Linear via the Linear MCP server.

## Requirements

- Linear MCP server — configure in Claude Code:

```bash
claude mcp add --transport http https://mcp.linear.app/sse
```

## Commands

### report-issue — create a Linear issue

Create a Linear issue from a bug report, optionally seeded from a QA debug report file.

```bash
/linear report-issue --team ENG --title "Login crashes on Safari 17"    # create issue directly
/linear report-issue --from .codevoyant/qa/login-crash/debug-report.md --team ENG
/linear report-issue --team ENG --project "Q3 Reliability" --title "Payment timeout"
```

Aliases: `report`, `bug`, and `issue` all map to `report-issue`.

### help — show usage reference

```bash
/linear help
```

## References

- [Linear documentation](https://linear.app/docs)
- [Linear MCP server](https://linear.app/docs/mcp)
