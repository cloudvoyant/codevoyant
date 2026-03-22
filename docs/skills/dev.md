<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/dev.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# Dev

Development workflow commands -- commits, CI monitoring, rebasing, architecture docs, and technical exploration.

The Dev skills streamline the day-to-day mechanics of software development: writing good commits, monitoring CI, comparing repositories, resolving PR comments, rebasing safely, exploring technical approaches, and generating architecture documentation.

## Installation

**Claude Code:**
```bash
npx skills add cloudvoyant/codevoyant
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflows

### Commit Workflow

Use `/dev:commit` frequently -- small, focused commits with clear messages are easier to review, revert, and understand in history.

```bash
# Stage your changes, then:
/dev:commit
# Review the generated message
# Approve to create the commit and push
# /dev:ci runs automatically in background after push
```

### Before Opening a PR

```bash
/dev:commit
/dev:pr-fix     # if there are open review comments
```

### Tracking Template Drift

If your project was bootstrapped from a template, use `/dev:diff` periodically to see how you've diverged:

```bash
/dev:diff https://github.com/org/template-repo
# Review .claude/diff.md for structural differences
```

### Architecture Documentation

```bash
/dev:docs                                   # Generate docs/architecture/ from codebase scan
/dev:plan "authentication system"           # Draft architecture plan to .codevoyant/plans/
/dev:plan "auth" --mode arch                # Architecture plan with task breakdown + LOE
/dev:approve                                # Promote draft plan to docs/architecture/
/dev:approve my-plan --push                 # Promote and create Linear tasks
```

### Technical Research

```bash
/dev:explore "caching strategy"    # Research approaches, generate parallel proposals
```

## Skills

### Conventional Commits

Write conventional commit messages:

```bash
/dev:commit
/dev:commit --atomic    # Split logical change groups into separate commits
/dev:commit --yes       # Skip confirmation, auto-approve message
/dev:commit --no-push   # Commit only, do not push or monitor CI
/dev:commit --autofix   # If CI fails after push, automatically fix and re-push
```

What happens:
1. Runs formatters and linters before staging (auto-fixes are included in the commit)
2. Analyzes your staged and unstaged changes
3. Generates a conventional commit message (`feat:`, `fix:`, `chore:`, etc.)
4. Shows the message for review -- you can approve, edit, or cancel
5. Creates the commit, pushes, and launches CI monitoring in the background

Follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Flags:**
- `--atomic` -- detect logical change groups and create one commit per group
- `--single` -- all staged changes in one commit (default)
- `--yes` / `-y` -- skip confirmation and auto-approve the message
- `--no-push` -- commit only, do not push or monitor CI
- `--autofix` -- if CI fails after push, automatically fix and re-push

### CI Monitor

Monitor CI/CD workflows and verify status after a push:

```bash
/dev:ci
/dev:ci --wait       # Block until CI completes
/dev:ci --autofix    # Automatically fix failures and re-push (up to 2 attempts)
/dev:ci --silent     # Suppress desktop notification
```

Works with both **GitHub Actions** and **GitLab CI** -- provider is auto-detected from the remote URL. Runs in the **background by default** so you can keep working. A desktop notification fires when checks complete or fail.

### Repository Comparison

Compare your current repository with another:

```bash
/dev:diff <repository-url>
```

The command will:
1. Ask for your comparison objective
2. Clone the target repository to a temp directory
3. Analyze structural similarities and differences
4. Generate a comprehensive diff report at `.claude/diff.md`
5. Clean up temporary files

**Use cases:**
- Track how your project has diverged from a template or upstream fork
- Compare architectures between similar codebases
- Analyze migration differences between versions

### Fix PR Review Comments

Fetch open PR/MR review comments and propose fixes:

```bash
/dev:pr-fix [pr-id]
/dev:pr-fix [pr-id] --github    # Force GitHub provider
/dev:pr-fix [pr-id] --gitlab    # Force GitLab provider
/dev:pr-fix --silent             # Suppress desktop notification
```

Works with GitHub and GitLab. For each PR/MR with unresolved review comments, creates `.codevoyant/pr-fix/{pr-id}.md` containing the review threads and a "Proposed Fixes" section written by a background agent. Proposals are written to the document only -- **not applied to code** -- so you review them before deciding what to apply.

### Safe Rebase

Safely rebase the current branch onto an updated base branch:

```bash
/dev:rebase
/dev:rebase main
/dev:rebase main --push
```

Uses a pre-rebase intent snapshot to resolve conflicts correctly, preventing the silent change loss that happens with naive rebasing.

**How it works:**
1. **Intent snapshot** -- captures your branch's full diff, file list, and commit log before touching git
2. **Confirmation dialog** -- shows branch summary and rebase target before proceeding
3. **Conflict resolution** -- handles the counter-intuitive `HEAD` = base branch behavior during rebase
4. **Post-rebase verification** -- checks for silently dropped files, runs formatters and tests
5. **Push safety** -- uses `--force-with-lease` (not `--force`) to avoid overwriting concurrent remote changes

### Technical Exploration

Research a technical problem before building:

```bash
/dev:explore "caching strategy"
/dev:explore "auth approaches" --aspects
```

Runs parallel proposal generation via subagents. Output lives in `.codevoyant/explore/{name}/` so it can feed into `/spec:new` later.

### Architecture Documentation

Generate or update architecture documentation from a codebase scan:

```bash
/dev:docs                  # Generate docs/architecture/ from codebase
/dev:docs --bg             # Run in background, notify when done
```

Produces component maps, data flow diagrams, API inventories, and dependency graphs.

### Architecture Planning

Plan architecture for a project or feature:

```bash
/dev:plan "authentication system"          # Feature design doc (--mode feat)
/dev:plan "auth" --mode arch               # Architecture plan with task breakdown + LOE
/dev:plan "auth" --mode arch --bg          # Run in background
```

Writes a draft plan to `.codevoyant/plans/{slug}/plan.md`. For architecture-level plans (`--mode arch`), the plan includes a **Task Breakdown** — each task has a LOE estimate, blocking relationships, and acceptance criteria rich enough for autonomous implementation via `/spec:new` and `/spec:bg`.

Use `/dev:approve` to promote the plan to `docs/architecture/`.

**Flags:**
- `--mode arch` — architecture-level plan: produces task breakdown with LOE and dependency graph
- `--mode feat` — feature design doc only (no task breakdown)
- If `--mode` is omitted, the skill asks interactively

### Architecture Approve

Promote a draft architecture plan to `docs/architecture/` and optionally create Linear tasks:

```bash
/dev:approve                                    # Approve most recent dev:plan draft
/dev:approve my-plan                            # Approve specific plan by slug
/dev:approve my-plan --push                     # Approve and create new Linear project + tasks
/dev:approve my-plan --push https://linear.app/...  # Approve and push to existing Linear project
/dev:approve my-plan --silent                   # Suppress notification
```

Each Linear task created includes: the relevant architecture doc section, scope, key constraints, and verifiable acceptance criteria — enough context for `/spec:new` + `/spec:bg` to execute autonomously.

### Pre-approve Agent Permissions

```bash
/dev:allow           # Write dev permissions to project .claude/settings.json
/dev:allow --global  # Write to ~/.claude/settings.json
```

Adds the allow entries needed for `/dev:commit` and `/dev:ci` to run without permission prompts -- git operations (including push), GitHub/GitLab CLI, desktop notifications, and the project's task runner.

### List All Commands

```bash
/dev:help                   # List all dev commands with descriptions
/dev:help ci                # Show full details for a specific command
```
