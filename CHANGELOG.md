## [1.13.1](https://github.com/codevoyant/codevoyant/compare/v1.13.0...v1.13.1) (2026-03-15)

### Bug Fixes

* correct hero image paths (remove duplicate base prefix)

## [1.13.0](https://github.com/codevoyant/codevoyant/compare/v1.12.2...v1.13.0) (2026-03-15)

### Features

* add light/dark favicons and logo, add just favicons recipe

## [1.12.2](https://github.com/codevoyant/codevoyant/compare/v1.12.1...v1.12.2) (2026-03-15)

### Bug Fixes

* remove invalid hooks path from plugin manifests

## [1.12.1](https://github.com/codevoyant/codevoyant/compare/v1.12.0...v1.12.1) (2026-03-14)

### Bug Fixes

* set base path for GitHub Pages deployment

## [1.12.0](https://github.com/codevoyant/codevoyant/compare/v1.11.2...v1.12.0) (2026-03-14)

### Features

* add docs site and migrate plugins to skills/hooks architecture

- Replace commands with skills, hooks, and agents across all plugins
- Add VitePress documentation site with plugin reference pages
- Split user guide into Installation and User Guide pages
- Add GitHub Actions workflow for docs deployment

## [1.11.2](https://github.com/codevoyant/codevoyant/compare/v1.11.1...v1.11.2) (2026-02-23)

### Bug Fixes

* **dev:rebase:** use git add -f for gitignored conflicted files

During rebase, conflicts in gitignored files (e.g. .spec/) cannot be
staged with plain `git add`, making --continue impossible. The previous
workaround of using --skip silently drops the entire commit.

Now checks git check-ignore before staging; gitignored files use
git add -f so --continue works correctly. Also adds an explicit 4d
rule prohibiting --skip during conflict resolution.

## [1.11.1](https://github.com/codevoyant/codevoyant/compare/v1.11.0...v1.11.1) (2026-02-22)

### Bug Fixes

* disable commits by default in bg agent, add --commit flag

The background agent was committing during execution without explicit
user consent. Commits are now disabled by default. Pass --commit or
-c to opt in to agent-driven commits.

## [1.11.0](https://github.com/codevoyant/codevoyant/compare/v1.10.0...v1.11.0) (2026-02-22)

### Features

* add rebase and export commands, fix worktree paths, add format/lint to commit

- Add dev:rebase — intent-snapshot-driven rebase with conflict resolution,
  format/lint/test verification, and --push flag for CI monitoring
- Add spec:export — copy worktree plan to main repo .spec/plans/
- Fix spec:new hardcoded .spec/plans/ paths that ignored $PLAN_DIR in
  worktree context (steps 5.4, 5.5, 5.6)
- Add format/lint step to dev:commit (Step 1.5) before staging
- Add format/lint/test checks to dev:rebase verification (Step 5)

## [1.10.0](https://github.com/codevoyant/codevoyant/compare/v1.9.0...v1.10.0) (2026-02-22)

### Features

* rename style plugin and add spec:update and style:review commands

- Rename styleguide plugin to style across all config, command files,
  and marketplace registrations
- Add spec:update command: processes @change(...) annotations inline
  in plan files without requiring flags
- Add style:review command: parallel background agents per section
  write structured REVIEW.md for follow-up agent consumption
- Add spec:new Step 5.6: iterative validation loop (min 2 rounds)
  with auto-fix using background agents
- Fix dev:commit: push and monitor CI automatically; add --no-push flag

## [1.9.0](https://github.com/codevoyant/codevoyant/compare/v1.8.0...v1.9.0) (2026-02-19)

### Features

* create plans inside worktree for complete isolation

When using --branch flag, plan now lives in the worktree:
- Before: .spec/plans/my-plan/ (main repo)
- After: .worktrees/branch/.spec/plans/my-plan/ (in worktree)

Benefits:
- Complete isolation - everything for feature in one place
- cd to worktree and run /spec:bg directly
- Delete worktree = delete plan (clean)
- Clearer context - you're IN the feature directory

Workflow:
1. /spec:new my-feature --branch feature-x
2. cd .worktrees/feature-x/
3. /spec:bg my-feature (works! plan is here)
4. Make changes, all isolated

Plans without worktrees still go in main repo as before.

## [1.8.0](https://github.com/codevoyant/codevoyant/compare/v1.7.1...v1.8.0) (2026-02-18)

### Features

* add --yes flag to skip confirmations in commands

Add --yes/-y flag support for non-interactive execution:

