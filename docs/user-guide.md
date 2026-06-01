# User Guide

> New here? Start with [Installation](/installation).

## How Skills Work

Skills are slash commands that load focused instructions into your AI agent's context before it acts. There are three kinds:

- **Workflows** — multi-step planning and execution flows for engineering and product work (spec, dev, em, pm, ux).
- **Task skills** — discrete operations you invoke directly for a single, well-defined job (git, tasks, skill).
- **Context skills** — activate automatically based on files in your project; no invocation needed (sveltekit, typescript, docker, and others).

**Invoking a skill:**

```bash
/spec new
/git commit
/tasks list
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

### dev — architecture, exploration, and PR/MR

Dev handles the higher-level parts of the development loop.

**Open a PR or MR:**

```bash
/dev pr                 # creates PR/MR into main, auto-detects GitHub vs GitLab
/dev pr staging         # target a different base branch
/dev pr --draft         # create as draft
```

**Fix review comments on an existing PR/MR:**

```bash
/dev pr-fix             # fetches open review threads and proposes fixes (doesn't apply them)
```

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

### em — engineering project planning *(Experimental)*

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

### pm — product roadmaps and PRDs *(Experimental)*

PM covers product planning: phased roadmaps, per-feature PRDs, and Linear integration.

```bash
/pm explore "mobile onboarding"       # research a topic, deposit artifact for /pm plan
/pm plan quarter                      # draft quarterly roadmap
/pm prd "user authentication"         # standalone PRD
/pm approve my-roadmap --push         # promote to docs/ and push to Linear initiative
```

See the [pm reference](/skills/pm) for all commands.

### ux — prototyping and style research *(Experimental)*

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

## Task Skills

Task skills are invoked once to do a single, well-defined job — commit code, run a build task, or file a bug report. They don't manage multi-step state; they just do the thing and finish.

### git — commits, CI, and rebase

```bash
/git commit             # format, generate conventional commit message, commit, push, monitor CI
/git commit --atomic    # split into multiple logical commits
/git rebase main        # interactive rebase, handles conflict sides correctly
/git ci                 # monitor CI in background, notify when done
/git ci --autofix       # automatically fix failures and re-push
```

See the [git reference](/skills/git) for all commands.

### tasks — run project tasks

Detects your task runner (mise, just, task.dev, or npm scripts) and provides a consistent interface:

```bash
/tasks                  # list all available tasks
/tasks run build        # run a named task
/tasks detect           # show which runner was detected
```

Other skills call `/tasks` internally before running raw commands like `tsc` or `vitest` — ensuring the project's own conventions are always followed.

See the [tasks reference](/skills/tasks) for all commands.

### skill — build, maintain, and report skills

Skill gives you a workflow for building your own codevoyant-compatible skills, and a feedback loop for reporting issues to skill authors.

```bash
/skill explore "linear integration"   # research what already exists
/skill new linear-push                # scaffold from template
/skill critique linear-push           # audit quality before shipping
/skill feedback spec                  # open a GitHub/GitLab issue for a skill problem
```

See the [skill reference](/skills/skill) for all commands and a guide to building skills.

## Context Skills

Context skills activate automatically based on files in your project — no invocation needed. The agent loads the relevant recipes before writing or reviewing code.

| Files detected | Skill loaded |
|---|---|
| `*.svelte`, `*.svelte.ts` | **sveltekit** — feature-slice architecture, Svelte 5 runes, shadcn-svelte |
| `*.ts`, `tsconfig.json` | **typescript** — unknown catch, library types, Zod generic bounds |
| `Dockerfile`, `docker-compose.yml` | **docker** — multi-stage builds, Compose, cross-platform, GCP registry |
| `mise.toml`, `.mise.toml` | **mise** — task conventions, tool pinning, language-specific setup |
| `*.tf`, `GCP_` env vars in mise.toml | **gcp** — Artifact Registry, Cloud Run, gcloud auth |
| `*.tf` files | **terraform** — directory structure, backends, workspaces, variable management |

Each skill loads targeted recipes on demand rather than dumping everything into context at once — so only what's relevant to the current task gets loaded.

See individual skill pages for recipe details: [sveltekit](/skills/sveltekit) · [typescript](/skills/typescript) · [docker](/skills/docker) · [mise](/skills/mise) · [gcp](/skills/gcp) · [terraform](/skills/terraform)
