---
type: architecture
tags: [skills, repository-structure, design-principles]
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
│   ├── spec/                # Specification-driven development dispatcher
│   ├── migrate/             # Context-store initialize/copy/migrate dispatcher
│   └── ...                  # (aws, docker, python, react, … — see the skills index)
├── docs/                    # Public VitePress documentation site
├── scripts/                 # Repo tooling (e.g. changelog sanitizer)
└── .codevoyant/             # Symlink → ~/.codevoyant/<project-slug>/ (shared across worktrees; gitignored)
```

Each unified skill package follows the dispatcher pattern:

```
skills/{group}/
├── SKILL.md              # Dispatcher: parses verb, routes to references/workflows/{verb}.md
├── references/           # Supporting templates, docs, and workflow files
│   ├── workflows/        # One .md file per subcommand
│   │   ├── help.md
│   │   └── {verb}.md
│   └── ...               # Templates and reference docs
├── agents/               # Agent definitions (if needed)
└── scripts/              # Helper scripts (if needed)
```

Skill names use space-separated format (`/dev plan`, `/git commit`) while directories use plain names (`skills/dev/`, `skills/git/`).

## Design Principles

1. **Modularity** — Skills are separated by concern, installable independently.
2. **Reusability** — Skills work across any project type with no language-specific assumptions.
3. **Convention Over Configuration** — Follow established patterns (conventional commits, semantic versioning).
4. **Composability** — Skills can be used independently or chained together across groups.
5. **Documentation-Driven** — All skills include comprehensive inline documentation and examples.

## Spec Plugin: Multi-Plan Architecture

The canonical context store lives at `~/.codevoyant/<project-slug>/` (derived from the repo's top-level directory name), and the in-repo `.codevoyant` is a gitignored symlink to it so every git worktree of the project shares one store. Skills reference `.codevoyant/...` transparently and know nothing about this residency; the store and its symlink are created in-place at first touch by the skills that create `.codevoyant/` subdirectories, and the `/migrate` skill initializes/repairs the store, copies existing codevoyant data from user-supplied source location(s) into it, and tracks the store's codevoyant version in `.codevoyant/metadata.json`.

The store holds plain markdown artifacts — there are no JSON registries. Each skill writes into its own subdirectory, and `spec` tracks its plans with a human-readable `README.md` table (not a registry file):

```
.codevoyant/                          # → ~/.codevoyant/<project-slug>/ (symlink)
├── README.md                         # spec's Active Plans table (Name | Status | … )
├── metadata.json                     # store's codevoyant version (managed by /migrate)
├── plans/
│   └── {plan-name}/
│       ├── plan.md
│       ├── intent.md                 # bare-name /spec new scaffold
│       ├── implementation/           # per-phase specs
│       └── execution-log.md
├── explore/                          # research artifacts (dev explore, em plan, pm explore)
├── prds/                             # product requirement docs (pm prd)
├── qa/                               # debug reports (qa debug)
├── usage/                            # responsible-AI usage reports (usage report)
├── feedback/                         # saved skill feedback (skill feedback)
├── flows/                            # flow definitions + run instances (flow new / flow go)
└── worktrees/                        # in-repo git worktrees (never migrated by /migrate)
```

## Distribution

Skills are distributed via `npx skills`:

```bash
npx skills add cloudvoyant/codevoyant
```

This installs all skills. Works with Claude Code, OpenCode, and VS Code Copilot.