/dev:commit --yes:
- Skip commit message approval
- Auto-push and verify CI
- Perfect for CI/CD and scripts

/spec:bg --yes:
- Auto-create missing worktree
- Skip execution confirmation
- Start immediately

This enables fully automated workflows without manual confirmation steps.

## [1.7.1](https://github.com/codevoyant/codevoyant/compare/v1.7.0...v1.7.1) (2026-02-13)

### Bug Fixes

* prevent bg agent from asking questions mid-execution

Background agents should execute ALL phases autonomously without
asking for permission to continue. Added explicit instructions to:
- Never ask "Should I continue?" or "Want me to proceed?"
- Automatically move between phases
- Only stop on actual errors, not for user approval

This fixes agents stopping after each phase and asking if user
wants to continue.

## [1.7.0](https://github.com/codevoyant/codevoyant/compare/v1.6.1...v1.7.0) (2026-02-13)

### Features

* auto-handle worktrees in spec execution commands

Seamless worktree workflow:
- Automatically execute in worktree if it exists (no manual cd)
- Offer to create worktree if missing (one-step setup)
- Handle all cases: exists, missing, or not needed

Changes:
- /spec:bg and /spec:go now detect worktree from plan metadata
- If worktree exists, automatically cd and execute there
- If worktree specified but missing, prompt to create it
- Agent executes with correct directory context
- No more manual "cd .worktrees/branch && /spec:bg" steps

This makes worktree-based development fully automatic.

## [1.6.1](https://github.com/codevoyant/codevoyant/compare/v1.6.0...v1.6.1) (2026-02-13)

### Bug Fixes

* remove redundant questions from commit CI monitoring

Automatically monitor CI after push without asking additional questions.
User gets one prompt (push + verify?) then monitoring happens automatically.

Before: Ask to push → ask to monitor → monitor
After: Ask to push → automatically monitor

Reduces friction and makes workflow faster.

## [1.6.0](https://github.com/codevoyant/codevoyant/compare/v1.5.0...v1.6.0) (2026-02-13)

### Features

* optimize commit command and add automatic CI verification

Speed improvements:
- Use conversation context instead of re-reading git logs
- Skip redundant file reads when context is available
- Eliminate unnecessary git log lookups

New functionality:
- Automatically offer to push and verify CI after commit
- Monitor GitHub Actions workflows to ensure changes pass
- Only declare work complete after CI validates changes
- Gracefully handle repos without CI or gh CLI

This addresses the issue where Claude declares work "done" without
verifying that tests, builds, and other automated checks actually pass.

## [1.5.0](https://github.com/codevoyant/codevoyant/compare/v1.4.2...v1.5.0) (2026-02-12)

### Features

* add GitHub Actions monitoring skill to dev plugin

Add /dev:actions command that monitors CI/CD workflows to verify
changes pass automated checks. Prevents declaring work "done" when
tests, builds, or other workflows are failing.

Features:
- Check status of recent workflow runs
- Wait for in-progress workflows to complete
- Display pass/fail status with timing
- Fetch and show error logs on failure
- Offer to help fix issues when workflows fail

## [1.4.2](https://github.com/codevoyant/codevoyant/compare/v1.4.1...v1.4.2) (2026-02-12)

### Bug Fixes

* remove invalid commands field from styleguide plugin manifest

Commands are auto-discovered from the commands/ directory and should
not be declared in plugin.json. This was causing validation errors
during plugin installation.

## [1.4.1](https://github.com/codevoyant/codevoyant/compare/v1.4.0...v1.4.1) (2026-02-12)

### Bug Fixes

* move styleguide plugin to correct structure for marketplace

Moves plugin.json to .claude-plugin/ subdirectory and adds styleguide
to marketplace index. Plugin was not discoverable due to incorrect
file structure.

## [1.4.0](https://github.com/codevoyant/codevoyant/compare/v1.3.0...v1.4.0) (2026-02-12)

### Features

* add styleguide plugin with contextual loading and auto-learning

Introduces intelligent style guide management that learns from user
corrections and loads rules contextually to minimize token usage.

Key features:
- Contextual rule loading (74% token savings)
- Automatic pattern learning from corrections
- Team-wide CLAUDE.md for shared conventions
- Validation and auto-fix capabilities
- Pattern extraction from existing codebase
- Token optimization strategies

Commands:
- /styleguide:init - Initialize CLAUDE.md with context tags
- /styleguide:add - Add rules manually with contexts
- /styleguide:learn - Auto-learn from work patterns
- /styleguide:validate - Check compliance
- /styleguide:extract - Discover existing patterns
- /styleguide:optimize - Reduce token usage
- /styleguide:contexts - Manage context system

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

