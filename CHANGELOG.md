## [1.21.0](https://github.com/cloudvoyant/codevoyant/compare/v1.20.1...v1.21.0) (2026-03-18)

### Features

* add help skills, open exploration, and bg flags to spec skills

- Add help skill to spec, dev, style, adr plugins (discovers siblings
  dynamically via $SKILL_DIR, reads plugin.json for header)
- Rewrite spec:new Step 4.3: open-ended free-text exploration offer,
  parallel proposal generation with file verification, post-gen
  selection not limited to generated proposals
- Fix spec:new user-guide generation: mark REQUIRED, add blocking
  validation in Step 5.5 that includes plan.md and user-guide.md
- Add --bg/--silent flags to spec:go, spec:refresh, spec:update with
  desktop notification on completion
- Expand dev:allow shared baseline to include Read, Glob, Grep
- Update .gitignore: .codevoyant replaces legacy .spec/plans patterns


### Documentation

* add adr plugin, help command, and --bg flag to README

- Add adr plugin to plugins table (was missing)
- Update spec description to mention --bg flag
- Add /plugin:help examples to quick start
- Fix spec:bg → spec:go --bg in quick start

* sync plugin docs with current skill state

spec.md:
- Update background workflow to show spec:go --bg alongside spec:bg
- Rewrite architecture exploration description for open-ended flow
- Add --bg/--silent flags to spec:go, spec:refresh, spec:update
- Document spec:help command

dev.md:
- Add dev:allow section (was entirely missing)
- Add dev:help command

README.md:
- Remove adr plugin from plugins table (not publicly listed yet)

## [1.20.1](https://github.com/cloudvoyant/codevoyant/compare/v1.20.0...v1.20.1) (2026-03-16)

### Bug Fixes

* add style plugin to release pipeline and fix stale org refs

- style/plugin.json was stuck at 1.0.0 and excluded from the release
  prepareCmd and git assets, so users never received path updates
- Corrects codevoyant → cloudvoyant org in style README and metadata
- Fixes commit skill to display full message before confirmation


### Documentation

* remove adr from readme plugin table and install commands

* rewrite README with logo, plugin overview, and docs links

* update README tagline

## [1.20.0](https://github.com/cloudvoyant/codevoyant/compare/v1.19.0...v1.20.0) (2026-03-16)

### Features

* **dev:** add dev:allow skill for autonomous execution permissions

Generates and applies permission configs for Claude Code, OpenCode, and
VS Code Copilot. Plugin-scoped via --plugins flag with interactive
selection fallback. Includes explicit git push confirmation, Write/Edit
pre-approval for .codevoyant/, and Bash(git commit -m:*) entries to
prevent $() substitution prompts during automated commits.

* **spec:** add spec-explorer agent for parallel proposal generation

Introduces spec-explorer with four modes (write, update, bulk-update,
synthesize) to replace anonymous Task agents in spec:new. Proposals
are now generated and updated in parallel with a consistent persona.
Adds return-to-proposals path when planning reveals a problem.

## [1.19.0](https://github.com/cloudvoyant/codevoyant/compare/v1.18.1...v1.19.0) (2026-03-16)

### Features

* add agent installation to OpenCode/VS Code install scripts + fix GitHub org

- install-opencode.sh: copy agent .md files to ~/.config/opencode/agents/,
  inject name: frontmatter if absent
- install-vscode.sh: copy agent files as .agent.md to .github/agents/ in
  current git workspace; skip gracefully if not in a git repo
- Fix GitHub org codevoyant → cloudvoyant across all docs and install scripts
- Add compatibility note to bg/SKILL.md and new/SKILL.md explaining that
  agent: and context: fork fields are Claude Code-specific and run inline
  on OpenCode and VS Code Copilot

## [1.18.1](https://github.com/cloudvoyant/codevoyant/compare/v1.18.0...v1.18.1) (2026-03-15)

### Bug Fixes

* **docs:** correct GitHub org from codevoyant to cloudvoyant

## [1.18.0](https://github.com/cloudvoyant/codevoyant/compare/v1.17.0...v1.18.0) (2026-03-15)

### Features

* **spec:** replace README.md plan tracker with spec.json

