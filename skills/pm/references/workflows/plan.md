# plan

## Critical Rules

- Never generate PRDs — pm plan writes roadmaps only; use pm prd for PRDs
- Do not make engineering decisions, focus on product development
- Always write to `.codevoyant/roadmaps/` first (draft); use pm approve to commit
- No markdown tables — use bullets, definition lists, or Mermaid diagrams
- Capability tiers group features by strategic value, not by team or sprint
- Research context from pm explore should be consumed if available
- Every capability's "Why now" must cite a source — research artifact, competitive signal, or user data. If none is available, mark it explicitly as `[ASSUMPTION — unvalidated]`
- Do not generate a roadmap from strategic intent alone — always check `.codevoyant/explore/` for available research context before drafting
- Capabilities without any research backing must be placed in Tier 3 (Future) and flagged

## Step 1: Gather context (minimize questions)

Scan for available research:

```bash
ls .codevoyant/explore/ 2>/dev/null | head -20
```

Store discovered directory names as `EXPLORE_DIRS`. If none found, set `EXPLORE_DIRS="(none)"`.

**Strategic goal resolution:**
- If args (from dispatcher `REMAINING_ARGS`) contain a strategic goal description (≥5 words), use it directly as `STRATEGIC_GOAL`. Do not ask.
- Otherwise ask **one** open question: "What is the strategic goal for this roadmap?" (free-text via Other).

**Horizon inference (no question):**
Infer from `STRATEGIC_GOAL` text — phrases like "this quarter" → quarter; "this half" → half-year; "this year" → annual. Default to **half-year** if not specified.

**Research context (no question):**
If `EXPLORE_DIRS` is non-empty, automatically load `summary.md` and all `research/` files from every exploration directory as `RESEARCH_CONTEXT`. If `EXPLORE_DIRS="(none)"`, set `RESEARCH_CONTEXT=""`. Do not ask the user which to include.

## Step 1.5: Research backfill (if no research artifacts)

**If `RESEARCH_CONTEXT` is non-empty:** skip this step.

**If no research exists:**

Tell the user: "No research context found — running lightweight web search to ground the roadmap." Do not ask for market/competitors/core-problem clarifications — the agents infer from `STRATEGIC_GOAL` and codebase context.

Launch 3 Sonnet agents in parallel (run_in_background: false, model: claude-sonnet-4-6):

**Agent A — Market signals:**
Prompt: Derive a product category from "{STRATEGIC_GOAL}" (one-to-three-word category like "B2B SaaS analytics" or "consumer fintech"). Search for market trends and user needs in that category. Run WebSearch("{category} market trends {year}"), WebSearch("{category} user needs"), WebSearch("{category} industry report"). Fetch 2 relevant URLs. Write 5 key findings to `.codevoyant/explore/{SLUG}/research/market.md` with citations and Tier labels.

**Agent B — Competitive landscape:**
Prompt: Derive product category and likely competitors from "{STRATEGIC_GOAL}" — research competitors yourself rather than expecting a list. Run WebSearch("{category} competitors"), WebSearch("{category} top players {year}"), WebSearch("{category} product launches"). Fetch 2 relevant URLs. Write findings to `.codevoyant/explore/{SLUG}/research/competitive.md`. Include each competitor's recent moves and strategic direction.

**Agent C — Internal prior art:**
Prompt: Scan this repository for product context: read all files in docs/product/ and docs/prd/, read any .codevoyant/roadmaps/ files, note existing strategic goals, past PRDs, known user problems. Write a summary to `.codevoyant/explore/{SLUG}/research/internal.md`.

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
    - label: "Accept — run pm review"
    - label: "Adjust (describe changes)"
    - label: "Discard"
```

Loop until accepted or discarded. If adjustments needed, apply them to DRAFT_PATH and re-present.

## Step 5: Run pm review

After acceptance, run `/pm review` on the draft to catch quality issues automatically.

## Step 6: Register + Notify

Register the roadmap draft:

```bash
PLAN_DESCRIPTION="{strategic goal first line}"
grep -q "| {DATE}-{TYPE} |" .codevoyant/README.md 2>/dev/null || \
  printf "| %s | Active | pm | %s | %s | %s |\n" \
    "{DATE}-{TYPE}" "$PLAN_DESCRIPTION" "$(date +%Y-%m-%d)" "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '(none)')" \
    >> .codevoyant/README.md
```

(pm roadmaps have no implementation tasks; those are created by em plan)

If `SILENT` is not true, report completion to the user with a brief summary stating the draft roadmap was written to `{DRAFT_PATH}` and instructing them to use `/pm approve` to commit.

Report: "Draft written to `{DRAFT_PATH}`. Run `/pm approve` when ready to commit to `docs/product/`."
