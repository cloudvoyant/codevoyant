<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/dev.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# Dev Plugin

Development workflow commands — commits, review, diffing, and CI monitoring.

The dev plugin streamlines the day-to-day mechanics of software development: writing good commits, reviewing code systematically, comparing repositories, and keeping an eye on CI.

## Installation

**Claude Code:**
```bash
/plugin marketplace add codevoyant/codevoyant
/plugin install dev
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflows

### Commit Workflow

Use `/dev:commit` frequently — small, focused commits with clear messages are easier to review, revert, and understand in history.

```bash
# Stage your changes, then:
/dev:commit
# Review the generated message
# Approve to create the commit and push
# /dev:ci runs automatically in background after push
```

### Review Before PR

Run `/dev:review` before opening a pull request to catch issues early:

```bash
/dev:review
# Address any flagged issues
/dev:commit
```

### Tracking Template Drift

If your project was bootstrapped from a template, use `/dev:diff` periodically to see how you've diverged:

```bash
/dev:diff https://github.com/org/template-repo
# Review .claude/diff.md for structural differences
```

## Skills

### Conventional Commits

Write conventional commit messages:

```bash
/dev:commit
```

What happens:
1. Runs formatters and linters before staging (auto-fixes are included in the commit)
2. Analyzes your staged and unstaged changes
3. Generates a conventional commit message (`feat:`, `fix:`, `chore:`, etc.)
4. Shows the message for review — you can approve, edit, or cancel
5. Creates the commit, pushes, and launches CI monitoring in the background

Follows the [Conventional Commits](https://www.conventionalcommits.org/) specification, which feeds directly into semantic versioning and changelog generation.

**Flags:**
- `--atomic` — detect logical change groups and create one commit per group
- `--single` — all staged changes in one commit (default)
- `--yes` / `-y` — skip confirmation and auto-approve the message
- `--no-push` — commit only, do not push or monitor CI
- `--autofix` — if CI fails after push, automatically fix and re-push

### CI Monitor

Monitor CI/CD workflows and verify status after a push:

```bash
/dev:ci
```

Works with both **GitHub Actions** and **GitLab CI** — provider is auto-detected from the remote URL.

Runs in the **background by default** so you can keep working. A desktop notification fires when checks complete or fail.

**Flags:**
- `--wait` — block until CI completes instead of running in background
- `--autofix` — on failure, automatically fix the reported errors and re-push (up to 2 attempts)
- `--silent` — suppress the desktop notification

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
- Review structural changes before merging branches across repos

### Fix PR Review Comments

Fetch open PR/MR review comments and propose fixes:

```bash
/dev:pr-fix [pr-id]
```

Works with GitHub and GitLab. For each PR/MR with unresolved review comments, creates `.codevoyant/pr-fix/{pr-id}.md` containing the review threads and a "Proposed Fixes" section written by a background agent.

Proposals are written to the document only — **not applied to code** — so you review them before deciding what to apply.

**Flags:**
- `pr-id` (optional) — target a specific PR/MR number; omit to process all open PRs/MRs with pending comments
- `--silent` — suppress the desktop notification when proposals are ready

### Safe Rebase

Safely rebase the current branch onto an updated base branch:

```bash
/dev:rebase
/dev:rebase main
/dev:rebase main --push
```

Uses a pre-rebase intent snapshot to resolve conflicts correctly, preventing the silent change loss that happens with naive rebasing. Conflict marker sides during `git rebase` are counter-intuitive (`HEAD` = base branch, not your branch) — this skill handles that automatically.

**How it works:**

1. **Intent snapshot** — Before touching git, captures your branch's full diff from the divergence point, the list of every file the branch modifies, and the commit log. This becomes the source of truth for all conflict resolution.

2. **Confirmation dialog** — Shows a branch summary ("Branch intent: N commits, M files changed: [file list]") and the rebase target, then asks for confirmation before proceeding. You can cancel without any changes being made.

3. **Conflict resolution** — During the rebase, `<<<<<<< HEAD` is actually the *base branch* (not your branch) — the skill handles this correctly and resolves conflicts by applying your branch's intended change onto the base branch's current version. For ambiguous conflicts, it stops and shows you both sides clearly, asking what the resolved version should be.

4. **Post-rebase verification** — After completing, checks that no files were silently dropped (warns if a branch-modified file is no longer changed), flags unexplained large diffs, runs formatters (auto-staged onto last commit), and runs lint + tests if available. Lint failures block the push.

5. **Push safety** — Uses `--force-with-lease` (not `--force`) to avoid overwriting concurrent remote changes. Launches CI monitoring automatically after push.

**Rebasing main:** If you're on `main` itself, `/dev:rebase` fast-forwards main to `origin/main` via `git fetch` + `git rebase` instead of doing a full branch rebase.

**Flags:**
- `base-branch` (optional) — rebase target; defaults to `origin/main` or `origin/master`
- `--push` — push with `--force-with-lease` after a successful rebase
