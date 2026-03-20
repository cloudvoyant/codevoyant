---
description: "Use when the user asks about available pm commands or needs help choosing a skill. Triggers on: \"pm help\", \"help pm\", \"what can pm do\", \"pm commands\", \"list pm skills\", \"pm reference\". Lists all pm commands with descriptions, arguments, and usage guidance."
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

pm — Product management planning commands for Claude Code

  /pm:plan  [quarter|half|annual] [--bg] [--silent]
      Plan a product roadmap. Writes docs/product/roadmaps/YYMMDD-{type}-roadmap.md
      and optionally attaches to a Linear initiative.

  /pm:prd  [feature|linear-url] [--bg] [--silent]
      Write a PRD. Writes docs/prd/YYMMDD-{scope}-prd.md
      and optionally attaches to a Linear project or initiative.

  /pm:review  [plan-dir] [--silent]
      Review a product roadmap for coverage gaps, prioritization quality, and strategic coherence

  /pm:update  [plan-slug] [change description] [--bg] [--silent]
      Update a PM roadmap or PRD by applying annotations or describing changes conversationally

