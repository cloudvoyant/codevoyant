---
description: List all em commands with descriptions, arguments, and when to use them. Use when the user wants to know what em can do, asks for em commands, or is unsure which skill to use. Triggers on: em help, help em, what can em do, em commands, list em skills, em reference.
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

em — Engineering management planning commands for Claude Code

  /em:plan  [quarter|half|<horizon>] [--bg] [--silent]
      Plan a single epic or a multi-epic roadmap

  /em:breakdown  [ticket-url|epic-description] [--bg] [--silent]
      Produce a detailed task breakdown for an epic — sub-tasks with estimates, acceptance criteria, and dependencies

  /em:review  [roadmap-file] [--silent]
      Review an engineering roadmap or epic plan for capacity realism, dependency gaps, and phasing quality

  /em:update  [plan-slug] [change description] [--bg] [--silent]
      Update an EM roadmap or breakdown by applying annotations or describing changes conversationally

  /em:sync  [push|pull] [--tracker linear|notion|github] [--plan slug] [--bg] [--silent]
      Import or export an em roadmap to/from Linear, Notion, or GitHub

  /em:docs  [plan-slug] [--bg] [--silent]
      Generate or update planning documentation in docs/planning/ from em plan artifacts

