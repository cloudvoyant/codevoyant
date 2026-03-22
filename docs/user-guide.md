# User Guide

> New here? Start with [Installation](/installation).

---

## Spec — plan and execute complex work

Spec gives you a structured planning layer. You write a plan with AI assistance, then execute it step-by-step or hand it off to a background agent.

**Typical flow:**

```bash
/spec:new my-feature        # Explores requirements and creates plan + implementation files
/spec:go my-feature         # Execute interactively, with review stops between phases
/spec:done my-feature       # Archive the plan and optionally commit
```

For long or routine tasks, run in the background instead:

```bash
/spec:new my-feature
/spec:bg my-feature         # Background agent works while you do other things
/spec:list                  # Check progress across all plans
/spec:done my-feature
```

You can have multiple plans active at once — `/spec:list` shows all of them. Plans live in `.codevoyant/plans/{name}/` with a high-level `plan.md` and per-phase `implementation/` files.

See the [Spec skills reference](/skills/spec) for all skills.

---

## Dev — commits, review, and CI

Dev handles the mechanical parts of the development loop.

**Committing:**

```bash
/dev:commit
```

Runs formatters, analyzes staged changes, generates a conventional commit message for your review, then commits, pushes, and starts CI monitoring in the background. Use `--atomic` to split logical change groups into separate commits.

**Before opening a PR:**

```bash
/dev:review     # structured code review
/dev:commit     # fix and commit anything flagged
```

**Fixing PR review comments:**

```bash
/dev:pr-fix     # fetches open review threads and proposes fixes (doesn't apply them)
```

**Rebasing safely:**

```bash
/dev:rebase main    # handles conflict marker sides correctly
```

**Watching CI:**

```bash
/dev:ci             # runs in background, notifies you when done
/dev:ci --autofix   # automatically fixes failures and re-pushes
```

**Architecture planning:**

```bash
/dev:plan "auth system" --mode arch   # draft architecture plan with task breakdown + LOE
/dev:approve my-plan --push           # promote to docs/architecture/ and create Linear tasks
```

See the [Dev skills reference](/skills/dev) for all skills.

---

## EM — engineering project planning *(Experimental)*

EM structures engineering planning: milestone-grouped task plans, capacity and dependency review, and sync with your team's Linear workspace.

**Plan a project:**

```bash
/em:plan "migrate auth to OAuth2"     # draft plan to .codevoyant/plans/
/em:review my-plan                    # review for capacity, risks, and dependency gaps
/em:approve my-plan --push            # promote to docs/ and push to Linear
```

**Seed from an existing Linear project:**

```bash
/em:plan https://linear.app/team/project/PRJ-123
```

See the [EM skills reference](/skills/em) for all skills.

---

## PM — product roadmaps and PRDs *(Experimental)*

PM covers product planning: phased roadmaps with market context and feature prioritization, per-feature PRDs, coverage and feasibility review, and Linear integration.

**Research first, then plan:**

```bash
/pm:explore "mobile onboarding"         # research a topic, deposit artifact for pm:plan
/pm:plan quarter                         # draft quarterly roadmap
/pm:review my-roadmap --bg              # background review
/pm:approve my-roadmap --push           # promote to docs/ and push to Linear initiative
```

**Single feature:**

```bash
/pm:prd "user authentication"           # standalone PRD
```

See the [PM skills reference](/skills/pm) for all skills.

---

## UX — prototyping and style research *(Experimental)*

UX supports frontend design exploration: full SvelteKit prototypes with feature-slice architecture, lightweight single-file wireframes, and automated style extraction from live sites.

**Scaffold a prototype:**

```bash
/ux:prototype "admin dashboard"    # full SvelteKit + shadcn-svelte prototype
```

Asks whether to scaffold in-repo (single package or monorepo) or out-of-repo. Builds feature-slice structure, implements a layout first, then generates each feature with view-models, factories, and fake data.

**Quick wireframe or approach comparison:**

```bash
/ux:explore "checkout flow"              # single HTML wireframe, no build step
/ux:explore "nav layouts" --slideshow    # compare multiple approaches in one file
```

Outputs a self-contained `.html` file using Tailwind CDN — open directly in a browser.

**Extract styles from a live site:**

```bash
/ux:style-synthesize https://example.com
```

Screenshots the site at mobile/tablet/desktop breakpoints, analyzes typography, color, and layout patterns, and writes `docs/ux/style-research/{source}/style-report.md` + `theme.css`.

See the [UX skills reference](/skills/ux) for all skills.

---

## Skill — build and maintain skills

Skill gives you a structured workflow for building your own Claude Code / Agent Skills compatible skills: research what already exists, scaffold from a template, iterate, and run quality reviews before shipping.

**Typical workflow:**

```bash
/skill:explore "linear integration"   # research existing skills first
/skill:new linear-push                # scaffold from template
/skill:update linear-push             # refine any steps
/skill:review linear-push             # audit spec compliance + effectiveness
```

See the [Skill skills reference](/skills/skill) for all skills.

---

## Mem — team knowledge capture and recall

Mem (and the `mem` CLI commands) lets you capture team conventions, decisions, and procedures as indexed markdown docs. Knowledge loads into AI context at session start so the agent always knows your team's rules.

**First-time setup (once per project):**

```bash
/mem:init                   # Writes CLAUDE.md so knowledge loads every session
```

**Capture knowledge as you work:**

```bash
/mem:learn always use pnpm           # Writes styleguide/pnpm-over-npm.md with frontmatter
/mem:learn how to deploy to staging  # Writes recipes/deploy-staging.md with frontmatter
```

**Load knowledge at session start:**

```bash
/mem:list               # Prints terse table of all indexed docs into context
```

After running `mem:init`, this happens automatically.

**Search for specific knowledge:**

```bash
/mem:find --tag deployment         # Find docs tagged "deployment"
/mem:find --type recipe --json     # Full JSON output
```

**Frontmatter convention:** Knowledge docs are regular `.md` files with YAML frontmatter. The `type` field (`styleguide` or `recipe`) and `tags` array drive all lookup. Files can live anywhere in the project root -- the indexer scans automatically, excluding `node_modules/`, `.codevoyant/`, and `.git/`.

```yaml
---
type: styleguide
tags: [tooling, package-manager]
description: Always use pnpm, never npm or yarn
status: active
---
```

**Works without installing:** All `mem` commands are available via `npx @codevoyant/agent-kit mem <command>`.

See the [Mem skills reference](/skills/mem) for all skills.
