<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/pm.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# PM Plugin <Badge type="warning" text="Experimental" />

Product management -- product roadmaps, feature PRDs, prioritization review, and Linear integration.

The pm plugin structures product planning work: phased roadmaps with market context and feature prioritization, per-feature PRDs with acceptance criteria and metrics, coverage and feasibility review, and conversational plan updates.

## Installation

**Claude Code:**
```bash
/plugin marketplace add cloudvoyant/codevoyant
/plugin install pm
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflows

### Plan a product roadmap

```bash
/pm:plan quarter                                  # Quarterly product roadmap
/pm:plan half                                     # Half-year roadmap
/pm:plan annual                                   # Annual roadmap
```

Produces `roadmap.md` in `docs/product/roadmaps/` with phased feature prioritization. Generates inline PRDs per feature and optionally attaches to a Linear initiative. `pm:review` launches automatically in the background on completion.

### Write a PRD for a single feature

```bash
/pm:prd "user authentication"                     # Standalone PRD
/pm:prd https://linear.app/team/issue/ENG-42      # Seed from a Linear issue
```

Writes a structured PRD to `docs/prd/` with problem statement, goals, requirements tables, acceptance criteria, and non-goals.

### Review a roadmap

```bash
/pm:review                          # Auto-selects most recent plan
/pm:review my-roadmap               # Review specific plan
/pm:review my-roadmap --silent      # Suppress output
```

Checks coverage gaps, prioritization quality, missing PRDs, and strategic coherence.

### Update a plan

```bash
/pm:update my-plan "add mobile support feature"    # Conversational change
/pm:update my-plan --bg                            # Apply annotations in background
```

Applies inline `>` and `>>` annotations or accepts conversational changes to roadmap and PRD files.

## Skills

| Skill | Description |
|---|---|
| `pm:plan` | Product roadmap planning with feature prioritization and Linear attachment |
| `pm:prd` | Structured PRD from a feature description or ticket URL |
| `pm:review` | Review a product roadmap for coverage, prioritization, and feasibility |
| `pm:update` | Update a PM roadmap or PRD via annotations or conversational changes |
| `pm:allow` | Pre-approve pm plugin permissions for uninterrupted agent execution |
| `pm:help` | List all pm commands |
