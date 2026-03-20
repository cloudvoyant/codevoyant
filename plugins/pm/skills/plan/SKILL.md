---
description: "Use when planning a product roadmap from strategic context and feature ideas. Triggers on: \"pm plan\", \"product roadmap\", \"product planning\", \"feature roadmap\", \"what are we building\", \"product strategy\". Produces phased roadmap, auto-invokes pm:breakdown per feature, and launches pm:review on completion."
argument-hint: "[quarter|half|<horizon>] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-opus-4-6
---

Plan a product roadmap with automatic PRD generation and review.

## Step 0: Product audit

Before asking any planning questions, scan the repository for existing context:

- Check `.codevoyant/pm/plans/*/roadmap.md` — if prior roadmaps exist, list them with their date and top-level themes so the user can decide whether to extend an existing roadmap or start fresh.
- Check `docs/product/` — if product documentation exists, load it as background context (product overview, existing feature pages).
- Check active spec plans — run `npx @codevoyant/agent-kit plans list --plugin spec` and list results (title + status) so the roadmap can be grounded in what engineering is already committed to.
- **Boring by Default**: cross-reference any feature ideas against active spec plans and existing `docs/product/` pages. Flag duplicates or near-duplicates before planning begins. Note: "This feature overlaps with [spec plan / existing doc]. Is this an extension, a replacement, or genuinely new?"

Store all findings as `PRODUCT_AUDIT_CONTEXT` and carry through the entire session.

Output example:
```
Product audit complete:
  - Prior roadmaps: quarter-2025-q4 (themes: onboarding, search), half-2026-h1 (themes: platform, integrations)
  - Product docs found: docs/product/ (5 pages)
  - Active spec plans: ENG-101 (auth overhaul, in-progress), ENG-88 (webhook delivery, planned)
  Warning: Potential overlap: "notification preferences" -- similar to ENG-88 webhook delivery scope
```

## Step 1: Parse arguments

Extract time horizon: `quarter` = 13 weeks, `half` = 26 weeks. Extract `--bg`, `--silent` flags.

Derive `SLUG` from horizon + date (e.g. `quarter-2026-q2`). Check if `.codevoyant/pm/plans/{SLUG}/` already exists — if so, append `-2`, `-3`, etc.

Set `PLAN_DIR=".codevoyant/pm/plans/{SLUG}"`. Create: `{PLAN_DIR}/`, `{PLAN_DIR}/prds/`, `{PLAN_DIR}/research/`.

## Step 2: Gather planning context

AskUserQuestion:
> What are we roadmapping?

Options:
- **Single feature deep-dive** — One large feature end-to-end; PM owns the PRD
- **Quarterly product roadmap** — Multiple features across a quarter, prioritized
- **Half-year strategy** — High-level themes + key initiatives for the half

Then AskUserQuestion (multiSelect):
> Input source?

Options:
- Linear backlog or project URL
- GitHub issues or milestone
- Notion page
- I'll describe the features verbally

## Step 3: Fetch ticket context

If ticket URLs were provided, fetch each via the ticket-fetch pattern. Save raw context to `{PLAN_DIR}/research/{feature-slug}.md` per feature.

## Step 4: Parallel analysis

Run 3 parallel analysis agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

- **Agent A — Opportunity sizing**: Prioritize features by user impact vs. effort
- **Agent B — Dependencies**: Identify cross-feature dependencies and sequencing constraints
- **Agent C — Market risks**: Flag market/competitive risks where delay or deprioritization hurts most

Wait for all three. Synthesize into a prioritized feature list with rationale.

## Step 5: Draft phased roadmap

Structure the roadmap into phases:
- Monthly buckets for quarterly roadmaps, or theme-based for half-year
- Each phase includes: theme, features, rationale for inclusion/ordering, dependencies
- **"NOT this period"** section with explicit rationale for what was deferred
- Strategic assumptions (target user, market context, team capacity)
- Open questions requiring resolution

## Step 6: Scope confirmation loop

Show the roadmap summary. AskUserQuestion:
> Does this roadmap reflect product priorities?

Options:
- **Hold Scope** — commit to this roadmap as-is (proceeds to PRDs)
- **Selective Expansion** — go deeper on 1-2 features
- **Expansion** — add a feature not yet mentioned
- **Scope Reduction** — cut something; be more focused
- **Adjust prioritization** — same features, different order

Loop until the user selects "Hold Scope".

## Step 7: Write the roadmap

Write `{PLAN_DIR}/roadmap.md` with all roadmap content.

After the roadmap body, append a Failure Modes section:

```markdown
## Failure Modes

| Feature | Ships Late | Underperforms with Users | Rollback Plan |
|---|---|---|---|
| {feature-name} | {impact if delayed} | {impact if adoption low} | {rollback plan} |
```

For every feature: fill in what happens if it ships late (downstream blockers, customer commitments at risk), what happens if it underperforms with users (fallback or pivot option), and the rollback plan (feature flag, gradual rollout, hard cut). No empty rows — write TBD if unknown.

## Step 8: Generate PRDs for each feature

Invoke `pm:breakdown` for each feature in parallel (Task agents, `run_in_background: true`). Pass each agent:
- Feature name and its section from `roadmap.md`
- `PLAN_DIR` so PRDs land in `{PLAN_DIR}/prds/`
- Any fetched ticket context from Step 3
- `--no-preview` flag (no interactive review during bulk breakdown)

Wait for all breakdown agents (`block: true`). Report: `{N} PRDs written to {PLAN_DIR}/prds/`.

## Step 8.5: Validation Pass

Run a minimum of 2 validation rounds autonomously — do NOT prompt the user during this loop.

### Per-Round Execution

**a.** Notify: `🔍 Validation round {round} running...`

**b.** Launch parallel validation agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Plan-level agent** — validates `{PLAN_DIR}/roadmap.md`:
- All phases have: theme, feature list, rationale for ordering, dependencies
- "NOT this period" section present with rationale
- Strategic assumptions and open questions listed
- Failure Modes table filled — no empty rows; `TBD` only where genuinely unknown

**Per-feature agents** — one per file in `{PLAN_DIR}/prds/`:
- Problem statement present and specific
- User stories cover P0/P1/P2 with acceptance criteria
- Success metrics defined (not vague — specific and measurable)
- Out-of-scope items listed

**c.** Collect all results (`TaskOutput block: true`). Merge into a single issue list.

Overall status = `PASS` only if all agents return `PASS`. Any `NEEDS_IMPROVEMENT` = round is `NEEDS_IMPROVEMENT`.

**d.** If `NEEDS_IMPROVEMENT`: auto-fix all issues across affected files, then continue.

**e.** Loop: break if `PASS` and round ≥ 2. Cap at 3 rounds.

Report: `✅ Validation complete ({N} rounds) — {PASS | X issues remain}`

## Step 9: Auto-launch review

Launch `pm:review` in background (always):

```
TaskCreate:
  subagent_type: general-purpose
  run_in_background: true
  prompt: "Run /pm:review {PLAN_DIR} --silent. Review roadmap.md and all prds/, append findings to {PLAN_DIR}/review.md."
```

Report: `Product roadmap written to {PLAN_DIR}/. PRDs: {N} features. Review running in background.`

## Step 10: Notify

If `--bg`, notify:

```bash
npx @codevoyant/agent-kit notify --title "pm:plan complete" --message "{N} features planned with PRDs. Review running."
```
