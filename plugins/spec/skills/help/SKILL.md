---
description: "Use when the user asks about available spec commands or needs help choosing a skill. Triggers on: \"spec help\", \"help spec\", \"what can spec do\", \"spec commands\", \"list spec skills\", \"spec reference\". Lists all spec commands with descriptions, arguments, and usage guidance."
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

spec — Specification-driven development commands for Claude Code

  /spec:new  [plan-name|url] [--branch branch-name] [--blank] [--bg] [--silent]
      Create a new spec plan by exploring requirements and building a structured implementation plan

  /spec:bg  [plan-name] [--yes|-y] [--commit|-c] [--silent]
      Launch a plan hands-free — the agent executes every task autonomously and updates progress in real-time

  /spec:go  [plan-name] [--bg] [--silent] [--commit|-c]
      Execute or continue a spec plan interactively with configurable breakpoints

  /spec:list  [plan-name]
      List all spec plans with status and progress, or show detailed status for one plan

  /spec:review  [plan-name] [--bg] [--silent]
      Review a spec plan before execution — checks for ambiguous tasks, missing validation, and dependency gaps

  /spec:update  [plan-name] [change description] [--bg] [--silent]
      Update a spec plan by applying inline annotations or describing changes conversationally

  /spec:refresh  [plan-name] [--bg] [--silent]
      Review an existing spec plan and update checklist status and phase markers

  /spec:done  [plan-name]
      Mark a spec plan as complete, optionally commit changes, and archive it

  /spec:stop  [plan-name]
      Stop a running background agent or pause a plan and capture session insights

  /spec:delete  [plan-name]
      Permanently delete a spec plan and all its files

  /spec:rename  [old-name] [new-name]
      Rename a spec plan and update all references

  /spec:doctor
      Diagnose and fix spec setup issues — detects old path layouts and migrates them

