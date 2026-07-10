---
name: qa
description: "QA workflows: investigate and document bugs, post issues to GitHub/GitLab/Linear, and run browser-agent smoke tests. Triggers on: 'qa debug', 'qa report', 'qa smoke', 'run smoke test', 'report bug', 'investigate issue'."
license: MIT
compatibility: Works on Claude Code. smoke verb requires agent-browser (npx @vercel/agent-browser).
---

## Critical Rules

- **Markdown output: soft-wrap prose, never hard-wrap** — when any qa workflow writes a `.md` artifact (debug report, smoke report) or markdown posted to GitHub/GitLab/Linear via `report`, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

## Dispatcher

```
VERB = first non-flag arg
case VERB:
  ""           → help
  "test"       → smoke
  "browse"     → smoke
  "investigate"→ debug
  "file"       → report
  "post"       → report
Dispatch to references/workflows/{VERB}.md
```

## Workflow Index

- **debug** — investigate a bug and produce a structured report
- **report** — post a QA report as an issue to GitHub/GitLab/Linear
- **smoke** — browser-agent smoke test, produces smoke report
- **help** — usage reference
