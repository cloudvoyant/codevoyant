<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/spec.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# Spec Plugin

Specification-driven development — plan, execute, and track complex work with structured plans.

The spec plugin introduces a structured planning layer to your AI coding agent. Write detailed plans, then execute them interactively or hand them off to a background agent while you work on other things.

## Installation

**Claude Code:**
```bash
/plugin marketplace add codevoyant/codevoyant
/plugin install spec
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## How It Works

Plans live in `.codevoyant/plans/{plan-name}/`:

```
.codevoyant/plans/
├── README.md                        # Central plan tracker
├── my-feature/
│   ├── plan.md                      # High-level objectives + checklist
│   ├── implementation/
│   │   ├── phase-1.md               # Detailed specs per phase
│   │   └── phase-2.md
│   ├── research/                    # Codebase + library research artifacts
│   ├── proposals/                   # Architecture proposal files (if generated)
│   └── execution-log.md             # Background execution history
└── archive/                         # Completed plans
```

## Typical Workflows

### Interactive Workflow

```bash
/spec:new my-feature        # Create plan with Claude's help
/spec:go my-feature         # Execute step-by-step with review
/spec:done my-feature       # Archive and optionally commit
```

### Background Workflow

```bash
/spec:new my-feature        # Create detailed plan with implementation files
/spec:bg my-feature         # Start background agent
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

- **Use `/spec:new`** for real work — Claude's planning session catches ambiguities early. Pass a Linear/GitHub/Notion URL to seed requirements automatically. Use `--blank` only when you want to write the plan yourself.
- **Plan selection**: For all skills except `/spec:new`, if you don't specify a plan name and multiple plans exist, Claude will show you the list and ask you to choose.
- **Put detail in implementation files** — `plan.md` stays high-level; detailed specs go in `implementation/phase-N.md`
- **Prefer `/spec:bg`** for long or routine tasks; use `/spec:go` for complex or high-risk changes
- **Annotate plans directly** — add `> note` or `line >> instruction` markers while reading, then run `/spec:update` to apply them in bulk
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
```

Claude explores your requirements and creates:
- `plan.md` with objectives, design decisions, and task checklists
- `implementation/phase-N.md` files with detailed specs per phase

**URL seeding:** Pass a Linear issue, Notion page, or GitHub/GitLab issue URL as the first argument. Claude fetches the issue title, description, and comments to pre-fill requirements, then asks only follow-up questions the source doesn't already answer.

**`--blank`:** Skips the planning session entirely and creates an empty plan template for you to fill in manually. This replaces the old `/init` command.

**Research phase:** When you run `/spec:new`, three parallel research agents run automatically: a codebase scan (reads structure, existing patterns, tech stack), a library/pattern research agent (searches for relevant libraries and design patterns), and a skills lookup agent. Results are synthesized before planning begins.

**Architecture exploration (optional):** For non-trivial objectives, Claude identifies 2–3 distinct architectural approaches and asks if you want proposal documents generated. If yes, proposals are written in parallel to `proposals/*.md`. You then pick a direction (or ask for a synthesis), and the plan is built from your choice.

**Worktree prompt:** If you're in a git repo and not already in a worktree, Claude offers to create a dedicated git worktree for the plan during the planning session.

**Final review:** Before writing any files, Claude presents the plan outline and asks "Does this plan cover everything?" so you can redirect before implementation files are generated.

### List All Plans

```bash
/spec:list
```

Shows all active and archived plans with:
- Status (Active / Paused / Executing)
- Progress percentage and task counts
- Last updated timestamps

### Execute Interactively

```bash
/spec:go                    # Auto-selects most recently updated plan
/spec:go plan-name          # Execute specific plan
```

Choose your execution mode:
- **Fully Autonomous** — execute entire plan without stops (except errors)
- **Phase Review** — pause after each phase for your review
- **Targeted Review** — stop at a specific phase

**Inline annotations** — edit plan files directly while the agent runs, or before starting:

- `> instruction` — standalone line; instruction applies to the block immediately below it
- `content >> instruction` — inline suffix; instruction applies to that line only

Examples:
```
> rewrite this phase for OAuth — drop all JWT references
### Phase 2 - Authentication

1. [ ] Set up Passport.js >> mark done
2. [ ] Add refresh tokens >> remove this task
```

Run `/spec:update` to apply annotations in bulk, or let `/spec:go` apply them automatically as it reaches each task.

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
- `--yes` / `-y` — skip all confirmations (worktree creation, execution start)
- `--commit` / `-c` — allow the agent to make git commits as tasks complete (disabled by default)
- `--silent` — suppress the desktop notification

Monitor with `/spec:list`, stop with `/spec:stop`.

### Apply Plan Annotations

```bash
/spec:update                # Auto-selects most recently updated plan
/spec:update plan-name      # Apply annotations in specific plan
```

Processes inline annotations you've written directly in plan files. Two annotation forms are supported:

- **`> instruction`** — standalone line before a block; applies to the block immediately below it
- **`content >> instruction`** — inline suffix on any line; applies to that line only

Examples:
```
> rewrite this phase for OAuth — drop all JWT references
### Phase 2 - Authentication

1. [ ] Set up Passport.js >> mark done
2. [ ] Add refresh tokens >> remove this task
```

`/spec:update` scans `plan.md` and all `implementation/phase-N.md` files, applies each instruction (mark done, remove, rewrite, etc.), removes the annotation markers, and updates progress stats in `README.md`.

### Stop or Pause

```bash
/spec:stop                  # If only one plan is active
/spec:stop plan-name        # Stop specific plan
```

Works in two modes depending on state:

- **Background agent running** — halts the agent gracefully, saves all progress. Resume later with `/spec:bg` or `/spec:go`.
- **No agent running** — captures session insights (decisions made, discoveries, next steps) into an `## Insights` section in `plan.md`, then marks the plan as Paused.

### Update Checklist Status

```bash
/spec:refresh               # Auto-selects most recently updated plan
/spec:refresh plan-name     # Refresh specific plan
```

Reviews what's been done and updates checkboxes in `plan.md` to reflect current state.

### Complete a Plan

```bash
/spec:done                  # Shows completion dialog
/spec:done plan-name        # Complete specific plan
```

Marks the plan complete and archives it to `.codevoyant/plans/archive/{name}-{YYYYMMDD}/`. Offers to create a git commit and pull request before archiving.

### Permanently Delete

```bash
/spec:delete plan-name     # Requires typing plan name to confirm
```

### Rename a Plan

```bash
/spec:rename old-name new-name
```

### Manage Git Worktrees

```bash
/spec:worktree list
/spec:worktree create [branch-name]
/spec:worktree remove [branch-name]
/spec:worktree prune
/spec:worktree export [plan-name] [--force]
```

Manage git worktrees for isolated plan execution. Subcommands:

- **`list`** — show all worktrees, their branches, status (clean/dirty), and associated plans
- **`create [branch-name]`** — create a new worktree at `.codevoyant/worktrees/{branch-name}`
- **`remove [branch-name]`** — remove a worktree; optionally delete the branch too
- **`prune`** — remove stale git references to worktrees whose directories have been deleted manually
- **`export [plan-name] [--force]`** — copy a plan from the current worktree's `.codevoyant/plans/` into the main repository's `.codevoyant/plans/`. Use `--force` to overwrite an existing entry. Re-run to push updates; the worktree copy remains the source of truth.
