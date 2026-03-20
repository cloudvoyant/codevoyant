# User Guide

> New here? Start with [Installation](/installation).

---

## Spec — plan and execute complex work

The spec plugin gives you a structured planning layer. You write a plan with AI assistance, then execute it step-by-step or hand it off to a background agent.

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

See the [Spec plugin reference](/plugins/spec) for all skills.

---

## Dev — commits, review, and CI

The dev plugin handles the mechanical parts of the development loop.

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

See the [Dev plugin reference](/plugins/dev) for all skills.

---

## Em — engineering roadmaps and epic planning *(Experimental)*

The em plugin structures engineering planning: roadmaps with architecture diagrams, detailed epic breakdowns, capacity and dependency review, and sync with your team's tracker.

**Plan a roadmap:**

```bash
/em:plan "Q3 infrastructure work"     # multi-epic roadmap with ASCII architecture diagrams
/em:review my-roadmap --bg            # background review — notifies when done
/em:sync my-roadmap --push            # push to Linear/Notion/GitHub
```

**Single epic:**

```bash
/em:plan "migrate auth to OAuth2"     # single epic; auto-invokes em:breakdown
/em:breakdown my-roadmap "epic name"  # standalone breakdown for an existing roadmap
```

See the [Em plugin reference](/plugins/em) for all skills.

---

## Pm — product roadmaps and PRDs *(Experimental)*

The pm plugin covers product planning: phased roadmaps with market context and feature prioritization, per-feature PRDs, coverage and feasibility review, and doc generation for stakeholders.

**Plan a roadmap:**

```bash
/pm:plan "mobile onboarding redesign"   # phased roadmap; auto-generates PRDs per feature
/pm:review my-roadmap --bg              # background review
```

**Single feature:**

```bash
/pm:prd "user authentication"           # standalone PRD
```

See the [Pm plugin reference](/plugins/pm) for all skills.

---

## Memory — team knowledge capture and recall

The memory plugin (and the `mem` CLI commands) let you capture team conventions, decisions, and procedures as indexed markdown docs. Knowledge loads into AI context at session start so the agent always knows your team's rules.

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
/mem:remember               # Prints terse table of all indexed docs into context
```

After running `mem:init`, this happens automatically.

**Search for specific knowledge:**

```bash
/mem:find --tag deployment         # Find docs tagged "deployment"
/mem:find --type recipe --json     # Full JSON output
```

**Frontmatter convention:** Knowledge docs are regular `.md` files with YAML frontmatter. The `type` field (`styleguide` or `recipe`) and `tags` array drive all lookup. Files can live anywhere in the project root -- the indexer scans automatically, excluding `node_modules/`, `.codevoyant/`, `docs/`, and `.git/`.

```yaml
---
type: styleguide
tags: [tooling, package-manager]
description: Always use pnpm, never npm or yarn
status: active
---
```

**Works without the plugin:** All `mem` commands are available via `npx @codevoyant/agent-kit mem <command>` -- no plugin installation required.

See the [Memory plugin reference](/plugins/memory) for all skills.

---

## UX — prototyping and style research *(Experimental)*

The ux plugin supports frontend design exploration: full SvelteKit prototypes with feature-slice architecture, lightweight single-file wireframes, and automated style extraction from live sites.

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

See the [UX plugin reference](/plugins/ux) for all skills.
