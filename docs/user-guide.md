# User Guide

> New here? Start with [Installation](/installation).

## How Skills Work

Skills are slash commands that load focused instructions into your AI agent's context before it acts. There are five kinds:

- **Workflows** — multi-step planning and execution flows for engineering and product work (spec, explore, plan, flow, pm, ux).
- **Skills** — discrete operations you invoke directly for a single, well-defined job (pr, qa, skill, task).
- **Tools** — CLI and platform integrations (git, gh, glab, linear, and others).
- **Context Skills** — activate automatically when relevant files are detected; no invocation needed (mise).

For the best experience, install the full skill set — several skills compose with each other (`flow save` delegates to `skill new`, `qa report` delegates to `gh` or `glab`, `pr` calls `gh`/`glab` internally). If a required skill is missing when a command runs, you will be told which skill to install and how.

**Invoking a skill:**

```bash
/spec new
/git commit
/task list
```

**Passing your intent inline** — all `new`, `explore`, and `plan` verbs accept a description directly on the same line. The skill skips the opening question and proceeds immediately:

```bash
/spec new add dark mode toggle to the settings page
/plan plan add webhook support to the notifications API
/explore new how the auth middleware works
/pm explore pricing strategy for the enterprise tier
/ux explore checkout flow
```

Invoking without a description — `/spec new` — works too; the skill asks once and continues.

## Workflows

Workflows guide you through multi-step processes: research, planning, execution, and handoff. Each workflow manages state across multiple invocations and can run interactively or hand off to a background agent.

### spec — plan and execute complex work

Spec gives you a structured planning layer. You write a plan with AI assistance, then execute it step-by-step or hand it off to a background agent.

```bash
/spec new my-feature        # explore requirements and create plan + implementation files
/spec go my-feature         # execute interactively, with review stops between phases
/spec done my-feature       # archive the plan and optionally commit
```

For long or routine tasks, run in the background:

```bash
/spec new my-feature
/spec bg my-feature         # background agent works while you do other things
/spec list                  # check progress across all active plans
/spec done my-feature
```

