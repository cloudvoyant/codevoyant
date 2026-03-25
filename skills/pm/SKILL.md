---
name: pm
description: 'Product management workflows: explore product areas, plan quarterly roadmaps, write PRDs, approve initiatives in Linear, review roadmap quality, or update plans. Triggers on: "pm plan", "pm prd", "pm explore", "pm approve", "pm review", "pm update", "pm allow", "pm help", "product roadmap", "quarterly plan", "write a PRD", "product requirements", "product planning", "explore product area".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
disable-model-invocation: true
---

# pm

Product management skill dispatcher.

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")         VERB="help" ;;
  "roadmap")  VERB="plan" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `workflows/{VERB}.md` does not exist, fall back to `workflows/help.md` and note the unknown verb.

## Workflow Index

- **allow** (`workflows/allow.md`) — pre-approve permissions for background agents
- **approve** (`workflows/approve.md`) — promote roadmap to docs/ and push initiatives to Linear
- **explore** (`workflows/explore.md`) — research a product area before planning
- **help** (`workflows/help.md`) — print command reference
- **plan** (`workflows/plan.md`) — create a quarterly/annual product roadmap
- **prd** (`workflows/prd.md`) — write a Product Requirements Document
- **review** (`workflows/review.md`) — review roadmap for quality and coverage
- **update** (`workflows/update.md`) — apply feedback to an existing plan or roadmap

## Agent Index

- **linear-initiative-sync** (`agents/linear-initiative-sync.md`) — syncs initiatives to Linear; used by approve
- **competitive-researcher** (`agents/competitive-researcher.md`) — researches competitive landscape; used by explore
- **ideation-researcher** (`agents/ideation-researcher.md`) — generates product ideas; used by explore
- **internal-researcher** (`agents/internal-researcher.md`) — reviews internal context; used by explore
- **market-researcher** (`agents/market-researcher.md`) — researches market trends; used by explore
- **user-problems-researcher** (`agents/user-problems-researcher.md`) — researches user pain points; used by explore
- **pm-planner** (`agents/pm-planner.md`) — generates roadmap structure; used by plan
