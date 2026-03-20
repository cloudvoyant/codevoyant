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
