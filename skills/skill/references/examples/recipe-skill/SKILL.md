---
name: recipe-example
description: "Example of a recipe-based context skill. Load when working with *.example files or example.config.ts. Replace with your own file detection triggers."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# recipe-example

<!--
  RECIPE-BASED (CONTEXT) SKILL PATTERN
  ======================================
  This skill loads targeted recipe files when the agent detects 
  relevant files in the project (*.example, example.config.ts, etc.)
  
  Best for:
  - Domain knowledge (framework patterns, toolchain recipes)
  - Context that should activate automatically, not via slash command
  - Large bodies of reference material split across multiple files
  
  Pattern used by: typescript, sveltekit, docker, terraform, gcp, aws, cpp, python
-->

## When to load recipes

<!--
  Add one row per recipe file. The agent reads this table to decide
  which recipe to load for a given task.
  
  Format: | Situation | Recipe file path |
-->

| You are working on…                     | Load recipe                                    |
| --------------------------------------- | ---------------------------------------------- |
| Setting up a new example project        | `references/recipes/setup.md`                  |
| Writing example configuration           | `references/recipes/config-patterns.md`        |
| Testing example code                    | `references/recipes/testing.md`                |

Load `setup.md` when starting any new example project.

## Overview

<!--
  2-4 sentences describing what this skill covers.
  Keep it factual — no marketing language.
-->

Recipes for working with the Example framework. Covers project setup, configuration patterns, and testing conventions.

<!--
  RECIPE FILES
  ============
  Create one file per row above under references/recipes/.
  Each recipe file should be:
  - Terse and code-first (code blocks > prose)
  - Named for the situation it addresses
  - Under ~150 lines (split if larger)
  
  See the typescript or docker skills for examples.
-->
