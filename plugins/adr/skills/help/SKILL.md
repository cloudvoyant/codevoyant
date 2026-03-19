---
description: List all adr commands with descriptions, arguments, and when to use them. Use when the user wants to know what adr can do, asks for adr commands, or is unsure which skill to use. Triggers on: adr help, help adr, what can adr do, adr commands, list adr skills, adr reference.
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

adr — Architectural Decision Records for Claude Code

  /adr:new
      Interactively guide the user through creating a new Architectural Decision Record (ADR)

  /adr:capture
      Review the current session and capture significant technical decisions as ADRs

