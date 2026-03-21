<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/spec.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# Spec

Specification-driven development -- plan, execute, and track complex work with structured plans.

The Spec skills introduce a structured planning layer to your AI coding agent. Write detailed plans, then execute them interactively or hand them off to a background agent while you work on other things.

## Installation

**Claude Code:**

```bash
npx skills add cloudvoyant/codevoyant
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## How It Works

Plans live in `.codevoyant/plans/{plan-name}/`. Plan registry is tracked in `.codevoyant/plans.json`:

```
.codevoyant/
├── plans.json                       # Plan registry (active + archived)
├── worktrees.json                   # Worktree registry
└── plans/
    ├── my-feature/
    │   ├── plan.md                  # High-level objectives + checklist
    │   ├── user-guide.md            # How to use what will be built
    │   ├── implementation/
    │   │   ├── phase-1.md           # Detailed specs per phase
    │   │   └── phase-2.md
    │   ├── research/                # Codebase + library research artifacts
    │   └── execution-log.md         # Background execution history
    └── archive/                     # Completed plans
```

## Typical Workflows

### Interactive Workflow

```bash
/spec:new my-feature        # Create plan interactively
/spec:review my-feature     # Review plan quality before execution
/spec:go my-feature         # Execute step-by-step with review
/spec:done my-feature       # Archive and optionally commit
```

> `spec:go` will warn if `spec:review` hasn't been run on a plan yet. Run `/spec:review` first to catch issues early.

### Background Workflow

```bash
/spec:new my-feature --bg   # Create plan and immediately start background execution
/spec:new my-feature        # Or: create plan, then hand off separately:
/spec:go my-feature --bg    # Start background agent (equivalent to /spec:bg)
# ... work on other things ...
/spec:list                  # Check progress across all plans
# Agent completes and sends a desktop notification
/spec:done my-feature       # Archive and commit
```

### Multi-Plan Workflow

```bash
/spec:new feature-auth      # Plan 1
/spec:new refactor-api      # Plan 2

/spec:go feature-auth       # Work on Plan 1 interactively
/spec:bg refactor-api       # Run Plan 2 in background simultaneously

/spec:list                  # See all plans at once
/spec:done feature-auth
/spec:done refactor-api
```

## Best Practices

- **Use `/spec:new`** for real work -- the planning session catches ambiguities early. Pass a Linear/GitHub/Notion URL to seed requirements automatically. Use `--blank` only when you want to write the plan yourself.
- **Plan selection**: For all skills except `/spec:new`, if you don't specify a plan name and multiple plans exist, you'll be shown the list and asked to choose.
- **Put detail in implementation files** -- `plan.md` stays high-level; detailed specs go in `implementation/phase-N.md`
- **Prefer `--bg`** for long or routine tasks (`/spec:go --bg` or `/spec:bg`); use interactive mode for complex or high-risk changes
- **Annotate plans directly** -- add `> note` or `line >> instruction` markers while reading, then run `/spec:update` to apply them in bulk
- **Check `/spec:list`** before ending a session to see where all plans stand
- **Use `/spec:stop`** to capture session insights before taking a break

## Skills

### Create a Plan

```bash
/spec:new                                      # Interactive naming
/spec:new plan-name                            # Specific name
/spec:new https://linear.app/team/issue/ENG-42 # Seed from Linear issue
/spec:new https://github.com/org/repo/issues/7 # Seed from GitHub issue
/spec:new plan-name --branch feature-branch    # Create with a git worktree
/spec:new --blank                              # Empty template (no planning session)
/spec:new plan-name --bg                       # Create and immediately start background execution
```

Explores your requirements and creates:

- `plan.md` with objectives, design decisions, and task checklists
- `user-guide.md` documenting how to use what will be built
- `implementation/phase-N.md` files with detailed specs per phase

**URL seeding:** Pass a Linear issue, Notion page, or GitHub/GitLab issue URL as the first argument. Fetches the issue title, description, and comments to pre-fill requirements, then asks only follow-up questions the source doesn't already answer.

**`--blank`:** Skips the planning session entirely and creates an empty plan template for you to fill in manually.

**Research phase:** Three parallel research agents run automatically: a codebase scan (reads structure, existing patterns, tech stack), a library/pattern research agent (searches for relevant libraries and design patterns), and a skills lookup agent (checks agentskill.sh for community skills). Results are synthesized before planning begins.

**Worktree prompt:** If you're in a git repo and not already in a worktree, you'll be offered the option to create a dedicated git worktree for the plan.

**Validation loop:** Before finalizing, the plan runs through an automated validation loop (minimum 2 rounds) that checks for ambiguous tasks, missing validation steps, and implementation gaps. A parallel permissions analysis agent identifies the allow entries needed for autonomous execution.

### Execute a Plan

```bash
/spec:go                         # Auto-selects most recently updated plan
/spec:go plan-name               # Execute specific plan interactively
/spec:go plan-name --bg          # Execute in background (non-blocking)
/spec:go plan-name --bg --silent # Background, no desktop notification
/spec:go plan-name --commit      # Allow git commits during execution
```

**Interactive mode** -- choose your execution style:

- **Fully Autonomous** -- execute entire plan without stops (except errors)
- **Phase Review** -- pause after each phase for your review
- **Targeted Review** -- stop at a specific phase

**Background mode (`--bg`)** -- spawns an autonomous agent and returns immediately so you can keep working. A desktop notification fires when execution completes or fails. Equivalent to `/spec:bg`.

**Flags:**

- `--bg` -- non-blocking background execution
- `--silent` -- suppress the desktop notification (use with `--bg`)
- `--commit` / `-c` -- allow the agent to make git commits as tasks complete

### Background Execution

```bash
/spec:bg                    # Auto-selects most recently updated plan
/spec:bg plan-name          # Execute specific plan in background
/spec:bg plan-name --yes    # Skip confirmations (also: -y)
/spec:bg plan-name --commit # Allow git commits during execution (default: off)
/spec:bg plan-name --silent # Suppress desktop notification on completion
```

Spawns an autonomous agent that:

1. Reads your implementation files for detailed specs
2. Updates `plan.md` checkboxes in real-time
3. Runs tests at phase boundaries
4. Pauses and preserves state on errors
5. Writes an execution log at `.codevoyant/plans/{name}/execution-log.md`
6. Sends a **desktop notification** when execution completes or fails

Flags:

- `--yes` / `-y` -- skip all confirmations (worktree creation, execution start)
- `--commit` / `-c` -- allow the agent to make git commits as tasks complete (disabled by default)
- `--silent` -- suppress the desktop notification

Monitor with `/spec:list`, stop with `/spec:stop`.

### List All Plans

```bash
/spec:list                  # Overview of all plans
/spec:list plan-name        # Detailed status for one plan
```

Shows all active and archived plans with status, progress percentage, task counts, branch/worktree context, and last updated timestamps.

### Review a Plan

```bash
/spec:review                    # Auto-selects most recently updated plan
/spec:review plan-name          # Review specific plan
```

Reviews a plan for quality issues before running `/spec:go`. Four parallel review agents check for: ambiguous tasks, missing validation steps, unrealistic ordering, dependency gaps, and plan-vs-implementation mismatches. Auto-fixes mechanical issues (missing test commands, blank sections) and asks about judgment calls one at a time. Produces a structured review report at `review.md`.

### Apply Plan Annotations

```bash
/spec:update                     # Auto-selects most recently updated plan
/spec:update plan-name           # Apply annotations in specific plan
/spec:update plan-name --bg      # Apply in background, notify when done
```

Processes inline annotations written directly in plan files, or accepts a conversational description of changes. Two annotation forms are supported:

- **`> instruction`** -- standalone line before a block; applies to the block below it
- **`content >> instruction`** -- inline suffix on any line; applies to that line only

Examples:

```
> rewrite this phase for OAuth -- drop all JWT references
### Phase 2 - Authentication

