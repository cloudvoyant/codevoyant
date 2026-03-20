---
description: "Use when the user asks about available utils commands or needs help choosing a skill. Triggers on: \"utils help\", \"help utils\", \"what can utils do\", \"utils commands\", \"list utils skills\", \"utils reference\". Lists all utils commands with descriptions, arguments, and usage guidance."
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

utils — Shared utilities for Claude Code plugins

  /utils:help
      Show this help message

Utils provides shared internal utilities used by other codevoyant plugins.
There are no additional user-facing commands.
