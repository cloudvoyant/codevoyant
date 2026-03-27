# help

Print the spec command reference.

## Variables

- `PLAN_NAME` — optional; if provided, show detailed help for that subcommand (future use)

## Step 1: Print Reference

Print the following text exactly as written. Do not reformat, create tables, add headers, or add commentary.

spec — Specification-driven development commands for Claude Code

  /spec new  [plan-name|url] [--branch branch-name] [--blank] [--bg] [--silent]
      Create a new spec plan by exploring requirements and building a structured implementation plan

  /spec go  [plan-name] [--yes|-y] [--commit|-c] [--silent]
      Execute a plan hands-free — the agent runs every task autonomously and updates progress in real-time

  /spec review  [plan-name] [--bg] [--silent]
      Review a spec plan before execution — checks for ambiguous tasks, missing validation, and dependency gaps

  /spec update  [plan-name] [change description] [--bg] [--silent]
      Update a spec plan by applying inline annotations or describing changes conversationally

  /spec refresh  [plan-name] [--bg] [--silent]
      Sync checklist status and phase markers with actual task completion

  /spec clean  [plan-name]
      Session wrap-up: stop running agents, archive completed plans to docs, triage active plans (done or cancel)

  /spec allow  [--global]
      Pre-approve spec plugin permissions for uninterrupted background agent execution

  /spec help
      Show this reference
