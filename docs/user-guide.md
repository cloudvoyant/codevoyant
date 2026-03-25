# User Guide

> New here? Start with [Installation](/installation).

---

## Spec — plan and execute complex work

Spec gives you a structured planning layer. You write a plan with AI assistance, then execute it step-by-step or hand it off to a background agent.

**Typical flow:**

```bash
/spec new my-feature        # Explores requirements and creates plan + implementation files
/spec go my-feature         # Execute interactively, with review stops between phases
/spec done my-feature       # Archive the plan and optionally commit
```

For long or routine tasks, run in the background instead:

```bash
/spec new my-feature
/spec bg my-feature         # Background agent works while you do other things
/spec list                  # Check progress across all plans
/spec done my-feature
```

You can have multiple plans active at once — `/spec list` shows all of them. Plans live in `.codevoyant/plans/{name}/` with a high-level `plan.md` and per-phase `implementation/` files.

See the [Spec skills reference](/skills/spec) for all skills.

---

## Git — commits, CI, and rebase

Git handles the mechanical parts of the commit loop.

**Committing:**

```bash
/git commit
```

Runs formatters, analyzes staged changes, generates a conventional commit message for your review, then commits, pushes, and starts CI monitoring in the background. Use `--atomic` to split logical change groups into separate commits.

**Rebasing safely:**

```bash
/git rebase main    # handles conflict marker sides correctly
```

**Watching CI:**

```bash
/git ci             # runs in background, notifies you when done
/git ci --autofix   # automatically fixes failures and re-pushes
```

See the [Git skills reference](/skills/git) for all skills.

---

## Dev — architecture, exploration, and PR/MR

Dev handles the higher-level parts of the development loop.

**Open a PR or MR:**

```bash
/dev pr                 # creates PR/MR into main, auto-detects GitHub vs GitLab
/dev pr staging         # target a different base branch
/dev pr --draft         # create as draft
```

**Fix review comments on an existing PR/MR:**

```bash
/dev pr-fix     # fetches open review threads and proposes fixes (doesn't apply them)
```

**Architecture planning:**

```bash
/dev plan "auth system" --mode arch   # draft architecture plan with task breakdown + LOE
/dev approve my-plan --push           # promote to docs/architecture/ and create Linear tasks
```

See the [Dev skills reference](/skills/dev) for all skills.

---

## EM — engineering project planning *(Experimental)*

EM structures engineering planning: milestone-grouped task plans, capacity and dependency review, and sync with your team's Linear workspace.

**Plan a project:**

```bash
/em plan "migrate auth to OAuth2"     # draft plan to .codevoyant/plans/
/em review my-plan                    # review for capacity, risks, and dependency gaps
/em approve my-plan --push            # promote to docs/ and push to Linear
```

**Seed from an existing Linear project:**

```bash
/em plan https://linear.app/team/project/PRJ-123
```

See the [EM skills reference](/skills/em) for all skills.

---

## PM — product roadmaps and PRDs *(Experimental)*

PM covers product planning: phased roadmaps with market context and feature prioritization, per-feature PRDs, coverage and feasibility review, and Linear integration.

**Research first, then plan:**

```bash
/pm explore "mobile onboarding"         # research a topic, deposit artifact for /pm plan
/pm plan quarter                         # draft quarterly roadmap
/pm review my-roadmap --bg              # background review
/pm approve my-roadmap --push           # promote to docs/ and push to Linear initiative
```

**Single feature:**

```bash
/pm prd "user authentication"           # standalone PRD
```

See the [PM skills reference](/skills/pm) for all skills.

---

## UX — prototyping and style research *(Experimental)*

UX supports frontend design exploration: full SvelteKit prototypes with feature-slice architecture, lightweight single-file wireframes, and automated style extraction from live sites.

**Scaffold a prototype:**

```bash
/ux prototype "admin dashboard"    # full SvelteKit + shadcn-svelte prototype
```

Asks whether to scaffold in-repo (single package or monorepo) or out-of-repo. Builds feature-slice structure, implements a layout first, then generates each feature with view-models, factories, and fake data.

**Quick wireframe or approach comparison:**

```bash
/ux explore "checkout flow"              # single HTML wireframe, no build step
/ux explore "nav layouts" --slideshow    # compare multiple approaches in one file
```

Outputs a self-contained `.html` file using Tailwind CDN — open directly in a browser.

**Extract styles from a live site:**

```bash
/ux style-synthesize https://example.com
```

Screenshots the site at mobile/tablet/desktop breakpoints, analyzes typography, color, and layout patterns, and writes `docs/ux/style-research/{source}/style-report.md` + `theme.css`.

See the [UX skills reference](/skills/ux) for all skills.

---

## Skill — build and maintain skills

Skill gives you a structured workflow for building your own Claude Code / Agent Skills compatible skills: research what already exists, scaffold from a template, iterate, and run quality reviews before shipping.

**Typical workflow:**

```bash
/skill explore "linear integration"   # research existing skills first
/skill new linear-push                # scaffold from template
/skill update linear-push             # refine any steps
/skill review linear-push             # audit spec compliance + effectiveness
```

See the [Skill skills reference](/skills/skill) for all skills.

---

## Mem — team knowledge (CLI only)

Mem lets you capture team conventions, decisions, and procedures as indexed markdown docs. Knowledge loads into AI context at session start so the agent always knows your team's rules.

The `/mem *` slash commands have been removed — use the `npx @codevoyant/agent-kit mem` CLI directly.

**Index and load knowledge:**

```bash
npx @codevoyant/agent-kit mem list      # Load all indexed docs into context
npx @codevoyant/agent-kit mem index     # Re-index after manual edits
npx @codevoyant/agent-kit mem find --tag deployment
```

Add `npx @codevoyant/agent-kit mem list` to your `CLAUDE.md` to load knowledge automatically at session start.

See the [Mem reference](/skills/mem) for the full CLI.
