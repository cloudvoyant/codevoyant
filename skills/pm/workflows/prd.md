# prd

## Critical Rules

- One PRD per invocation — never generate multiple PRDs in one run
- Consume research from `.codevoyant/explore/{slug}/summary.md` if available
- No markdown tables — use bullets, definition lists, and plain prose
- Problem statements describe user pain, not solutions
- Success metrics must be measurable (baseline + target)
- Out-of-scope section is required
- Requirements must use P0/P1/P2 prioritization — never a flat unordered list
- Acceptance criteria required for every user story
- Problem statements must cite at least one evidence source (research artifact, user quote, support ticket, or analytics datum)
- Prefer Mermaid diagrams for any visual structure in the PRD. Never use ASCII art.

## Step 0: Parse arguments

If FEATURE looks like a Linear URL, extract the issue ID and fetch issue details.

## Step 1: Gather context

If FEATURE is empty, ask:

```
AskUserQuestion:
  question: "What feature or capability is this PRD for?"
  header: "Feature"
  options:
    - label: "I'll describe below"
    - label: "Link a Linear issue (paste URL)"
```

Derive SLUG from FEATURE. Check for research artifact at `.codevoyant/explore/{SLUG}/summary.md`. If found, read it as RESEARCH_CONTEXT (also read any files in `.codevoyant/explore/{SLUG}/research/`) and inform the user it will be used.

Ask:

```
AskUserQuestion:
  questions:
    - question: "What is the primary user problem this feature solves?"
      header: "User problem"
      options:
        - label: "I'll describe below"
        - label: "Pull from research artifact"
    - question: "What does success look like? (measurable outcome)"
      header: "Success metric"
      options:
        - label: "I'll describe below"
        - label: "Pull from research artifact"
```

## Step 1.5: Research backfill (if no research artifact)

Check for research artifacts at `.codevoyant/explore/{SLUG}/summary.md` or `.codevoyant/explore/{SLUG}/research/`.

**If research exists:** load it as RESEARCH_CONTEXT and skip this step.

**If no research exists:** tell the user "No prior research found for this feature — I'll run a quick web search to ground the PRD."

Ask one round of clarifying questions:

```
AskUserQuestion:
  questions:
    - question: "Who is the primary user this feature is for?"
      header: "Target user"
      options:
        - label: "I'll describe below"
    - question: "What existing solutions do users use today (if known)?"
      header: "Status quo"
      options:
        - label: "I'll describe below"
        - label: "Unknown — research it"
```

Then launch 2 Sonnet agents in parallel (both run_in_background: false, model: claude-sonnet-4-6):

**Agent A — Market and user research:**

Prompt:
Search for evidence about the user problem for "{FEATURE}".
Run WebSearch("{FEATURE} user problems {year}"), WebSearch("{FEATURE} why users need"), and WebSearch("{TARGET_USER} pain points {FEATURE}").
Fetch 2+ relevant URLs.
Write 4–6 key findings to `.codevoyant/explore/{SLUG}/research/prd-backfill-market.md` with source citations. Flag every unverifiable claim as [UNVERIFIED].

**Agent B — Competitive landscape:**

Prompt:
Search for existing solutions and competitors for "{FEATURE}".
Run WebSearch("{FEATURE} alternatives"), WebSearch("{FEATURE} competitors"), and WebSearch("best {FEATURE} tools").
Fetch 2+ relevant URLs (competitor homepages or review pages).
Write 4–6 key findings to `.codevoyant/explore/{SLUG}/research/prd-backfill-competitive.md`.
Include for each competitor: target customer, core claim, one key strength, one gap. Cite sources.

Wait for both to complete. Read their outputs as RESEARCH_CONTEXT.

