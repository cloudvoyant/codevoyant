<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/em.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# EM Plugin <Badge type="warning" text="Experimental" />

Engineering management -- project planning, task breakdowns, roadmap review, and Linear integration.

The em plugin gives AI agents structured workflows for planning engineering work: milestone-grouped task plans with Linear as the primary tracker, capacity and dependency review, and conversational plan updates.

## Installation

**Claude Code:**
```bash
/plugin marketplace add cloudvoyant/codevoyant
/plugin install em
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflows

### Plan a project

```bash
/em:plan "migrate auth to OAuth2"                     # Plan locally, push to Linear on confirmation
/em:plan https://linear.app/team/project/PRJ-123      # Seed from existing Linear project
/em:plan "Q3 infrastructure" --delegate                # Create stub issues for PM/UX/dev
```

Produces a local milestone-grouped task plan, then pushes to Linear on user confirmation. The `--delegate` flag creates stub issues instead of a full breakdown, useful when different people will own different parts.

### Continue from existing Linear state

```bash
/em:plan --continue PRJ-123                            # Resume from existing Linear project
/em:plan --push my-plan-slug                           # Re-push a saved local plan to Linear
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
| `em:plan` | Plan a project locally with milestone-grouped tasks, then push to Linear |
| `em:review` | Review a roadmap for capacity, dependencies, risks, and phasing |
| `em:update` | Update an EM plan via annotations or conversational changes |
| `em:allow` | Pre-approve em plugin permissions for uninterrupted agent execution |
| `em:help` | List all em commands |
