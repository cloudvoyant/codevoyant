---
description: "Use when the user asks about available mem commands or needs help choosing a skill. Triggers on: \"mem help\", \"help mem\", \"what can mem do\", \"mem commands\", \"list mem skills\", \"mem reference\". Lists all mem commands with descriptions, arguments, and usage guidance."
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

mem -- Team knowledge capture and recall via structured markdown docs

  /mem:init  [--hook]
      One-time project bootstrap: writes CLAUDE.md session-start section, optionally adds Claude Code hook

  /mem:learn  <knowledge or question>
      Capture team knowledge (learn mode) or recall existing knowledge (recall mode)

  /mem:remember
      Session-start bulk dump: loads all indexed team knowledge into context

  /mem:index
      Re-index project knowledge docs after manual edits outside of /mem:learn

  /mem:find  [--type <type>] [--tag <tag>] [--json]
      Search indexed project knowledge docs by type and/or tag

All commands also work without the plugin via npx:
  npx @codevoyant/agent-kit mem index
  npx @codevoyant/agent-kit mem find --tag <tag> [--type <type>] [--json]
  npx @codevoyant/agent-kit mem remember
