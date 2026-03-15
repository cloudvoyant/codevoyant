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

## Style — build, evolve, and enforce your CLAUDE.md style guide

The style plugin manages a context-aware `CLAUDE.md`. Rules are tagged so only the relevant ones load per task — about 74% fewer tokens than loading everything.

Start by generating a style guide from your existing stack:

```bash
/style:init     # detects your stack and creates CLAUDE.md with context tags
```

Add rules as you go — whenever you find yourself correcting the AI on something, capture it:

```bash
/style:add "Use justfile recipes" --context build,tools
/style:add "Prefer const over let" --context code,typescript
```

The plugin also learns on its own. Run `/style:learn` periodically and it'll suggest rules based on patterns it observed in your sessions. Once you've built up a guide, `/style:review` checks recent work against it and `/style:doctor` trims bloat and fixes structural issues.

See the [Style plugin reference](/plugins/style) for all skills.
