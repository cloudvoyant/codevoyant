---
description: 'Research a product topic or feature area before planning or writing a PRD. Triggers on: "pm explore", "explore product area", "research feature", "pm research", "ideate on feature".'
name: pm:explore
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline.'
argument-hint: '[topic] [--deep] [--bg] [--silent]'
context: fork
model: claude-opus-4-6
---

> **Compatibility**: AskUserQuestion falls back to numbered list on non-Claude-Code platforms.

## Skill Requirements

```bash
command -v npx >/dev/null 2>&1 || echo "MISSING: npx"
```

## Critical Rules

- Never invent market data — every claim must come from a fetched source
- Each research agent writes to its own isolated artifact — never combine within the agent
- Synthesis from sub-artifacts happens only in Step 3, after all agents complete
- One research artifact per topic slug — reuse existing slug directories when extending
- Research artifacts feed pm:plan and pm:prd — deposit them faithfully at the specified paths
- No markdown tables in output — use bullets and definition lists
- Prefer Mermaid diagrams for any visual structure — timelines, competitive maps, process flows. Never use ASCII art for structured diagrams.
- See `references/web-research-standards.md` for source tiers, citation format, and agent output format

## Agent Index

- **internal-researcher** (`agents/internal-researcher.md`) — scans project files for prior art, existing plans, and relevant skills
- **ideation-researcher** (`agents/ideation-researcher.md`) — surfaces unmet needs, market gaps, and JTBD signals via web search
- **market-researcher** (`agents/market-researcher.md`) — validates market size, growth, and existing solution landscape via web search
- **competitive-researcher** (`agents/competitive-researcher.md`) — maps the competitive landscape with per-competitor site fetching
- **user-problems-researcher** (`agents/user-problems-researcher.md`) — researches jobs-to-be-done and behavioral evidence via web search

## Step 0: Parse arguments

```bash
TOPIC="${1:-}"
BG_FLAG=false; SILENT=false; DEEP=false
[[ "$*" =~ --bg|-b ]] && BG_FLAG=true
[[ "$*" =~ --silent ]] && SILENT=true
[[ "$*" =~ --deep ]] && DEEP=true
```

`--deep` escalates research: more searches, more URLs fetched, stricter source tier requirements.

## Step 1: Mode and topic

Ask the user to select exploration mode(s):

```
AskUserQuestion:
  question: "What kind of exploration do you want to do?"
  header: "Explore mode"
  multiSelect: true
  options:
    - label: "Open-ended ideation"
      description: "Problem-seeking and idea generation — discover what's worth building"
    - label: "Feature/idea validation"
      description: "Validate a specific hypothesis with market research and competitive analysis"
    - label: "Competitor deep-dive"
      description: "Focused analysis of specific named competitors"
    - label: "User problem discovery"
      description: "JTBD-style research — surface jobs, pains, and gains from real sources"
```

If TOPIC is empty, ask for it. Derive SLUG (lowercase, hyphenated). Set:
- `OUTPUT_PATH = .codevoyant/explore/{SLUG}/summary.md`
- `SUB_DIR = .codevoyant/explore/{SLUG}/research/`

Ask mode-specific scoping questions (all in one AskUserQuestion call):

- **Open-ended ideation**: "What space or user segment are you curious about? Any early hunches to stress-test?"
- **Feature/idea validation**: "What is the hypothesis? Who is the target user? What would make this validation successful?"
- **Competitor deep-dive**: "Name the competitors to analyze. Dimensions that matter most: pricing, features, positioning, or all?"
- **User problem discovery**: "What job are users trying to get done? Which segments should be prioritized?"

Present a one-paragraph scope summary and confirm before launching agents.

## Step 2: Launch parallel research agents

```bash
mkdir -p ".codevoyant/explore/{SLUG}/research"
```

Tell the user: "Starting parallel research on '{TOPIC}' (modes: {MODES}) — this will take a few minutes."

Spawn the following agents in **a single message** (`run_in_background: true`, model: `claude-sonnet-4-6`). Substitute all `{PLACEHOLDERS}` before spawning — agents receive no outer context.

**Always spawn:**

```yaml
Agent:
  subagent_type: general-purpose
  model: claude-sonnet-4-6
  run_in_background: true
  description: 'pm-explore/internal: {SLUG}'
  prompt: |
    (full content of agents/internal-researcher.md with {TOPIC} → "{TOPIC}", {SLUG} → "{SLUG}" substituted)
```

**Spawn based on selected modes:**

| Mode | Agent file | Output path |
|------|-----------|-------------|
| Open-ended ideation | `agents/ideation-researcher.md` | `{SUB_DIR}ideation.md` |
| Feature/idea validation | `agents/market-researcher.md` | `{SUB_DIR}market.md` |
| Feature/idea validation | `agents/competitive-researcher.md` | `{SUB_DIR}competitive.md` |
| Competitor deep-dive | `agents/competitive-researcher.md` | `{SUB_DIR}competitive.md` |
| User problem discovery | `agents/user-problems-researcher.md` | `{SUB_DIR}user-problems.md` |

For each agent, substitute into the agent file's prompt: `{TOPIC}`, `{SLUG}`, `{DEEP}`, and any mode-specific variables (`{HYPOTHESIS}`, `{TARGET_USER}`, `{NAMED_COMPETITORS}`, `{DIMENSIONS}`, `{JOB_DESCRIPTION}`, `{USER_SEGMENTS}`) gathered in Step 1. If "Competitor deep-dive" and "Feature/idea validation" are both selected, spawn competitive-researcher only once.

Do not send agent calls across separate messages — all must be in one message to run in parallel.
Wait for all agents to complete before continuing.

## Step 3: Synthesize and write artifact

Read all sub-artifacts in `.codevoyant/explore/{SLUG}/research/`. Write a unified research summary to `OUTPUT_PATH`:

```markdown
# Research: {TOPIC}

**Modes:** {MODES}
**Date:** {DATE}

## Summary
{2–3 sentence synthesis — what do we now know that we didn't before?}

## Key Findings
{5–8 most important findings across all sub-artifacts, each cited}
- **{Finding}** — {source} [Tier N] [High/Medium/Low confidence]

## Problem Space / JTBD
{Include if ideation or user problem discovery mode — bullets from ideation.md and user-problems.md}

## Market Landscape
{Include if validation mode — bullets from market.md}

## Competitive Analysis
{Include if validation or competitor deep-dive mode — profiles from competitive.md}

## Internal Context
{bullets from internal.md — relevant prior work, plans, PRDs in this repo}

## Gaps and Open Questions
{bullets from all sub-artifacts — questions research couldn't answer}
- [UNVERIFIED] {claims attempted but not sourced}

## Suggested Next Steps
- Use this research with `/pm:plan` to inform roadmap priorities
- Use this research with `/pm:prd {SLUG}` to draft a PRD
```

## Step 4: Notify

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify \
    --title "pm:explore complete" \
    --message "Research for '{TOPIC}' written to {OUTPUT_PATH}"
fi
```

Report: "Research summary written to `{OUTPUT_PATH}`. Sub-artifacts in `.codevoyant/explore/{SLUG}/research/`. Use `/pm:prd {SLUG}` or `/pm:plan` to continue."