1. [ ] Set up Passport.js >> mark done
2. [ ] Add refresh tokens >> remove this task
```

### Update Checklist Status

```bash
/spec:refresh                    # Auto-selects most recently updated plan
/spec:refresh plan-name          # Refresh specific plan
/spec:refresh plan-name --bg     # Refresh in background, notify when done
```

Reviews what's been done and updates checkboxes and phase markers in `plan.md` to reflect current state.

### Complete a Plan

```bash
/spec:done                  # Shows completion dialog
/spec:done plan-name        # Complete specific plan
```

Marks the plan complete and archives it to `.codevoyant/plans/archive/{name}-{YYYYMMDD}/`. Offers to create a git commit and pull request before archiving. If the plan had a worktree, offers to clean it up.

### Stop or Pause

```bash
/spec:stop                  # If only one plan is active
/spec:stop plan-name        # Stop specific plan
```

Works in two modes depending on state:

- **Background agent running** -- halts the agent gracefully, saves all progress. Resume later with `/spec:bg` or `/spec:go`.
- **No agent running** -- captures session insights (decisions made, discoveries, next steps) into an `## Insights` section in `plan.md`, then marks the plan as Paused.

### Permanently Delete

```bash
/spec:delete plan-name     # Requires typing plan name to confirm
```

Permanently deletes a plan and all its files. Cannot be undone.

### Rename a Plan

```bash
/spec:rename old-name new-name
```

Renames a plan directory and updates the registry. Git worktrees and branches are not renamed.

### Diagnose Setup Issues

```bash
/spec:doctor
```

Detects old path layouts (`.spec/plans/`, `.worktrees/`) and migrates them to the current `.codevoyant/` structure. Updates `.gitignore` entries and flags stale references in `CLAUDE.md`.

### Pre-approve Permissions

```bash
/spec:allow           # Write spec permissions to project .claude/settings.json
/spec:allow --global  # Write to ~/.claude/settings.json
```

Adds the allow entries needed for `/spec:bg` and `/spec:go` to run without permission prompts -- git operations, WebSearch/WebFetch, and the project's task runner.

### List All Commands

```bash
/spec:help                  # List all spec commands with descriptions
/spec:help go               # Show full details for a specific command
```
