---
title: skill
---

# skill

Lifecycle management for building and maintaining codevoyant-compatible skills. Covers research, scaffolding, iteration, quality review, and reporting issues back to skill authors.

## Installation

```bash
npx skills add cloudvoyant/codevoyant
```

## Usage

```bash
/skill <verb> [args]
```

All verbs accept an inline description to skip the opening question:

```bash
/skill new add a /summarize command that condenses long files
/skill explore linear integration
```

## Commands

### explore

Research what already exists before building something new.

```bash
/skill explore                          # open-ended research
/skill explore "linear integration"     # targeted search
```

Searches agentskill.sh and known skill registries. Returns a summary of existing skills, their capabilities, and gaps — so you can avoid duplication or build on what's there.

### new

Scaffold a new skill from the codevoyant template.

```bash
/skill new                             # guided prompts
/skill new my-command                  # named, proceeds immediately
```

Creates the skill directory structure (`SKILL.md`, `references/workflows/`, etc.), writes a first-draft SKILL.md from the template, and opens a planning loop to flesh out the workflows.

### update

Refine an existing skill's workflows or SKILL.md.

```bash
/skill update my-skill                 # targeted update
/skill update my-skill add a --dry-run flag to the deploy verb
```

Reads the current skill files, identifies the change, proposes edits, and applies them.

### critique

Evaluate a skill's quality before shipping.

```bash
/skill critique my-skill
```

Reviews across five dimensions: trigger accuracy, workflow clarity, argument handling, error paths, and output consistency. Returns a scorecard with specific improvement suggestions.

### feedback

Report a problem with a codevoyant skill. Opens a GitHub or GitLab issue using a standard template so skill authors have the context they need to debug and improve.

```bash
/skill feedback                        # guided — asks which skill and what went wrong
/skill feedback spec                   # report a problem with the spec skill
```

Collects: what happened, what was expected, steps to reproduce, and environment details (platform, Claude Code version, skill version). Shows a preview before creating the issue.

```bash
/skill feedback spec --save            # write to .codevoyant/feedback/ instead of opening an issue
```

Requires `gh` (GitHub CLI) or `glab` (GitLab CLI) to create an issue. If neither is installed, automatically falls back to `--save`. The saved file can be shared with skill authors later.

### help

```bash
/skill help
```

## Building a Skill

Skills are directories containing a `SKILL.md` and optionally `references/` files. The `SKILL.md` is the agent's entry point — it declares the skill's trigger patterns, parses arguments, and dispatches to workflow files.

**Minimum structure:**

```
skills/my-skill/
  SKILL.md                          ← entry point, trigger description, dispatch logic
  references/
    workflows/
      help.md                       ← always required
      my-verb.md                    ← one file per verb
```

**SKILL.md frontmatter:**

```yaml
---
name: my-skill
description: "Trigger description — what the agent matches on. Include example phrases."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex.
---
```

Run `/skill new` to generate this from a template and get guided through filling it in.
