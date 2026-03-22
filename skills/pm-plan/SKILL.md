---
description: 'Plan a product roadmap for a quarter, half-year, or year. Writes a draft roadmap to .codevoyant/roadmaps/ using capability tiers. Triggers on: "pm plan", "product roadmap", "plan a roadmap", "quarterly roadmap", "annual plan".'
name: pm:plan
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline.'
argument-hint: '[quarter|half|annual] [--bg] [--silent]'
context: fork
model: claude-opus-4-6
---

> **Compatibility**: AskUserQuestion falls back to numbered list on non-Claude-Code platforms.

## Skill Requirements

```bash
command -v npx >/dev/null 2>&1 || echo "MISSING: npx"
```

## Critical Rules

- Never generate PRDs — pm:plan writes roadmaps only; use pm:prd for PRDs
- Do not make engineering decisions, focus on product development
- Always write to `.codevoyant/roadmaps/` first (draft); use pm:approve to commit
- No markdown tables — use bullets, definition lists, or Mermaid diagrams
- Capability tiers group features by strategic value, not by team or sprint
- Research context from pm:explore should be consumed if available
- Every capability's "Why now" must cite a source — research artifact, competitive signal, or user data. If none is available, mark it explicitly as `[ASSUMPTION — unvalidated]`
- Do not generate a roadmap from strategic intent alone — always check `.codevoyant/research/` for available research context before drafting
- Capabilities without any research backing must be placed in Tier 3 (Future) and flagged

## Step 0: Parse arguments

```bash
HORIZON="${1:-}"   # quarter | half | annual
BG_FLAG=false; SILENT=false
[[ "$*" =~ --bg|-b ]] && BG_FLAG=true
[[ "$*" =~ --silent ]] && SILENT=true
```

## Step 1: Gather context

Ask:

```
AskUserQuestion:
  questions:
    - question: "What time horizon is this roadmap for?"
      header: "Horizon"
      options:
        - label: "Quarter (3 months)"
        - label: "Half-year (6 months)"
        - label: "Annual (12 months)"
    - question: "Is there research context to pull in?"
      header: "Research"
      options:
        - label: "Yes — use .codevoyant/research/"
        - label: "No — start from scratch"
    - question: "What is the primary strategic goal for this period?"
      header: "Goal"
      options:
        - label: "I'll describe below"
        - label: "Pull from existing product docs"
```

If using research: list files in `.codevoyant/research/` and ask which to include. Read selected files as RESEARCH_CONTEXT.

## Step 1.5: Research backfill (if no research artifacts)

After the user selects "Yes — use .codevoyant/research/", check if that directory actually has content.

**If research artifacts exist:** load selected ones as RESEARCH_CONTEXT and skip this step.

**If no research exists (or user selected "No — start from scratch"):**

Tell the user: "No research context found — I'll run a quick web search to ground the roadmap."

Ask one round of clarifying questions:

```
AskUserQuestion:
  questions:
    - question: "What product category or market is this roadmap for?"
      header: "Market"
      options:
        - label: "I'll describe below"
    - question: "Who are your top 2–3 known competitors (or 'unknown')?"
      header: "Competitors"
      options:
        - label: "I'll list below"
        - label: "Unknown — research it"
    - question: "What is the biggest user problem you're solving this period?"
      header: "Core problem"
      options:
        - label: "I'll describe below"
```

Launch 3 Sonnet agents in parallel (run_in_background: false, model: claude-sonnet-4-6):

**Agent A — Market signals:**
Prompt: Search for market trends and user needs in "{PRODUCT_CATEGORY}". Run WebSearch("{PRODUCT_CATEGORY} market trends {year}"), WebSearch("{PRODUCT_CATEGORY} user needs"), WebSearch("{PRODUCT_CATEGORY} industry report"). Fetch 2 relevant URLs. Write 5 key findings to `.codevoyant/research/roadmap-backfill/market.md` with citations and Tier labels.

**Agent B — Competitive landscape:**
Prompt: Research competitors for "{PRODUCT_CATEGORY}". Run WebSearch("{PRODUCT_CATEGORY} competitors"), WebSearch("{COMPETITOR_LIST} product updates {year}"), WebSearch("{PRODUCT_CATEGORY} product launches"). Fetch 2 relevant URLs. Write findings to `.codevoyant/research/roadmap-backfill/competitive.md`. Include each competitor's recent moves and strategic direction.

**Agent C — Internal prior art:**
Prompt: Scan this repository for product context: read all files in docs/product/ and docs/prd/, read any .codevoyant/roadmaps/ files, note existing strategic goals, past PRDs, known user problems. Write a summary to `.codevoyant/research/roadmap-backfill/internal.md`.

Wait for all three to complete. Read outputs as RESEARCH_CONTEXT.

**Executive decision protocol for gaps:**
When research is absent or ambiguous, make confident strategic calls rather than hedging. The guiding question: *what is most likely to create a sticky, resonant product that users will keep coming back to?* Principles:
- Prioritize capabilities that create strong user habits or network effects over one-time utility
- Prefer fewer, deeper bets over a long list of incremental features
- Choose differentiation over parity — what makes this product worth choosing over alternatives?
- Place bets on user outcomes, not feature completeness

Label every such decision `[DESIGN DECISION]` in the roadmap. Do not leave "Why now" blank or write "strategic priority" without substance — make a call and explain it briefly.

## Step 2: Confirm scope

Present a one-paragraph summary (horizon, goal, research sources), then immediately proceed to Step 3. Do not ask a confirmation question here — the user will review and adjust the draft in Step 4.

## Step 3: Draft roadmap

Set:

- DATE = current date YYMMDD
- TYPE = quarter | half | annual (from HORIZON)
- DRAFT_PATH = `.codevoyant/roadmaps/{DATE}-{TYPE}-roadmap.md`

Use the Agent tool to spawn the roadmap drafter:

- **pm-planner** (see `agents/pm-planner.md`) — drafts the roadmap using research context and strategic goal

Wait for completion. Read DRAFT_PATH.

## Step 4: Review draft

Present the draft to the user. Ask:

```
AskUserQuestion:
  question: "Does this roadmap draft look right?"
  header: "Draft review"
  options:
    - label: "Accept — run pm:review"
    - label: "Adjust (describe changes)"
    - label: "Discard"
```

Loop until accepted or discarded. If adjustments needed, apply them to DRAFT_PATH and re-present.

## Step 5: Run pm:review

After acceptance, run `/pm:review` on the draft to catch quality issues automatically.

## Step 6: Notify

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify \
    --title "pm:plan complete" \
    --message "Draft roadmap written to {DRAFT_PATH}. Use /pm:approve to commit."
fi
```

Report: "Draft written to `{DRAFT_PATH}`. Run `/pm:approve` when ready to commit to `docs/product/roadmaps/`."
