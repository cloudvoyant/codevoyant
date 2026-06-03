# User Guide

> New here? Start with [Installation](/installation).

## How Skills Work

Skills are slash commands that load focused instructions into your AI agent's context before it acts. There are five kinds:

- **Workflows** — multi-step planning and execution flows for engineering and product work (spec, dev, flow, em, pm, ux).
- **Skills** — discrete operations you invoke directly for a single, well-defined job (pr, qa, skill, task).
- **Tools** — CLI and platform integrations (git, gh, glab, linear, and others).
- **Context Skills** — activate automatically when relevant files are detected; no invocation needed (sveltekit, react, tanstack, typescript, python, cpp, docker, mise, gcp, aws, terraform).

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
/em plan add webhook support to the notifications API
/dev explore how the auth middleware works
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

Plans live in `.codevoyant/plans/{name}/` with a high-level `plan.md` and per-phase `implementation/` files. Multiple plans can be active at once.

See the [spec reference](/skills/spec) for all commands.

### dev — architecture and exploration

Dev handles the higher-level parts of the development loop.

**Architecture planning:**

```bash
/dev plan "auth system" --mode arch   # draft architecture plan with task breakdown + LOE
/dev approve my-plan --push           # promote to docs/architecture/ and create Linear tasks
```

**Technical exploration:**

```bash
/dev explore "caching strategy"       # research approaches, generate parallel proposals
```

See the [dev reference](/skills/dev) for all commands.

### flow — end-to-end pipeline orchestration

Flow chains multiple skill invocations into a named pipeline that runs sequentially.

```bash
/flow new my-pipeline \
  "/dev explore how the auth middleware works" \
  "/spec new refactor auth middleware" \
  "/spec go"

/flow go my-pipeline      # execute all steps sequentially
/flow status my-pipeline  # check checklist state
```

Pipelines live in `.codevoyant/flows/{name}/flow.md`.

See the [flow reference](/skills/flow) for all commands.

### em — engineering project planning _(Experimental)_

EM structures engineering planning: milestone-grouped task plans, capacity and dependency review, and sync with Linear.

```bash
/em plan "migrate auth to OAuth2"     # draft plan to .codevoyant/plans/
/em review my-plan                    # review for capacity, risks, and dependency gaps
/em approve my-plan --push            # promote to docs/ and push to Linear
```

Seed from an existing Linear project:

```bash
/em plan https://linear.app/team/project/PRJ-123
```

See the [em reference](/skills/em) for all commands.

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
/pr complete           # submit the draft review
/pr complete --event APPROVE
```

Review documents live in `.codevoyant/review/{slug}/` and are reusable across `review`, `address`, and `complete` invocations.

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

**Domains** are hyperspecialized skills for technical domains that don't fit neatly into the language or framework categories. Current domains: `compgeo` (computational geometry), `hpc` (high-performance computing), and `mle` (machine learning engineering). All are experimental.

`compgeo` is the first domain skill with full recipe coverage — 11 recipes spanning Python (trimesh, open3d), C++ (CGAL, Embree, OpenVDB), and TypeScript (three.js, threlte) for meshes, voxels, point clouds, SDFs, and real-time visualization. See the [compgeo reference](/skills/compgeo) for the full recipe list.

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

## Context Skills

Context skills activate automatically when relevant files are detected — no invocation needed. The agent loads targeted recipes on demand before writing or reviewing code.

| Files detected | Skill |
|---|---|
| `*.svelte`, `*.svelte.ts` | [sveltekit](/skills/sveltekit) — feature-slice architecture, Svelte 5 runes, shadcn-svelte, auth sessions, remote functions |
| `@tanstack/` in `package.json` | [tanstack](/skills/tanstack) — Router v1, Query v5, Form, server functions |
| `*.tsx`, React in `package.json` (non-SvelteKit) | [react](/skills/react) — Zustand, shadcn/ui, Tailwind CSS, React Three Fiber, data fetching |
| `*.ts`, `tsconfig.json` | [typescript](/skills/typescript) — pnpm workspaces, publishing, Vitest, ESLint flat config, GitLab CI |
| `pyproject.toml`, `uv.lock` | [python](/skills/python) — uv workspace, MLflow, Ray, Warp GPU, Pydantic, Click |
| `CMakeLists.txt`, `conanfile.py` | [cpp](/skills/cpp) — CMake, Conan 2, gRPC, code standards, release profiles |
| `Dockerfile`, `docker-compose.yml` | [docker](/skills/docker) — multi-stage builds, Compose, cross-platform, GCP registry |
| `mise.toml`, `.mise.toml` | [mise](/skills/mise) — task conventions, tool pinning, language-specific setup |
| `*.tf`, `GCP_` env vars | [gcp](/skills/gcp) — Cloud Run, Artifact Registry, gcloud auth |
| `*.tf`, `AWS_` env vars | [aws](/skills/aws) — ECS, Lambda, S3 backend, Ray clusters, Firecracker |
| `*.tf` (generic) | [terraform](/skills/terraform) — backends, workspaces, variable management |
