<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/em.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# EM <Badge type="warning" text="Experimental" />

Engineering management -- project planning, task breakdowns, roadmap review, and Linear integration.

The EM skills give AI agents structured workflows for planning engineering work: milestone-grouped task plans with Linear as the primary tracker, capacity and dependency review, and conversational plan updates.

## Installation

**Claude Code:**
```bash
npx skills add cloudvoyant/codevoyant
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflows

### Plan a project

```bash
/em:plan "migrate auth to OAuth2"                     # Draft plan locally
/em:plan https://linear.app/team/project/PRJ-123      # Seed from existing Linear project
```

Produces a local milestone-grouped task plan in `.codevoyant/plans/{slug}/`. Use `/em:approve` to promote to `docs/engineering/plans/` and optionally push to Linear.

### Approve and push to Linear

```bash
/em:approve                                           # Approve most recent em:plan draft
/em:approve my-plan                                   # Approve specific plan by slug
/em:approve my-plan --push                            # Approve and create new Linear project
/em:approve my-plan --push https://linear.app/...    # Approve and push to existing project
```

Sets start/end dates on the Linear project from the plan's timeline. Creates milestones from the plan's milestone headings (M1, M2, etc.). Copies research artifacts to `docs/engineering/plans/{slug}/research/`. Issue creation is handled separately by `dev:plan`.

### Continue from existing Linear state

```bash
/em:plan --continue PRJ-123                           # Resume from existing Linear project
```

### Review a roadmap

```bash
/em:review                          # Auto-selects most recent plan
/em:review my-roadmap               # Review specific plan
/em:review my-roadmap --silent      # Suppress output
```

Checks capacity realism, dependency gaps, missing risks, and phasing quality. Auto-launched after `em:plan` completes.

### Update a plan

```bash
/em:update my-plan "add error handling milestone"      # Conversational change
/em:update my-plan --bg                                # Apply annotations in background
```

Applies inline `>` and `>>` annotations or accepts conversational changes to plan files.

## Skills

| Skill | Description |
|---|---|
| `em:plan` | Draft an engineering project plan locally with milestone-grouped tasks |
| `em:approve` | Promote a draft plan to `docs/engineering/plans/` and optionally push to Linear |
| `em:review` | Review a roadmap for capacity, dependencies, risks, and phasing |
| `em:update` | Update an EM plan via annotations or conversational changes |
| `em:allow` | Pre-approve em permissions for uninterrupted agent execution |
| `em:help` | List all em commands |
