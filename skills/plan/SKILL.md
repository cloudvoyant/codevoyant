---
name: plan
description: 'Planning at every level: a single task, a project, an initiative, or a whole product. Drafts plans to .codevoyant/plans/, promotes them to docs/, and syncs to Linear (issues for task/architecture-level plans, milestones for project/initiative plans). Triggers on: "plan plan", "plan approve", "plan review", "plan update", "plan allow", "plan help", "plan an epic", "project planning", "initiative planning", "task planning", "architecture plan", "engineering roadmap", "eng plan".'
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# plan

Planning skill dispatcher (renamed from `em`). Covers planning at the level of multiple tasks, projects, initiatives, or products — JIRA's issues, tasks, stories, and epics. Drafts land in `.codevoyant/plans/{slug}/`; approval promotes them to docs and optionally syncs to Linear.

> **Location note:** this skill lives at `skills/plan/` and is invoked as `/plan`. Drafts land in `.codevoyant/plans/` (backward-compatible with the em store) until a migration MR moves spec plans to `.codevoyant/spec` and plan plans to `.codevoyant/plan`.

## Inline Usage

Pass your intent directly on the invocation line — `plan` proceeds immediately with no opening question when a description is provided.

```
/plan plan add webhook support to the notifications API
/plan plan migrate auth to OAuth2 --level task
/plan plan https://linear.app/team/project/PRJ-123
/plan approve my-plan --push
```

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches
- **Step 0 always runs first** — no exceptions
- **Unknown verb → run `help.md`** — never error silently
- **Pass all remaining args through** — workflow receives `$REMAINING_ARGS` unchanged
- **Markdown output: soft-wrap prose, never hard-wrap** — when any plan workflow or agent writes a `.md` artifact (plans, roadmaps, research notes), write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

## Step 0: Parse Arguments

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")    VERB="help" ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **plan** (`references/workflows/plan.md`) — plan at task, project, initiative, or product level (`--level task|project|initiative|product`); task/architecture-level planning routes to `plan-task.md`
- **approve** (`references/workflows/approve.md`) — promote a plan to docs/ and sync to Linear (issues for task-level plans, milestones for project/initiative plans)
- **review** (`references/workflows/review.md`) — review plan quality and realism
- **update** (`references/workflows/update.md`) — apply feedback or annotations to an existing plan
- **allow** (`references/workflows/allow.md`) — pre-approve permissions for background agents
- **help** (`references/workflows/help.md`) — print command reference

## Agent Index

- **linear-tasks-agent** (`agents/linear-tasks-agent.md`) — pushes task/architecture-level plan tasks to Linear as issues; used by approve for task-level plans
- **linear-push-agent** (`agents/linear-push-agent.md`) — pushes project/initiative-level plans to Linear as projects and milestones; used by approve for project/initiative-level plans
