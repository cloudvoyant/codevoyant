<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/pm.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# PM <Badge type="warning" text="Experimental" />

Product management -- product roadmaps, feature PRDs, prioritization review, and Linear integration.

The PM skills structure product planning work: phased roadmaps with market context and feature prioritization, per-feature PRDs with acceptance criteria and metrics, coverage and feasibility review, and conversational plan updates.

## Installation

**Claude Code:**
```bash
npx skills add cloudvoyant/codevoyant
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflows

### Research a product area

```bash
/pm:explore "user onboarding"                     # Research a topic, generate a research artifact
/pm:explore "pricing strategy" --bg               # Run in background
```

Deposits a research artifact to `.codevoyant/explore/{slug}/summary.md` for use by `pm:plan` and `pm:prd`.

### Plan a product roadmap

```bash
/pm:plan quarter                                  # Quarterly product roadmap
/pm:plan half                                     # Half-year roadmap
/pm:plan annual                                   # Annual roadmap
```

Drafts a roadmap to `.codevoyant/roadmaps/` with phased feature prioritization. `pm:review` launches automatically in the background on completion. Use `/pm:approve` to promote to `docs/product/roadmaps/` and optionally push to a Linear initiative.

### Approve and push to Linear

```bash
/pm:approve                                       # Approve most recent pm:plan draft
/pm:approve my-roadmap                            # Approve specific roadmap by slug
/pm:approve my-roadmap --push                     # Approve and create new Linear initiative
/pm:approve my-roadmap --push https://linear.app/...  # Approve and push to existing initiative
```

Copies the full roadmap into the Linear initiative description. Research artifacts become Linear documents attached to the initiative.

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
| `pm:explore` | Research a product area and deposit a research artifact for `pm:plan` / `pm:prd` |
| `pm:plan` | Draft a product roadmap with feature prioritization |
| `pm:approve` | Promote a draft roadmap to `docs/product/roadmaps/` and optionally push to Linear |
| `pm:prd` | Structured PRD from a feature description or ticket URL |
| `pm:review` | Review a product roadmap for coverage, prioritization, and feasibility |
| `pm:update` | Update a PM roadmap or PRD via annotations or conversational changes |
| `pm:allow` | Pre-approve pm permissions for uninterrupted agent execution |
| `pm:help` | List all pm commands |