Spec plans live in `.codevoyant/spec/{name}/` (plan-created plans in `.codevoyant/plan/{name}/`) with a high-level `plan.md` and per-phase `implementation/` files. Multiple plans can be active at once. Until the v1→v2 store migration runs, a store may still keep legacy drafts under `.codevoyant/plans/{name}/`, which the skills read as a fallback. The in-repo `.codevoyant` is a gitignored symlink to the shared per-project store `~/.codevoyant/<project-slug>/`, so plans are visible from every git worktree of the project. Skills use `.codevoyant` transparently — the symlink to `~/.codevoyant/<project-slug>/` is created at first touch. Run the `/migrate` skill to initialize or repair the shared store, copy existing codevoyant data from another location (e.g. an older real `.codevoyant/` directory or another checkout's store) into it, and record the store's codevoyant version in `.codevoyant/metadata.json`.

See the [spec reference](/skills/spec) for all commands.

### explore — pure technical exploration

Explore researches problem spaces and generates decision-oriented proposals. It never writes application code.

**Technical exploration:**

```bash
/explore new "caching strategy"       # research approaches, generate parallel proposals
/explore diff feature/my-branch       # compare with a local branch
```

See the [explore reference](/skills/explore) for all commands.

### plan — planning at every level

Plan covers planning at every level: a single task, a project, an initiative, or a whole product. Renamed from `em`; it also absorbed the old `/dev plan` architecture-planning flow.

**Project/initiative planning:**

```bash
/plan plan "migrate auth to OAuth2"    # draft plan to .codevoyant/plan/
/plan review my-plan                   # review for capacity, risks, and dependency gaps
/plan approve my-plan --push           # promote to docs/ and push to Linear
```

**Task/architecture-level planning:**

```bash
/plan plan "auth system" --level task  # draft architecture plan with task breakdown + LOE
/plan approve my-plan --push           # promote to docs/architecture/ and create Linear tasks
```

Seed from an existing Linear project or initiative:

```bash
/plan plan https://linear.app/team/project/PRJ-123
```

See the [plan reference](/skills/plan) for all commands.

### flow — end-to-end pipeline orchestration

Flow chains multiple skill invocations into a named pipeline that runs sequentially.

```bash
/flow new my-pipeline \
  "/explore new how the auth middleware works" \
  "/spec new refactor auth middleware" \
  "/spec go"

/flow go my-pipeline      # execute all steps sequentially
/flow status my-pipeline  # check checklist state
```

Pipelines live in `.codevoyant/flows/{name}/flow.md` — under the shared per-project store `~/.codevoyant/<project-slug>/`, which `.codevoyant` symlinks to.

See the [flow reference](/skills/flow) for all commands.

### pm — product roadmaps and PRDs _(Experimental)_

PM covers product planning: phased roadmaps, per-feature PRDs, and Linear integration.

```bash
/pm explore "mobile onboarding"       # research a topic, deposit artifact for /pm plan
/pm plan quarter                      # draft quarterly roadmap
/pm prd "user authentication"         # standalone PRD
/pm approve my-roadmap --push         # promote to docs/ and push to Linear initiative
```

See the [pm reference](/skills/pm) for all commands.

### ux — prototyping and style research _(Experimental)_

UX supports frontend design exploration: full SvelteKit prototypes, lightweight wireframes, and style extraction from live sites.

**Scaffold a prototype:**

```bash
/ux prototype "admin dashboard"       # full SvelteKit + shadcn-svelte prototype
```

**Quick wireframe or comparison:**

```bash
/ux explore "checkout flow"              # single self-contained HTML wireframe
/ux explore "nav layouts" --slideshow    # compare multiple approaches in one file
```

**Extract styles from a live site:**

```bash
/ux style-synthesize https://example.com
```

See the [ux reference](/skills/ux) for all commands.

## Skills

Skills are invoked once to do a single, well-defined job — create a draft PR, run a smoke test, or file a bug report. They don't manage multi-step state; they just do the thing and finish.

### pr — AI-powered code review

PR orchestrates the full review lifecycle: generating inline comments from a diff, addressing reviewer feedback, and publishing the completed review.

**Open a draft PR/MR:**

```bash
/pr open              # create draft PR/MR with feature template
/pr open --bug        # bug fix template
```

**Review an open PR/MR:**

```bash
/pr review             # generate professional inline review comments from the diff
/pr review 42          # review a specific PR/MR number
```

**Address review comments on your PR/MR:**

```bash
/pr address            # pull open threads, propose fixes, apply approved changes
```

**Publish a pending draft:**

```bash
/pr publish                    # submit the draft review AND mark the PR/MR ready
/pr publish --review-only      # submit just the draft review
```

Review documents live in `.codevoyant/review/{slug}/` and are reusable across `review`, `address`, and `publish` invocations.

See the [pr reference](/skills/pr) for all commands.

### qa — bug investigation and smoke testing

```bash
/qa debug login-crash --desc "App crashes on Google OAuth"
    # investigate, write .codevoyant/qa/login-crash/debug-report.md

/qa smoke https://myapp.com/checkout
    # browser-agent smoke test, writes smoke-report.md

/qa report login-crash --github
/qa report login-crash --linear --team ENG
    # post report as issue to GitHub or Linear
```

See the [qa reference](/skills/qa) for all commands.

### skill — build and maintain skills

Skill gives you a workflow for building your own codevoyant-compatible skills, and a feedback loop for reporting issues to skill authors.

```bash
/skill explore "linear integration"   # research what already exists
/skill new linear-push                # scaffold from template
/skill critique linear-push           # audit quality before shipping
/skill feedback spec                  # open a GitHub/GitLab issue for a skill problem
```

See the [skill reference](/skills/skill) for all commands and a guide to building skills.

### task — run project tasks

Detects your task runner (mise, just, task.dev, or npm scripts) and provides a consistent interface:

```bash
/task                   # list all available tasks
/task run build         # run a named task
/task detect            # show which runner was detected
```

Other skills call `/task` internally before running raw commands like `tsc` or `vitest` — ensuring the project's own conventions are always followed.

See the [task reference](/skills/task) for all commands.

## Domains

**Domains** — the specialized technical domains (`compgeo`, `hpc`, `mle`, `llm`) have moved to the diffwiki knowledgebase (`~/.diffwiki/collections/`). Query them with `diffwiki search query "<phrase>" -c <name>` or `/dw-recall`.

## Tools

Tools wrap CLIs and platform APIs with focused workflows. They are invoked directly and handle the details of each platform.

### git

```bash
/git commit             # format, generate conventional commit message, commit, and push
/git commit --atomic    # split into multiple logical commits
/git rebase main        # interactive rebase, handles conflict sides correctly
```

See the [git reference](/skills/git) for all commands.

### gh / glab

Platform-specific skills for GitHub (`gh`) and GitLab (`glab`). Used directly or called internally by `/pr`.

```bash
/gh ci                  # watch GitHub Actions for the current branch (background)
/gh ci --autofix        # fix failures and re-push automatically
/gh report-issue        # file a bug report as a GitHub issue
/glab ci                # watch GitLab CI for the current branch (background)
/glab ci --autofix      # fix failures and re-push automatically
/glab report-issue      # file a bug report as a GitLab issue
```

See the [gh reference](/skills/gh) and [glab reference](/skills/glab) for all commands.

### linear

```bash
/linear report-issue --team ENG --title "Login crashes on Safari"
/linear report-issue --from .codevoyant/qa/login-crash/debug-report.md --team ENG
```

Requires the Linear MCP server configured in Claude Code. See the [linear reference](/skills/linear) for all commands.

### changelog / cz / release

Conventional commit hygiene and version introspection tools.

```bash
/changelog retcon           # propose commit message edits for the current branch
/changelog retcon --apply   # apply edits via rebase and force-push
/changelog preview          # show predicted changelog and next version inline
/cz                         # show current and predicted next version (commitizen)
/release                    # show current and predicted next version (semantic-release / release-it)
```

See the [changelog reference](/skills/changelog), [cz reference](/skills/cz), and [release reference](/skills/release) for all commands.

## Context Skills

Context skills activate automatically when relevant files are detected — no invocation needed. The agent loads targeted recipes on demand before writing or reviewing code.

| Files detected | Skill |
|---|---|
| `mise.toml`, `.mise.toml` | [mise](/skills/mise) — task conventions, tool pinning, language-specific setup |
