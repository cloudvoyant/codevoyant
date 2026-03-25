<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/utils.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# Git

Git version control commands — conventional commits, CI monitoring, and interactive rebase.

The Git skills handle the mechanical parts of the commit loop: writing good commit messages, monitoring CI pipelines, and rebasing safely onto updated base branches.

## Installation

**Claude Code:**
```bash
npx skills add cloudvoyant/codevoyant
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflows

### Commit and push

Use `/git commit` frequently — small, focused commits with clear messages are easier to review, revert, and understand in history.

```bash
# Stage your changes, then:
/git commit
# Review the generated message
# Approve to create the commit and push
# /git ci runs automatically in background after push
```

### Before opening a PR

```bash
/git commit
/dev pr-fix     # if there are open review comments
```

### Rebase onto an updated base branch

```bash
/git rebase main
```

## Skills

### Conventional Commits

Write conventional commit messages:

```bash
/git commit
/git commit --atomic    # Split logical change groups into separate commits
/git commit --yes       # Skip confirmation, auto-approve message
/git commit --no-push   # Commit only, do not push or monitor CI
/git commit --autofix   # If CI fails after push, automatically fix and re-push
```

What happens:
1. Runs formatters and linters before staging (auto-fixes are included in the commit)
2. Analyzes your staged and unstaged changes
3. Generates a conventional commit message (`feat:`, `fix:`, `chore:`, etc.)
4. Shows the message for review — you can approve, edit, or cancel
5. Creates the commit, pushes, and launches CI monitoring in the background

Follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Flags:**
- `--atomic` — detect logical change groups and create one commit per group
- `--single` — all staged changes in one commit (default)
- `--yes` / `-y` — skip confirmation and auto-approve the message
- `--no-push` — commit only, do not push or monitor CI
- `--autofix` — if CI fails after push, automatically fix and re-push

### CI Monitor

Monitor CI/CD workflows and verify status after a push:

```bash
/git ci
/git ci --wait       # Block until CI completes
/git ci --autofix    # Automatically fix failures and re-push (up to 2 attempts)
/git ci --silent     # Suppress desktop notification
```

Works with both **GitHub Actions** and **GitLab CI** — provider is auto-detected from the remote URL. Runs in the **background by default** so you can keep working. A desktop notification fires when checks complete or fail.

### Safe Rebase

Safely rebase the current branch onto an updated base branch:

```bash
/git rebase
/git rebase main
/git rebase main --push
```

Uses a pre-rebase intent snapshot to resolve conflicts correctly, preventing the silent change loss that happens with naive rebasing.

**How it works:**
1. **Intent snapshot** — captures your branch's full diff, file list, and commit log before touching git
2. **Confirmation dialog** — shows branch summary and rebase target before proceeding
3. **Conflict resolution** — handles the counter-intuitive `HEAD` = base branch behavior during rebase
4. **Post-rebase verification** — checks for silently dropped files, runs formatters and tests
5. **Push safety** — uses `--force-with-lease` (not `--force`) to avoid overwriting concurrent remote changes

### List All Commands

```bash
/git help           # List all git commands with descriptions
/git help ci        # Show full details for a specific command
```
