---
name: simple-example
description: "Example of a simple skill. Replace this description with your trigger phrases — the agent uses this to decide when to load your skill. Example: 'greet user', 'say hello', 'print greeting'."
license: MIT
compatibility: Works on Claude Code, OpenCode, and any platform that supports slash commands.
---

# simple-example

<!-- 
  SIMPLE SKILL PATTERN
  ====================
  All logic lives here in SKILL.md.
  Best for: short, focused operations with no branching or sub-steps.
  
  When the user invokes this skill (via trigger phrase or /simple-example),
  the agent reads this file and executes the instructions below directly.
-->

## What this skill does

Greets the user with a friendly message. Replace this with your own logic.

## Instructions

1. Read the current time from the system: `date +"%H:%M"`
2. Choose a greeting based on the hour:
   - Before 12:00 → "Good morning"
   - 12:00–17:00 → "Good afternoon"
   - After 17:00 → "Good evening"
3. Print: `{greeting}, {user}! How can I help you today?`

<!-- 
  TIPS:
  - Keep simple skills under ~50 lines
  - If you find yourself adding conditionals or sub-steps, 
    consider upgrading to a workflow skill
  - The description field above is critical — it determines 
    when the agent loads this skill
-->
