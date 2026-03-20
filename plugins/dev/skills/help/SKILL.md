---
description: "Use when the user asks about available dev commands or needs help choosing a skill. Triggers on: \"dev help\", \"help dev\", \"what can dev do\", \"dev commands\", \"list dev skills\", \"dev reference\". Lists all dev commands with descriptions, arguments, and usage guidance."
argument-hint: "[skill-name]"
model: claude-haiku-4-5-20251001
disable-model-invocation: true
---

Print the following text exactly as written. Do not reformat, create tables, add headers, or add any commentary.

dev — Development workflow commands for Claude Code

  /dev:commit  [--yes|-y] [--no-push] [--autofix] [--atomic] [--single]
      Create a conventional commit with formatting, linting, push, and CI monitoring in one workflow

  /dev:ci  [--wait] [--autofix] [--silent]
      Monitor CI/CD workflows (GitHub Actions or GitLab CI)

  /dev:allow  [--plugins spec,dev,adr] [--global] [--apply]
      Generate and apply the permission config needed for uninterrupted autonomous agent execution

  /dev:pr-fix  [pr-id] [--github|--gitlab] [--silent]
      Fetch open PR/MR change requests and propose fixes

  /dev:rebase  [base-branch] [--push]
      Safely rebase a branch using an intent snapshot to drive conflict resolution correctly

  /dev:explore  [exploration-name] [--aspects]
      Research a technical problem, compare architectural approaches, and generate parallel proposals

  /dev:diff  <repository-url>
      Compare the current repository with another to identify structural differences and insights

  /dev:docs  [--bg] [--silent]
      Generate or update architecture documentation in docs/architecture/ from a codebase scan

