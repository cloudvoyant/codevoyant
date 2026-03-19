---
description: List all style commands with descriptions, arguments, and when to use them. Use when the user wants to know what style can do, asks for style commands, or is unsure which skill to use. Triggers on: style help, help style, what can style do, style commands, list style skills, style reference.
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

style — Code style guide management for Claude Code

  /style:init
      Initialize a context-tagged CLAUDE.md style guide for a project

  /style:add  "rule description" [--context tag1,tag2]
      Add a new rule to the style guide (CLAUDE.md) with context tags

  /style:learn  [session|repo|dir <path>|remote <url>] [--apply]
      Learn style patterns and suggest or apply rules to CLAUDE.md

  /style:review  [recent|commit|branch|dir [path]|repo|files <pattern>] [--fix]
      Check compliance with the style guide

  /style:contexts  [context-name | add <name> | remove <name>]
      List and manage rule contexts for contextual loading

  /style:doctor
      Diagnose and fix CLAUDE.md health — brings outdated style guides up to current standards

