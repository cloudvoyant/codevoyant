# spec

Specification-driven development — create structured plans from requirements, execute them autonomously in the background, and track progress to completion.

## Workflows

### new — create a plan

Explore requirements and produce a multi-phase implementation plan with objectives, design decisions, and per-phase specs.

```bash
/spec new                                       # interactive naming
/spec new my-feature                            # named plan
/spec new https://linear.app/team/issue/ENG-42  # seed from Linear issue
/spec new https://github.com/org/repo/issues/7  # seed from GitHub issue
/spec new my-feature --branch feature-branch    # create with a git worktree
/spec new --blank                               # empty template, no planning session
/spec new my-feature --bg                       # create and immediately start background execution
/spec new my-feature --validate                 # run a validation pass on the plan before finishing
/spec new my-feature --usage                    # record planner decisions for /usage report
```

Pass a Linear, GitHub, or GitLab issue URL as the first argument to pre-fill requirements from the issue title, description, and comments.

### go — execute a plan

Spawn an autonomous background agent that reads implementation files, updates plan checkboxes in real time, runs tests at phase boundaries, and sends a desktop notification on completion.

```bash
/spec go                                # auto-selects most recently updated plan
/spec go my-feature                     # execute specific plan
/spec go my-feature --yes               # skip all confirmations
/spec go my-feature --commit            # allow git commits during execution
/spec go my-feature --silent            # suppress desktop notification on completion
/spec go my-feature --usage             # record agent decisions for /usage report
/spec go my-feature --commit --usage    # commits + usage tracking
```

### guide — interactive walkthrough

Walk through a plan phase by phase, task by task, with tutorial-style guidance. After each task you decide: proceed, skip, or improvise.

```bash
/spec guide                             # auto-selects most recently updated plan
/spec guide my-feature                  # guide specific plan
/spec guide my-feature --phase 2        # start at phase 2
/spec guide my-feature --usage          # record decisions for /usage report
```

Pass `--vim` to inject editor key binding hints at each task step:

```bash
/spec guide my-plan --vim               # vim hints
```

### update — apply annotations

Process inline annotations written directly in plan files, or accept a conversational description of changes.

```bash
/spec update                            # auto-selects most recently updated plan
/spec update my-feature                 # apply annotations in specific plan
/spec update my-feature --bg            # apply in background, notify when done
/spec update my-feature --usage         # log applied annotations as user decisions
```

Two annotation forms: `> instruction` on a standalone line applies to the block below; `content >> instruction` inline applies to that line only.

### split — split a large plan

Split an existing plan into two independently executable plans at a chosen phase boundary.

```bash
/spec split                             # auto-selects most recently updated plan
/spec split my-feature                  # pick a phase boundary interactively
```

### review — review plan quality

Check a plan for ambiguous tasks, missing validation steps, unrealistic ordering, and dependency gaps before running `go`.

```bash
/spec review                            # auto-selects most recently updated plan
/spec review my-feature                 # review specific plan
```

Produces a `review.md` report and auto-fixes mechanical issues. Run this before `/spec go`.

### refresh — sync checklist status

Review what has been done and update checkboxes and phase markers in `plan.md` to reflect current state.

```bash
/spec refresh                           # auto-selects most recently updated plan
/spec refresh my-feature                # refresh specific plan
/spec refresh my-feature --bg           # refresh in background, notify when done
```

### clean — session wrap-up

Stop running agents, triage remaining active plans, and optionally export session artifacts before clearing.

```bash
/spec clean                             # full session wrap-up across all plans
/spec clean my-feature                  # clean up a specific plan only
/spec clean --usage                     # export .codevoyant/ to .ai_usage/ before clearing
```

With `--usage` (requires the `usage` skill): prompts whether to zip just `.codevoyant/plans/` or the entire `.codevoyant/` directory, writes a timestamped archive to `.ai_usage/`, then clears the exported content.

### polish — strip AI verbosity from execution outputs

Run a cleanup pass on files modified during a plan's execution. Removes comments that restate code, rhetorical flair in docs, and unnecessary preamble.

```bash
/spec polish                            # auto-selects most recent plan
/spec polish my-plan                    # polish a specific plan's output files
```

Never changes code logic. Reads `execution-log.md` to find modified files, runs parallel cleanup agents per file, and reports what was removed.

### allow — pre-approve permissions

Write the allow entries needed for `/spec go` to run without permission prompts.

```bash
/spec allow                             # write to project .claude/settings.json
/spec allow --global                    # write to ~/.claude/settings.json
```

### help — list commands

```bash
/spec help                              # list all spec commands with descriptions
```

## Usage tracking

Pass `--usage` to any spec command to record decision attribution data for `/usage report`. This requires the `usage` skill to be installed.

When active, the planner and executor log every significant autonomous choice to `architecture.md`'s Decision Log — phasing strategy, architecture decisions, technology selections — making it possible to generate a report that distinguishes user-directed decisions from agent-autonomous ones.

### Example: feature branch session with full tracking

```bash
# 1. Create plan — planner logs all design choices it makes autonomously
/spec new auth-refactor --usage

# 2. Review before executing
/spec review auth-refactor

# 3. Execute — executor logs mid-phase autonomous decisions in real time
/spec go auth-refactor --commit --usage

# 4. You annotate the plan with inline edits, then apply them
#    Annotations are logged as [user] decisions
/spec update auth-refactor --usage

# 5. Generate the usage report
#    On feature/auth-refactor branch → writes .codevoyant/usage/auth-refactor-2026-06-09.md
/usage report

# 6. Wrap up — zip session artifacts and clear .codevoyant/
/spec clean --usage
```

### Example: mainline work with a named report

```bash
/spec new fix-login-race
/spec go fix-login-race --usage
/usage report login-race-fix   # → .codevoyant/usage/login-race-fix-2026-06-09.md
/spec clean --usage
```

### What gets recorded

| Command | What is logged |
|---------|---------------|
| `/spec new --usage` | Every significant autonomous planning choice: phasing strategy, architecture, scope decisions |
| `/spec go --usage` | Autonomous mid-phase choices: implementation decisions the spec left open |
| `/spec guide --usage` | Same as `go` for guided execution steps |
| `/spec update --usage` | Every successfully applied `>` annotation — clear evidence of user direction |
| `/spec clean --usage` | Session artifacts zipped to `.ai_usage/` before clearing |