Migrate plan metadata from a markdown README to a structured JSON
file at .codevoyant/spec.json with activePlans and archivedPlans
arrays. All skills updated to read/write JSON instead of markdown.


### Documentation

* remove AI-specific language and fix style file structure

Replace generic "Claude" references with "the AI" or passive voice.
Fix style plugin file structure to match what /style:init actually
generates (no docs/style-guide/ directory).

## [1.17.0](https://github.com/cloudvoyant/codevoyant/compare/v1.16.0...v1.17.0) (2026-03-15)

### Features

* **spec:** prompt for plan selection when multiple plans exist + add spec triggers

- Replace silent auto-select with AskUserQuestion prompt when multiple
  plans exist in go, bg, stop, refresh, update, done skills
- Add plan-selection Step 0 to delete and rename skills (previously
  required argument only)
- Add "spec out / spec this / speccing" trigger keywords to new skill
- Add "spec go / run the spec" triggers to go skill
- Add "spec bg / spec background" triggers to bg skill

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>


### Bug Fixes

* **docs:** replace .spec/plans/ and .worktrees/ paths with .codevoyant/ equivalents

Update architecture.md and user-guide.md to reflect the renamed directory
structure, replacing legacy `.spec/plans/` references with `.codevoyant/plans/`.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

* **docs:** update migration-guide paths from .spec/plans/ to .codevoyant/plans/

Replace all occurrences of `.spec/plans/` with `.codevoyant/plans/` and
`.spec/` directory reference with `.codevoyant/` in the migration guide
to reflect the project rename.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

* **docs:** update style plugin config path to .codevoyant/style.json

Move style.json to .codevoyant/ level in the file structure diagram
and remove the incorrect .codevoyant/style/config.json path.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>


### Documentation

* **dev:** expand Safe Rebase section with full flow documentation

Add how-it-works steps covering intent snapshot, confirmation dialog,
conflict resolution logic, post-rebase verification, and push safety.
Also document the rebasing-main shortcut and available flags.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

* **spec:** fix stale paths, expand planning flow and UX documentation

- Replace all .spec/plans/ and .worktrees/ references with .codevoyant/ equivalents (6 occurrences)
- Expand /spec:new section with research phase, worktree prompt, and final review descriptions
- Add inline annotations subsection under /spec:go with syntax reference and examples
- Add plan-selection note to Best Practices

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

## [1.16.0](https://github.com/cloudvoyant/codevoyant/compare/v1.15.2...v1.16.0) (2026-03-15)

### Features

* centralize plugin artifacts under .codevoyant + flatten configs

Migrate all spec and style plugin artifact paths to a unified
.codevoyant/ layout for discoverability and gitignore hygiene.

Changes:
- Spec plugin: .spec/plans/ → .codevoyant/plans/ (all 12 skill files,
  hooks.json regex, agents, scripts, templates, pr-body-template)
- Spec plugin: .worktrees/ → .codevoyant/worktrees/ (worktree skill,
  create-worktree-steps.md, list display examples)
- Style plugin: .codevoyant/style/config.json → .codevoyant/style.json
  (all 6 skill files + README.md); doctor skill auto-migrates old path
- New: spec:doctor skill — auto-detects and migrates legacy paths
- New: migration.md reference doc — manual migration steps
- Improved: proposal-template.md with directory structure section,
  flow diagram guidance, references section, and refinement syntax note

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

## [1.15.2](https://github.com/cloudvoyant/codevoyant/compare/v1.15.1...v1.15.2) (2026-03-15)

### Bug Fixes

* **docs:** use withBase composable for plugin icon paths

## [1.15.1](https://github.com/cloudvoyant/codevoyant/compare/v1.15.0...v1.15.1) (2026-03-15)

### Bug Fixes

* **docs:** use $withBase for plugin icon paths to fix build

## [1.15.0](https://github.com/cloudvoyant/codevoyant/compare/v1.14.0...v1.15.0) (2026-03-15)

### Features

* rename project to codevoyant, add custom plugin icons

Renames all claudevoyant/cloudvoyant references to codevoyant,
adds SVG icons for spec/dev/style plugins, updates brand colors
and hero responsive styles, and adds plugin icons to doc pages.

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
