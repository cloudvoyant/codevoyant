---
description: "Use when the user asks about available em commands or needs help choosing a skill. Triggers on: \"em help\", \"help em\", \"what can em do\", \"em commands\", \"list em skills\", \"em reference\". Lists all em commands with descriptions, arguments, and usage guidance."
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

em — Engineering management planning commands for Claude Code

  /em:plan  [description|linear-url] [--delegate] [--continue <id>] [--push <slug>] [--bg] [--silent]
      Plan a project or initiative locally then push to Linear on confirmation.
      --delegate: create PM/UX/dev stub issues instead of full breakdown
      --continue <id>: resume from existing Linear project state
      --push <slug>: re-push a saved local plan to Linear

  /em:review  [roadmap-file] [--silent]
      Review an engineering roadmap or epic plan for capacity realism, dependency gaps, and phasing quality

  /em:update  [plan-slug] [change description] [--bg] [--silent]
      Update an EM plan by applying annotations or describing changes conversationally

