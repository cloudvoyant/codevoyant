# spec

Specification-driven development — create structured plans from requirements, execute them autonomously in the background, and track progress to completion.

## Workflows

### new — create a plan

Explore requirements and produce a multi-phase implementation plan with objectives, design decisions, and per-phase specs. Every task carries the **complete, ready-to-write code** it will produce. Before `new` reports a plan ready, a mandatory code-completeness gate scans every task and rejects stubs, placeholder markers, omitted code, and prose-only descriptions; it reruns after repairs and fails closed if literal code cannot be resolved. `--validate` still adds the broader multi-agent validation pass.

Two ways to give the objective:

- **Inline objective** — a description; planning starts immediately.
- **Bare name** — just a name; `new` scaffolds `.codevoyant/plans/{name}/intent.md`, prints its path (and opens it in your editor when possible), and stops. Fill it in, then re-run `/spec new {name}` and it plans from your intent, asking only what's still unclear.

```bash
/spec new add OAuth login to the settings page  # inline objective → plans now
/spec new auth-refactor                          # bare name → writes intent.md to fill in
/spec new auth-refactor                          # re-run after filling → plans
/spec new https://linear.app/team/issue/ENG-42  # seed from Linear issue
/spec new https://github.com/org/repo/issues/7  # seed from GitHub issue
/spec new my-feature --branch                   # create/switch to a branch (name derived from the slug)
/spec new my-feature --branch feature-branch    # create/switch to a branch with an explicit name
/spec new my-feature --worktree                 # create a worktree under .codevoyant/worktrees/<branch>
/spec new my-feature --worktree ../wt           # create a worktree at an explicit path
/spec new my-feature --branch feat --worktree ../wt  # branch + worktree at an explicit path
/spec new --blank                               # empty template, no planning session
/spec new my-feature --bg                       # create and immediately start background execution
/spec new my-feature --validate                 # run a validation pass on the plan before finishing
```

`--branch` and `--worktree` are independent — each does one thing, and neither implies the other. `--branch` creates or switches to a branch (bare: derived from the plan slug; with a name: that name). `--worktree` creates a worktree (bare: `.codevoyant/worktrees/<branch>`; with a path: that path). Both delegate to the shared `/git worktree` routine.

Pass a Linear, GitHub, or GitLab issue URL as the first argument to pre-fill requirements from the issue title, description, and comments.

### go — execute a plan

Spawn an autonomous background agent that reads implementation files, updates plan checkboxes in real time, runs tests at phase boundaries, and sends a desktop notification on completion. Independent phases run **in parallel** on a fast (light) executor for responsiveness, escalating to a heavier tier only when a phase hits genuine trouble.

```bash
/spec go                                # auto-selects most recently updated plan
/spec go my-feature                     # execute specific plan
/spec go my-feature --yes               # skip all confirmations
/spec go my-feature --commit            # allow git commits during execution
/spec go my-feature --silent            # suppress desktop notification on completion
```

### guide — interactive walkthrough

Walk through a plan phase by phase, task by task, with tutorial-style guidance. After each task you decide: proceed, skip, or improvise.

```bash
/spec guide                             # auto-selects most recently updated plan
/spec guide my-feature                  # guide specific plan
/spec guide my-feature --phase 2        # start at phase 2
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
```

Two annotation forms, both written as HTML comments so they never collide with real markdown blockquotes: `<!-- > instruction -->` on a standalone line (minor) applies to the block below; `content <!-- >> instruction -->` inline (major) applies to that line only.

### split — split a large plan

Split an existing plan into two independently executable plans at a chosen phase boundary.

```bash
/spec split                             # auto-selects most recently updated plan
/spec split my-feature                  # pick a phase boundary interactively
```

### review — review plan quality

Check a plan for complete ready-to-write code before any other review, then assess ambiguous tasks, missing validation steps, unrealistic ordering, and dependency gaps before running `go`.

```bash
/spec review                            # auto-selects most recently updated plan
/spec review my-feature                 # review specific plan
```

Produces a `review.md` report and auto-fixes mechanical issues. The code-completeness gate is blocking: review cannot report a ready verdict until every implementation task passes it. Run this before `/spec go`.

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
```

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