**Executive decision protocol for gaps:**
When research is absent or ambiguous, make confident product design decisions rather than deferring or hedging. The guiding question: *what is most likely to create a sticky, resonant product?* Principles:
- Prefer depth of value for a specific user over breadth across many
- Prefer strong opinionated defaults over flexible-but-vague feature sets
- Prefer clear differentiation over feature parity with incumbents
- Prefer outcomes users care about over outputs teams can easily build

Label every such decision `[DESIGN DECISION]` in the PRD so the user can override it. Do not leave fields blank or write "TBD" — make a call and explain the reasoning briefly.

## Step 2: Confirm scope

Present a one-paragraph summary (feature, user problem, success metric, research available). Ask:

```
AskUserQuestion:
  question: "Does this capture the PRD scope?"
  header: "Scope check"
  options:
    - label: "Yes — draft the PRD"
    - label: "Adjust scope (describe below)"
```

## Step 3: Draft PRD

Set:

- OUTPUT_PATH = `.codevoyant/prds/{SLUG}/{SLUG}.md`

```bash
mkdir -p ".codevoyant/prds/{SLUG}"
```

Write the PRD to OUTPUT_PATH using this structure (no markdown tables):

```
# PRD: {Feature Name}

**Status:** Draft
**Date:** {DATE}
**Author:** PM

## Problem Statement

{2–4 sentences describing the user pain, with evidence from research if available. Describes the problem, not the solution.}

## Goals

### Leading indicators (early signals, days to weeks)

- **{Metric name}**: baseline {X} → target {Y} by {timeframe}
  - Measurement method: {how we measure this}
  - Source: {evidence citation or "TBD"}

### Lagging indicators (outcome measures, weeks to months)

- **{Metric name}**: baseline {X} → target {Y} by {timeframe}
  - Measurement method: {how we measure this}
  - Source: {evidence citation or "TBD"}

## Non-Goals / Out of Scope

- {explicit deferral}
- {explicit deferral}

## User Stories

- **As a** {user type}, **I want to** {action} **so that** {outcome}
  - **Given** {context/precondition}
  - **When** {action taken}
  - **Then** {observable result}
- (repeat)

## Requirements

### P0 — Must-have (launch blocker)

- {requirement} — {rationale: why blocking}

### P1 — Nice-to-have (high value, ship when ready)

- {requirement} — {rationale: what it unlocks}

### P2 — Future (validate direction, don't build yet)

- {requirement} — {rationale: why deferred}

> If everything is P0, nothing is P0. Be ruthless about what truly blocks launch.

## Proposed Solution

{brief description of the approach — not implementation details}

### Key Decisions
- {decision}: {rationale}

## Dependencies

- {system or team}: {what is needed}

## Open Questions

- {question} — {proposed answer or "unresolved"}

## Risks

- {risk}: {mitigation}
```

## Step 4: Quality checkpoint

Check the drafted PRD against these criteria:

- Problem statement describes user pain, not a solution → flag if solution-phrased
- Each goal has a baseline, target, and timeframe → flag if missing
- Out-of-scope section is present and non-empty → flag if absent
- User stories have "so that [outcome]" clauses → flag if missing
- Problem statement is grounded in evidence (research, support data, user quotes) → flag if it reads as opinion without citation
- Requirements have at least one P0 item → flag if P0 section is empty (product likely not scoped)
- At least one leading and one lagging metric defined → flag if only one type present

Auto-fix what can be fixed without human judgment (add missing section skeletons with [TODO]).

Report what was auto-fixed and any remaining issues requiring user attention.

## Step 5: Register + Notify

```bash
npx @codevoyant/agent-kit plans register \
  --name "{SLUG}-prd" \
  --plugin pm \
  --description "PRD: {FEATURE}" \
  --total "0"
```

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify \
    --title "pm prd complete" \
    --message "PRD draft for '{FEATURE}' written to {OUTPUT_PATH}. Run /pm approve to commit."
fi
```

Report: "PRD draft written to `{OUTPUT_PATH}`. Run `/pm approve` to commit to `docs/prd/{SLUG}/`."
