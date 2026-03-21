---
type: architecture
tags: [skills, repository-structure, design-principles, agent-kit]
description: High-level architecture of the codevoyant skills collection — skill layout, design principles, distribution model
---

# Architecture

Design and structure of the codevoyant skills collection.

## Overview

codevoyant is a collection of skills for AI coding agents (Claude Code, OpenCode, Copilot) that provide professional workflow commands for development tasks. Skills are organized in a flat directory and can be installed independently or together via `npx skills`.

## Skill Groups

- **dev** — Development workflow (commits, CI, review, docs, explore)
- **spec** — Specification-driven development (planning, execution, review)
- **em** — Engineering management (roadmap planning, epic breakdowns)
- **pm** — Product management (PRDs, roadmaps, prioritization)
- **ux** — UX design workflows (prototyping, wireframes, style synthesis)
- **mem** — Team knowledge capture and recall

## Repository Structure

```
codevoyant/
├── .claude-plugin/          # Marketplace metadata
│   └── marketplace.json     # Lists all skill groups
├── skills/                  # Flat skill collection
│   ├── dev-commit/          # Each skill in its own dir
│   ├── dev-ci/
│   ├── spec-new/
│   ├── mem-find/
│   ├── mem2/                # Experimental unified mem skill
│   └── ...                  # 47 skills total
├── packages/
│   ├── agent-kit/           # CLI toolkit (plans, settings, mem)
│   └── claude-skill-converter/  # Builds dist bundles
├── docs/                    # Public VitePress documentation site
├── e2e/                     # End-to-end tests
└── .codevoyant/             # Project metadata (plans.json, worktrees.json, plans/)
```

Each skill follows the structure:

```
skills/{group}-{name}/
├── SKILL.md              # Skill definition (frontmatter + instructions)
├── references/           # Supporting docs for the skill
├── agents/               # Agent definitions (if needed)
└── commands/             # Subcommand files (for unified skills like mem2)
```

Skill names use colon-scoped format in SKILL.md frontmatter (`name: dev:commit`, `name: mem:find`) while directories use hyphens (`dev-commit/`, `mem-find/`).

## Design Principles

1. **Modularity** — Skills are separated by concern, installable independently.
2. **Reusability** — Skills work across any project type with no language-specific assumptions.
3. **Convention Over Configuration** — Follow established patterns (conventional commits, semantic versioning).
4. **Composability** — Skills can be used independently or chained together across groups.
5. **Documentation-Driven** — All skills include comprehensive inline documentation and examples.

## Spec Plugin: Multi-Plan Architecture

Plans are stored under `.codevoyant/plans/` with a registry at `.codevoyant/plans.json`:

```
.codevoyant/
├── plans.json                       # Plan registry (active + archived)
├── worktrees.json                   # Worktree registry
├── settings.json                    # Project settings
└── plans/
    ├── {plan-name}/
    │   ├── plan.md
    │   ├── implementation/          # Per-phase specs
    │   │   ├── phase-1.md
    │   │   └── phase-N.md
    │   └── execution-log.md
    └── archive/
        └── {plan-name}-{YYYYMMDD}/
```

## Distribution

Skills are distributed via `npx skills`:

```bash
npx skills add cloudvoyant/codevoyant
```

This installs all skills. Works with Claude Code, OpenCode, and VS Code Copilot.
