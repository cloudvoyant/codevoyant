<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/dev.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# Dev

Developer workflow commands — architecture planning, technical exploration, repo comparison, docs generation, PR review, and Linear integration.

The Dev skills cover the higher-level mechanics of the development loop: drafting architecture plans, researching technical approaches, comparing repositories, resolving PR comments, and generating architecture documentation.

> **Looking for commit, CI, and rebase?** Those moved to the [Git skill](/skills/git).

## Installation

**Claude Code:**
```bash
npx skills add cloudvoyant/codevoyant
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflows

### Open a PR or MR

```bash
/dev mr                     # creates PR/MR into main, auto-detects GitHub vs GitLab
/dev mr staging             # target a different base branch
/dev pr-fix                 # fix open review comments on an existing PR/MR
```

### Tracking Template Drift

If your project was bootstrapped from a template, use `/dev diff` periodically to see how you've diverged:

```bash
/dev diff https://github.com/org/template-repo
# Review .claude/diff.md for structural differences
```

### Architecture Documentation

```bash
/dev docs                                   # Generate docs/architecture/ from codebase scan
/dev plan "authentication system"           # Draft architecture plan to .codevoyant/plans/
/dev plan "auth" --mode arch                # Architecture plan with task breakdown + LOE
/dev approve                                # Promote draft plan to docs/architecture/
/dev approve my-plan --push                 # Promote and create Linear tasks
```

### Technical Research

```bash
/dev explore "caching strategy"    # Research approaches, generate parallel proposals
```

## Skills

### Repository Comparison

Compare your current repository with another:

```bash
/dev diff <repository-url>
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

### Create PR / MR

Create a pull request (GitHub) or merge request (GitLab) from the current branch:

```bash
/dev mr                         # into main, auto-detects provider
/dev mr staging                 # target a different base branch
/dev mr --draft                 # create as draft
/dev mr --yes                   # skip confirmation prompt
/dev mr --github                # force GitHub
/dev mr --gitlab                # force GitLab
```

What happens:
1. Checks working tree is clean (no uncommitted changes)
2. Detects GitHub vs GitLab from the remote URL
3. Pushes the branch if it hasn't been pushed yet
4. Checks no existing open PR/MR for this branch already exists
5. Drafts a title and body from commits since the base branch
6. Shows preview for review — you can approve, tweak, or cancel
7. Creates the PR/MR and reports the URL

**Flags:**
- `[base-branch]` — target branch (default: `main`)
- `--draft` — create as draft PR/MR
- `--yes` / `-y` — skip confirmation
- `--github` / `--gitlab` — override auto-detected provider

### Fix PR Review Comments

Fetch open PR/MR review comments and propose fixes:

```bash
/dev pr-fix [pr-id]
/dev pr-fix [pr-id] --github    # Force GitHub provider
/dev pr-fix [pr-id] --gitlab    # Force GitLab provider
/dev pr-fix --silent             # Suppress desktop notification
```

Works with GitHub and GitLab. For each PR/MR with unresolved review comments, creates `.codevoyant/pr-fix/{pr-id}.md` containing the review threads and a "Proposed Fixes" section written by a background agent. Proposals are written to the document only -- **not applied to code** -- so you review them before deciding what to apply.

### Technical Exploration

Research a technical problem before building:

```bash
/dev explore "caching strategy"
/dev explore "auth approaches" --aspects
```

Runs parallel proposal generation via subagents. Output lives in `.codevoyant/explore/{name}/` so it can feed into `/spec new` later.

### Architecture Documentation

Generate or update architecture documentation from a codebase scan:

```bash
/dev docs                  # Generate docs/architecture/ from codebase
/dev docs --bg             # Run in background, notify when done
```

Produces component maps, data flow diagrams, API inventories, and dependency graphs.

### Architecture Planning

Plan architecture for a project or feature:

```bash
/dev plan "authentication system"          # Feature design doc (--mode feat)
/dev plan "auth" --mode arch               # Architecture plan with task breakdown + LOE
/dev plan "auth" --mode arch --bg          # Run in background
```

Writes a draft plan to `.codevoyant/plans/{slug}/plan.md`. For architecture-level plans (`--mode arch`), the plan includes a **Task Breakdown** — each task has a LOE estimate, blocking relationships, and acceptance criteria rich enough for autonomous implementation via `/spec new` and `/spec bg`.

Use `/dev approve` to promote the plan to `docs/architecture/`.

**Flags:**
- `--mode arch` — architecture-level plan: produces task breakdown with LOE and dependency graph
- `--mode feat` — feature design doc only (no task breakdown)
- If `--mode` is omitted, the skill asks interactively

### Architecture Approve

Promote a draft architecture plan to `docs/architecture/` and optionally create Linear tasks:

```bash
/dev approve                                    # Approve most recent dev:plan draft
/dev approve my-plan                            # Approve specific plan by slug
/dev approve my-plan --push                     # Approve and create new Linear project + tasks
/dev approve my-plan --push https://linear.app/...  # Approve and push to existing Linear project
/dev approve my-plan --silent                   # Suppress notification
```

Each Linear task created includes: the relevant architecture doc section, scope, key constraints, and verifiable acceptance criteria — enough context for `/spec new` + `/spec bg` to execute autonomously.

### Pre-approve Agent Permissions

```bash
/dev allow           # Write dev permissions to project .claude/settings.json
/dev allow --global  # Write to ~/.claude/settings.json
```

Adds the allow entries needed for dev and git skills to run without permission prompts — git operations (including push), GitHub/GitLab CLI, desktop notifications, and the project's task runner.

### List All Commands

```bash
/dev help                   # List all dev commands with descriptions
/dev help ci                # Show full details for a specific command
```