## [1.3.0](https://github.com/codevoyant/codevoyant/compare/v1.2.0...v1.3.0) (2026-02-12)

### Features

* add implementation validation and worktree support to spec plugin

Enhances spec plugin with upfront implementation file validation and
git worktree integration for branch-based plan isolation.

Key improvements:
- Require all phase implementation files created before execution
- Validate files exist and meet size requirements pre-execution
- Add --branch flag to auto-create worktrees for plan isolation
- Track branch/worktree metadata in plan files
- Add branch validation to all execution commands
- Introduce /spec:worktree command for manual worktree management
- Migrate from .claude/plan.md to .spec/plans/{plan-name}/ structure
- Support multiple concurrent plans with independent contexts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

## [1.2.0](https://github.com/codevoyant/codevoyant/compare/v1.1.2...v1.2.0) (2025-11-17)

### Features

* add background execution commands to spec plugin

Adds /bg, /status, and /stop commands enabling autonomous plan execution
using Claude Code's agent system. Users can now start background execution,
monitor progress, and control execution while continuing other work.

Also removes markdown linting configs and updates documentation.

## [1.1.2](https://github.com/codevoyant/codevoyant/compare/v1.1.1...v1.1.2) (2025-11-17)

### Bug Fixes

* docs updated

* updated semantic release config based on new dir structure


### Code Refactoring

* move plugins into plugins directory

Restructures repository to match Anthropic's official marketplace
layout with all plugins under a single plugins/ parent directory.
Updates marketplace.json source paths accordingly.

## [1.1.1](https://github.com/codevoyant/codevoyant/compare/v1.1.0...v1.1.1) (2025-11-16)

### Bug Fixes

* use relative paths in marketplace.json for monorepo structure

Changes plugin sources from GitHub object format to relative paths,
following Anthropic's recommended pattern for monorepo marketplaces.
Also corrects outdated plugin name in README installation example.

## [1.1.0](https://github.com/codevoyant/codevoyant/compare/v1.0.3...v1.1.0) (2025-11-16)

### Features

* restructure into three plugins and add repository diff command

Splits monolithic plugin into specialized plugins:
- codevoyant-adr: Architecture Decision Records
- codevoyant-dev: Development workflows (docs, review, commits, diff)
- codevoyant-spec: Specification-driven development

Adds new /diff command to compare repositories and generate
comprehensive diff reports with insights and analysis.

Updates marketplace.json to reference three separate plugins
with individual paths and descriptions.


### Bug Fixes

* remove codevoyant prefix from plugin names

Fixes plugin installation by ensuring plugin names match between
marketplace.json and individual plugin.json files. Removes the
obsolete root plugin.json as the repository now contains three
separate plugins (adr, dev, spec).

* update semantic-release config for multi-plugin structure

Updates semantic-release to handle three separate plugins (adr, dev, spec)
instead of single root plugin. Simplifies commit command documentation
by removing redundant verification steps.


### Documentation

* improve installation instructions with CLI commands and version-specific installation

## [1.0.3](https://github.com/codevoyant/codevoyant/compare/v1.0.2...v1.0.3) (2025-11-16)

### Bug Fixes

* modifying plugin.json to use https with git repos

## [1.0.2](https://github.com/codevoyant/codevoyant/compare/v1.0.1...v1.0.2) (2025-11-16)

### Bug Fixes

* correct marketplace.json

* correct marketplace.json source

  format for GitHub

## [1.0.1](https://github.com/codevoyant/codevoyant/compare/v1.0.0...v1.0.1) (2025-11-16)

### Bug Fixes

* owner field must be an object in marketplace.json

## 1.0.0 (2025-11-16)

### Features

* initialize codevoyant plugin

Create Claude Code plugin with professional workflow commands:
- Planning workflow (/plan)
- Conventional commits (/commit)
- Template upgrades (/upgrade, /adapt)
- Documentation (/docs, /adr-new, /adr-capture)
- Code review (/review)

Infrastructure:
- Semantic versioning with semantic-release
- CI/CD with GitHub Actions
- BATS testing framework
- Comprehensive documentation


### Bug Fixes

* correct marketplace.json schema

Add required name and owner fields, fix source path format


### Code Refactoring

* remove unnecessary environment and script dependencies

- Remove .envrc files (not needed for plugin)
- Remove scripts directory (use semantic-release directly)
- Simplify justfile to not require direnv
- Update release workflow to use npx semantic-release
