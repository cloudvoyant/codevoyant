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
```

Pass a Linear, GitHub, or GitLab issue URL as the first argument to pre-fill requirements from the issue title, description, and comments.

### go — execute a plan

Spawn an autonomous background agent that reads implementation files, updates plan checkboxes in real time, runs tests at phase boundaries, and sends a desktop notification on completion.

```bash
/spec go                          # auto-selects most recently updated plan
/spec go my-feature               # execute specific plan
/spec go my-feature --yes         # skip all confirmations
/spec go my-feature --commit      # allow git commits during execution
/spec go my-feature --silent      # suppress desktop notification on completion
```

### review — review plan quality

Check a plan for ambiguous tasks, missing validation steps, unrealistic ordering, and dependency gaps before running `go`.

```bash
/spec review                      # auto-selects most recently updated plan
/spec review my-feature           # review specific plan
```

Produces a `review.md` report and auto-fixes mechanical issues. Run this before `/spec go`.

### update — apply annotations

Process inline annotations written directly in plan files, or accept a conversational description of changes.

```bash
/spec update                      # auto-selects most recently updated plan
/spec update my-feature           # apply annotations in specific plan
/spec update my-feature --bg      # apply in background, notify when done
```

Two annotation forms: `> instruction` on a standalone line applies to the block below; `content >> instruction` inline applies to that line only.

### refresh — sync checklist status

Review what has been done and update checkboxes and phase markers in `plan.md` to reflect current state.

```bash
/spec refresh                     # auto-selects most recently updated plan
/spec refresh my-feature          # refresh specific plan
/spec refresh my-feature --bg     # refresh in background, notify when done
```

### clean — session wrap-up

Stop running agents, archive completed plans to `docs/plan/`, and triage any remaining active plans.

```bash
/spec clean                       # full session wrap-up across all plans
/spec clean my-feature            # clean up a specific plan only
```

### polish — strip AI verbosity from execution outputs

Run a cleanup pass on files modified during a plan's execution. Removes comments that restate code, rhetorical flair in docs, and unnecessary preamble.

```bash
/spec polish                    # auto-selects most recent plan
/spec polish my-plan            # polish a specific plan's output files
```

Never changes code logic. Reads `execution-log.md` to find modified files, runs parallel cleanup agents per file, and reports what was removed.

### allow — pre-approve permissions

Write the allow entries needed for `/spec go` to run without permission prompts.

```bash
/spec allow                       # write to project .claude/settings.json
/spec allow --global              # write to ~/.claude/settings.json
```

### help — list commands

```bash
/spec help                        # list all spec commands with descriptions
```
