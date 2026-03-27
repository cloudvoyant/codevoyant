<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/spec.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# Spec

Specification-driven development -- plan, execute, and track complex work with structured plans.

The Spec skill introduces a structured planning layer to your AI coding agent. Write detailed plans, then hand them off to a background agent while you work on other things.

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

## Typical Workflow

```bash
/spec new my-feature        # Create plan
/spec review my-feature     # Review for quality issues before executing
/spec go my-feature         # Hand off to background agent
# ... work on other things ...
# Agent completes and sends a desktop notification
/spec clean                 # Wrap up: archive to docs, mark done or cancel
```

> `spec go` will warn if `spec review` hasn't been run yet. Run `/spec review` first to catch issues early.

## Best Practices

- **Use `/spec new`** for real work -- the planning session catches ambiguities early. Pass a Linear/GitHub/Notion URL to seed requirements automatically. Use `--blank` only when you want to write the plan yourself.
- **Plan selection**: For all commands except `/spec new`, if you don't specify a plan name and multiple plans exist, you'll be shown a list and asked to choose.
- **Put detail in implementation files** -- `plan.md` stays high-level; detailed specs go in `implementation/phase-N.md`
- **Annotate plans directly** -- add `> note` or `line >> instruction` markers while reading, then run `/spec update` to apply them in bulk
- **Run `/spec clean`** at the end of a session to stop agents, archive completed plans to docs, and triage anything left open

## Skills

### Create a Plan

```bash
/spec new                                      # Interactive naming
/spec new plan-name                            # Specific name
/spec new https://linear.app/team/issue/ENG-42 # Seed from Linear issue
/spec new https://github.com/org/repo/issues/7 # Seed from GitHub issue
/spec new plan-name --branch feature-branch    # Create with a git worktree
/spec new --blank                              # Empty template (no planning session)
/spec new plan-name --bg                       # Create and immediately start background execution
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
/spec go                         # Auto-selects most recently updated plan
/spec go plan-name               # Execute specific plan
/spec go plan-name --yes         # Skip all confirmations (also: -y)
/spec go plan-name --commit      # Allow git commits during execution
/spec go plan-name --silent      # Suppress desktop notification on completion
```

Spawns an autonomous background agent that:

1. Reads your implementation files for detailed specs
2. Updates `plan.md` checkboxes in real-time
3. Runs tests at phase boundaries
4. Pauses and preserves state on errors
5. Writes an execution log at `.codevoyant/plans/{name}/execution-log.md`
6. Sends a **desktop notification** when execution completes or fails

**Flags:**

- `--yes` / `-y` -- skip all confirmations (worktree creation, execution start)
- `--commit` / `-c` -- allow the agent to make git commits as tasks complete (disabled by default)
- `--silent` -- suppress the desktop notification

### Review a Plan

```bash
/spec review                    # Auto-selects most recently updated plan
/spec review plan-name          # Review specific plan
```

Reviews a plan for quality issues before running `/spec go`. Four parallel review agents check for: ambiguous tasks, missing validation steps, unrealistic ordering, dependency gaps, and plan-vs-implementation mismatches. Auto-fixes mechanical issues (missing test commands, blank sections) and asks about judgment calls one at a time. Produces a structured review report at `review.md`.

### Apply Plan Annotations

```bash
/spec update                     # Auto-selects most recently updated plan
/spec update plan-name           # Apply annotations in specific plan
/spec update plan-name --bg      # Apply in background, notify when done
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
/spec refresh                    # Auto-selects most recently updated plan
/spec refresh plan-name          # Refresh specific plan
/spec refresh plan-name --bg     # Refresh in background, notify when done
```

Reviews what's been done and updates checkboxes and phase markers in `plan.md` to reflect current state.

### Clean Up / Session Wrap-up

```bash
/spec clean                 # Full session wrap-up across all plans
/spec clean plan-name       # Clean up a specific plan only
```

Combines stop, done, and delete into a single end-of-session flow:

1. **Stops** any running background agents
2. **Completes** plans that a background agent just finished (quick CLI update)
3. **Archives** completed plans to `docs/plan/` (copies `plan.md` + `user-guide.md` only)
4. **Triages** remaining active plans one by one — mark done, cancel, or skip

### Pre-approve Permissions

```bash
/spec allow           # Write spec permissions to project .claude/settings.json
/spec allow --global  # Write to ~/.claude/settings.json
```

Adds the allow entries needed for `/spec go` to run without permission prompts -- git operations, WebSearch/WebFetch, and the project's task runner.

### List All Commands

```bash
/spec help            # List all spec commands with descriptions
```
