# Architecture

> Design and structure of the codevoyant plugins

## Overview

codevoyant is a collection of Claude Code plugins that provide professional workflow commands for development tasks. It's organized as three specialized plugins that can be installed independently or together.

## Plugins

- codevoyant-adr - Architecture Decision Records
- codevoyant-dev - Development workflow (docs, review, commits)
- codevoyant-spec - Specification-driven development (planning, upgrading)

## Repository Structure

```
codevoyant/
├── .claude-plugin/          # Marketplace metadata
│   └── marketplace.json     # Lists all three plugins
├── plugins/                 # Plugin collection
│   ├── adr/                 # ADR Plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json  # ADR plugin manifest
│   │   └── commands/
│   │       ├── new.md       # Create ADR
│   │       └── capture.md   # Capture decision
│   ├── dev/                 # Dev Plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json  # Dev plugin manifest
│   │   └── commands/
│   │       ├── commit.md    # Conventional commits
│   │       ├── docs.md      # Documentation generation
│   │       ├── review.md    # Code review
│   │       └── diff.md      # Repository comparison
│   └── spec/                # Spec Plugin
│       ├── .claude-plugin/
│       │   └── plugin.json  # Spec plugin manifest
│       └── commands/
│           ├── new.md       # Create plan
│           ├── init.md      # Initialize plan template
│           ├── go.md        # Execute plan
│           ├── bg.md        # Background execution
│           ├── status.md    # Check execution status
│           ├── stop.md      # Stop background execution
│           ├── refresh.md   # Update plan status
│           ├── pause.md     # Capture insights
│           ├── done.md      # Complete plan
│           ├── list.md      # List all plans
│           ├── archive.md   # Archive incomplete plan
│           ├── delete.md    # Delete plan
│           ├── rename.md    # Rename plan
│           └── upgrade.md   # Template upgrade
├── .github/workflows/       # CI/CD automation
│   ├── ci.yml               # Test and validation
│   └── release.yml          # Semantic versioning and releases
├── docs/                    # Plugin documentation
│   ├── architecture.md      # This file
│   ├── user-guide.md        # Installation and usage
│   └── decisions/           # Architecture Decision Records
├── test/                    # Test suite (empty currently)
├── .gitignore               # Git exclusions
├── .releaserc.json          # Semantic-release config
├── justfile                 # Command runner
├── README.md                # Plugin overview
└── version.txt              # Current version
```

## Design Principles

### 1. Modularity

Plugins are separated by concern (ADR, Dev, Spec) allowing users to install only what they need.

### 2. Reusability

Commands are designed to work across any project type. No language-specific assumptions are made.

### 3. Convention Over Configuration

Commands follow established patterns (conventional commits, ADRs, semantic versioning) to reduce cognitive load.

### 4. Composability

Commands can be used independently or chained together in workflows across plugins.

### 5. Documentation-Driven

All commands include comprehensive inline documentation and examples.

## Component Design

### Slash Commands

Each command is a standalone markdown file in the plugin's `commands/` directory following Claude Code's slash command format:

- Clear description and usage instructions
- Step-by-step execution workflow
- Examples and best practices
- Error handling guidance

Commands are organized by plugin:

- ADR commands (`plugins/adr/commands/`) - Focus on architectural decisions
- Dev commands (`plugins/dev/commands/`) - Focus on development workflow
- Spec commands (`plugins/spec/commands/`) - Focus on planning and execution

#### Spec Plugin: Multi-Plan Architecture

The spec plugin now supports multiple concurrent plans with organized tracking:

**Directory Structure:**
```
.codevoyant/
└── plans/
    ├── README.md                    # Central plan tracker
    ├── {plan-name}/                 # Individual plans
    │   ├── plan.md                  # High-level plan
    │   ├── implementation/          # Detailed specs per phase
    │   │   ├── phase-1.md
    │   │   ├── phase-2.md
    │   │   └── phase-N.md
    │   └── execution-log.md
    └── archive/                     # Completed plans
        └── {plan-name}-{YYYYMMDD}/
```

**Plan Management:**
- Each plan has its own directory with plan.md and execution-log.md
- Implementation details split into separate files per phase (prevents large files)
- README.md tracks metadata for all plans (status, progress, timestamps)
- Commands accept plan name as argument or auto-select most recently updated plan
- Plans can be archived when complete or manually archived if abandoned
- Archive preserves full plan history with completion/archive date

**Plan Selection Strategy:**
- Commands like `/go` and `/bg` auto-select the most recently updated plan
- Commands like `/done` and `/delete` prompt for selection when multiple plans exist
- All commands accept optional plan name argument for direct specification

**Execution Modes:**

1. **Interactive Execution** (`/go plan-name`):
   - Step-by-step execution with user control
   - Configurable breakpoints (NONE, PHASE, SPECIFIC PHASE)
   - User reviews progress at breakpoints
   - Reads implementation files for detailed specs
   - Ideal for complex or high-risk changes

2. **Background Execution** (`/bg plan-name`):
   - Uses Claude Code's Task tool to spawn autonomous agent
   - Agent executes plan independently while user continues other work
   - Real-time progress updates in plan.md and README.md
   - Execution log in .codevoyant/plans/{plan-name}/execution-log.md
   - Agent reads implementation files for detailed execution specs
   - Automatic pause on errors
   - Monitoring via `/status`, control via `/stop`
   - Ideal for long-running or routine tasks

**Command Updates:**
All spec commands now support plan name arguments:
- `/go <plan-name>` - Execute specific plan
- `/status <plan-name>` - Show specific plan status
- `/status` - Show all plans overview
- `/list` - List all active and archived plans
- `/archive <plan-name>` - Archive incomplete plan
- `/delete <plan-name>` - Permanently delete plan
- `/rename <old-name> <new-name>` - Rename plan

### Versioning Strategy

- Semantic versioning via conventional commits
- Automated releases through GitHub Actions
- Version synchronization across `version.txt` and `plugin.json`
- Changelog generation from commit history

### Testing Approach

- Structure validation in CI
- Plugin.json schema validation
- Marketplace.json verification
- Manual testing for command workflows

## Distribution

### Marketplace

Plugins are distributed via Claude Code marketplace:

```bash
# Add marketplace
/plugin marketplace add codevoyant/codevoyant

# Install individual plugins
/plugin install adr
/plugin install dev
/plugin install spec
```

### Local Development

For development and testing:

```bash
# Add local marketplace
/plugin marketplace add /path/to/codevoyant

# Install plugins from local source
/plugin install adr
/plugin install dev
/plugin install spec
```

## Dependencies

Development dependencies (not required for users):

- just - Command runner for automation tasks
- semantic-release - Automated versioning and releases
- Node.js - Required for semantic-release
- Git - Version control and repository management

## Extension Points

Plugins already support custom agents (see `plugins/*/agents/`), hooks for lifecycle events (see `plugins/*/hooks/`), and skills for agent capabilities. MCP server integration is a possible future addition.
