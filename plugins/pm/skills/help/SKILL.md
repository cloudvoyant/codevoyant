---
description: List all pm commands with descriptions, arguments, and when to use them. Use when the user wants to know what pm can do, asks for pm commands, or is unsure which skill to use. Triggers on: pm help, help pm, what can pm do, pm commands, list pm skills, pm reference.
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

pm — Product management planning commands for Claude Code

  /pm:plan  [quarter|half|<horizon>] [--bg] [--silent]
      Plan a product roadmap from strategic context, market signals, and feature ideas

  /pm:prd  [ticket-url|feature-description] [--bg] [--silent]
      Generate a structured PRD (Product Requirements Document) for a single feature or initiative

  /pm:breakdown  [feature-name|ticket-url] [--bg] [--silent]
      Break down a feature from the product roadmap into a full PRD

  /pm:review  [plan-dir] [--silent]
      Review a product roadmap for coverage gaps, prioritization quality, and strategic coherence

  /pm:update  [plan-slug] [change description] [--bg] [--silent]
      Update a PM roadmap or PRD by applying annotations or describing changes conversationally

  /pm:docs  [plan-slug] [--bg] [--silent]
      Generate or update product documentation in docs/product/ from pm plan artifacts

