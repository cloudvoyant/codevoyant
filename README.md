# Claudevoyant

> Professional workflow plugins for AI coding agents

A curated collection of plugins that streamline development workflows, organized
into four specialized plugins. Works with Claude Code, OpenCode, and VS Code Copilot.

- adr - Architecture Decision Records
- dev - Development workflow (docs, review, commits, diff)
- spec - Specification-driven development (planning, upgrading)

## Features

### ADR Plugin

- `/new` - Create Architecture Decision Records
- `/capture` - Capture decisions from conversations

### Dev Plugin

- `/docs` - Generate and update project documentation
- `/review` - Code review workflows
- `/commit` - Conventional commit messages with best practices
- `/diff` - Compare current repository with another repository
- `/actions` - Monitor GitHub Actions workflows and verify CI passes

### Spec Plugin

- `/new` - Create a new plan by exploring requirements
- `/init` - Initialize an empty plan template
- `/go` - Execute or continue the existing plan
- `/bg` - Execute plan in background with autonomous agent
- `/status` - Check progress of background execution
- `/stop` - Stop background execution gracefully
- `/refresh` - Review and update plan checklist status
- `/pause` - Capture insights summary from planning
- `/done` - Mark plan as complete and optionally commit
- `/upgrade` - Template upgrade workflow for projects

## Installation

### Claude Code

```bash
/plugin marketplace add codevoyant/codevoyant
/plugin install adr
/plugin install dev
/plugin install spec
/plugin install style
```

To install a specific version: `/plugin marketplace add codevoyant/codevoyant@v1.0.3`

To update: `claude plugin marketplace update codevoyant`

### OpenCode

```bash
curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-opencode.sh | bash
```

> If you already have codevoyant installed for Claude Code, OpenCode picks up skills automatically from `.claude/skills/` — no separate install needed.

### VS Code Copilot

```bash
curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-vscode.sh | bash
```

Restart VS Code after installing. Skills appear in the Copilot Chat `/` command menu as `/spec-new`, `/spec-go`, etc.

## Usage

After installation, commands are available globally. Note that command names are
scoped to their plugin:

```bash
# ADR plugin commands (from codevoyant-adr)
/new       # Create a new ADR
/capture   # Capture decision from conversation

# Dev plugin commands (from codevoyant-dev)
/commit    # Create professional commits
/docs      # Generate documentation
/review    # Perform code review
/diff      # Compare repositories
/actions   # Monitor GitHub Actions CI

# Spec plugin commands (from codevoyant-spec)
/new       # Create a new plan
/init      # Initialize empty plan template
/go        # Execute the plan interactively
/bg        # Execute plan in background
/status    # Check background execution progress
/stop      # Stop background execution
/refresh   # Update plan status
/pause     # Capture insights
/done      # Mark plan complete
/upgrade   # Upgrade template
```

Note: Since `/new` exists in both ADR and Spec plugins, Claude will ask
which one you mean when you use it. You can be explicit by saying "create a new
ADR" or "create a new plan".

Run `/help` to see all available commands.

## Commands

### ADR Plugin Commands

- `/new` - Create a new Architecture Decision Record
- `/capture` - Extract decision from conversation into ADR

### Dev Plugin Commands

- `/commit` - Create professional conventional commits
- `/docs` - Generate or update project documentation
- `/review` - Perform structured code review
- `/diff` - Compare current repository with another repository
- `/actions` - Monitor GitHub Actions workflows and verify CI passes

### Spec Plugin Commands

- `/new` - Create a structured implementation plan
- `/init` - Initialize an empty plan template
- `/go` - Execute an existing plan step-by-step
- `/bg` - Execute plan in background with autonomous agent
- `/status` - Check progress of background execution
- `/stop` - Stop background execution gracefully
- `/refresh` - Update plan status and checkboxes
- `/pause` - Pause planning with insights summary
- `/done` - Complete plan and optionally commit changes
- `/upgrade` - Upgrade project to newer template version

## Development

### Repository Structure

This is a monorepo containing three independent plugins:

- `plugins/adr/` - Architecture Decision Records plugin
- `plugins/dev/` - Development workflow plugin
- `plugins/spec/` - Specification-driven development plugin

See [docs/architecture.md](docs/architecture.md) for detailed architecture and
design documentation.

## Versioning

This plugin follows [semantic versioning](https://semver.org/). Version numbers
are automatically managed through conventional commits and semantic-release.

## Inspirations

- [chatgpt-skills](https://github.com/dkyazzentwatwa/chatgpt-skills/tree/main)
- [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills?tab=readme-ov-file)
- [superpowers](https://github.com/obra/superpowers)

## License

MIT © Cloudvoyant
