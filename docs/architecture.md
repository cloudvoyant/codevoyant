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

- **dev** — Developer workflows (architecture planning, technical exploration, repo comparison, docs generation, PR review)
- **git** — Git version control (conventional commits, CI monitoring, interactive rebase)
- **spec** — Specification-driven development (planning, execution, review)
- **em** — Engineering management (roadmap planning, epic breakdowns)
- **pm** — Product management (PRDs, roadmaps, prioritization)
- **ux** — UX design workflows (prototyping, wireframes, style synthesis)

## Repository Structure

```
codevoyant/
├── skills/                  # Unified skill packages
│   ├── dev/                 # Developer workflows dispatcher
│   │   ├── SKILL.md         # Dispatcher (parses verb → routes to workflow)
│   │   ├── workflows/       # One file per subcommand
│   │   ├── agents/          # Agent definitions
│   │   └── references/      # Supporting templates and docs
│   ├── git/                 # Git workflows dispatcher
│   ├── em/                  # Engineering management dispatcher
│   ├── pm/                  # Product management dispatcher
│   ├── ux/                  # UX design dispatcher
│   ├── spec-new/            # Spec skills (individual, not yet unified)
│   ├── spec-go/
│   ├── spec-done/
│   └── ...
├── .claude/
│   └── skills/              # Private skills (not distributed via npx skills)
│       ├── skill-create/    # Internal skill scaffolding helper
│       └── skill-review/    # Internal skill review and audit
├── packages/
│   ├── agent-kit/           # CLI toolkit (plans, settings, mem)
│   └── claude-skill-converter/  # Skill format conversion utilities
├── docs/                    # Public VitePress documentation site
├── e2e/                     # End-to-end tests
└── .codevoyant/             # Project metadata (plans.json, worktrees.json, plans/)
```

Each unified skill package follows the dispatcher pattern:

```
skills/{group}/
├── SKILL.md              # Dispatcher: parses verb, routes to workflows/{verb}.md
├── workflows/            # One .md file per subcommand
│   ├── help.md
│   └── {verb}.md
├── agents/               # Agent definitions (if needed)
└── references/           # Supporting templates and docs
```

Skill names use space-separated format (`/dev plan`, `/git commit`) while directories use plain names (`skills/dev/`, `skills/git/`).

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
