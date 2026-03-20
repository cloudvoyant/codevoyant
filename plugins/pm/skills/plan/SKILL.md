---
description: "Use when planning a product roadmap from strategic context and feature ideas. Triggers on: \"pm plan\", \"product roadmap\", \"product planning\", \"feature roadmap\", \"what are we building\", \"product strategy\". Produces phased roadmap, generates inline PRDs per feature, and launches pm:review on completion."
argument-hint: "[quarter|half|<horizon>] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-opus-4-6
---

> **Compatibility**: On OpenCode, interpret `Agent:` blocks as `Task:` tool invocations (spawns a child session instead of a true background process).

Plan a product roadmap with inline PRD generation and Linear initiative attachment.

## Step 0: Product audit

Before asking any planning questions, scan the repository for existing context:

- Check `docs/product/roadmaps/` — if prior roadmaps exist, list them with their date and top-level themes so the user can decide whether to extend an existing roadmap or start fresh.
- Check `docs/product/` — if product documentation exists, load it as background context (product overview, existing feature pages).
- Check active spec plans — run `npx @codevoyant/agent-kit plans list --plugin spec` and list results (title + status) so the roadmap can be grounded in what engineering is already committed to.
- **Boring by Default**: cross-reference any feature ideas against active spec plans and existing `docs/product/` pages. Flag duplicates or near-duplicates before planning begins. Note: "This feature overlaps with [spec plan / existing doc]. Is this an extension, a replacement, or genuinely new?"

Store all findings as `PRODUCT_AUDIT_CONTEXT` and carry through the entire session.

Output example:
```
Product audit complete:
  - Prior roadmaps: 260101-quarterly-roadmap.md (themes: onboarding, search), 260401-half-roadmap.md (themes: platform, integrations)
  - Product docs found: docs/product/ (5 pages)
  - Active spec plans: ENG-101 (auth overhaul, in-progress), ENG-88 (webhook delivery, planned)
  Warning: Potential overlap: "notification preferences" -- similar to ENG-88 webhook delivery scope
```

## Step 1: Parse arguments

Extract time horizon: `quarter` = 13 weeks, `half` = 26 weeks. Extract `--bg`, `--silent` flags.

Derive:
- `DATE_PREFIX = $(date +%y%m%d)` (YYMMDD format)
- `TYPE` = derived from horizon arg: `quarterly` (from `quarter`), `half` (from `half`), or slugified horizon name
- `OUTPUT_FILE = docs/product/roadmaps/{DATE_PREFIX}-{TYPE}-roadmap.md`
- `SCRATCH_DIR = .codevoyant/pm/plans/{TYPE}-{DATE_PREFIX}` (scratch space for research, not committed docs)

Create directories:
- `mkdir -p docs/product/roadmaps/`
- `mkdir -p {SCRATCH_DIR}/research/`

## Step 1.5: Product Discovery

Before planning, discover products in Linear:

1. Fetch teams: `mcp__claude_ai_Linear__list_teams` — list available teams
2. Fetch labels: `mcp__claude_ai_Linear__list_issue_labels` — identify product-scoped tags

AskUserQuestion:
  question: "Which products does this roadmap cover?"
  header: "Products"
  multiSelect: true
  options:
    - label: "{team-name} (team-level product)"
      description: "All projects and issues under this team"
    - label: "{label-name} (tag-based product)"
      description: "Issues tagged with this label across teams — e.g. internal SDKs, shared libraries"
    - label: "All products"
      description: "Cross-cutting roadmap covering all teams"

Store selected products as `PRODUCT_SCOPE` (list of team IDs and/or label IDs).
Use `PRODUCT_SCOPE` to filter Linear queries in Steps 3-4 (list_issues, list_projects filtered by team and/or label).

Note: tag-based products are common for internal SDKs, shared libraries, platform infra — things that don't map cleanly to a single team.

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

If ticket URLs were provided, fetch each via the ticket-fetch pattern. Save raw context to `{SCRATCH_DIR}/research/{feature-slug}.md` per feature.

If Linear URLs or backlog queries, filter by `PRODUCT_SCOPE` (team IDs and/or label IDs from Step 1.5).

## Step 4: Parallel analysis

Run 3 parallel analysis agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

- **Agent A — Opportunity sizing**: Prioritize features by user impact vs. effort
- **Agent B — Dependencies**: Identify cross-feature dependencies and sequencing constraints
- **Agent C — Market risks**: Flag market/competitive risks where delay or deprioritization hurts most

Wait for all three. Synthesize into a prioritized feature list with rationale.

## Step 5: Draft phased roadmap

Structure the roadmap into phases:
- Monthly buckets for quarterly roadmaps, or theme-based for half-year
- Each phase includes: theme, features (with product/team tag), rationale for inclusion/ordering, dependencies
- **"NOT this period"** section with explicit rationale for what was deferred
- Strategic assumptions (target user, market context, team capacity)
- Open questions requiring resolution

Use `references/roadmap-template.md` as the structure guide.

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

Write roadmap to `{OUTPUT_FILE}` using the structure from `references/roadmap-template.md`.

After the roadmap body, append a Failure Modes section:

```markdown
## Failure Modes

| Feature | Ships Late | Underperforms with Users | Rollback Plan |
|---|---|---|---|
| {feature-name} | {impact if delayed} | {impact if adoption low} | {rollback plan} |
```

For every feature: fill in what happens if it ships late (downstream blockers, customer commitments at risk), what happens if it underperforms with users (fallback or pivot option), and the rollback plan (feature flag, gradual rollout, hard cut). No empty rows — write TBD if unknown.

## Step 7.5: Linear Initiative Attachment

After writing the roadmap to disk, ask:

AskUserQuestion:
  question: "Attach roadmap to a Linear initiative?"
  header: "Linear"
  multiSelect: false
  options:
    - label: "Yes — attach to existing initiative"
      description: "Pick from active Linear initiatives"
    - label: "Yes — create new initiative"
      description: "Create a Linear initiative for this roadmap"
    - label: "No — repo only"
      description: "Skip Linear; file committed to docs/product/roadmaps/"

If "Yes — attach to existing initiative":
  1. `mcp__claude_ai_Linear__list_initiatives` — present as options (title + description)
  2. User selects — store INITIATIVE_ID

If "Yes — create new initiative":
  1. Ask for initiative name and 1-sentence description
  2. `mcp__claude_ai_Linear__save_initiative` with name, description, teamIds (from PRODUCT_SCOPE)
  3. Store INITIATIVE_ID

Create document in Linear:
  `mcp__claude_ai_Linear__create_document`:
    title: "{DATE_PREFIX} {TYPE} Product Roadmap"
    content: (full Markdown content of OUTPUT_FILE)
    initiativeId: INITIATIVE_ID

Report: "Roadmap attached to Linear initiative: {initiative-name}"

If "No — repo only": skip. Report: "Roadmap saved to {OUTPUT_FILE}. Not attached to Linear."

## Step 8: Generate PRDs for each feature

For each feature in the roadmap, generate a PRD directly (inline — do NOT invoke pm:breakdown).

Run in parallel (Task agents, `model: claude-haiku-4-5-20251001`, `run_in_background: true`). Pass each agent:
- Feature name and its section from the roadmap
- `DATE_PREFIX` and feature slug
- Any fetched ticket context from Step 3
- Template: `references/prd-template.md` (from pm:prd skill references)
- Output path: `docs/prd/{DATE_PREFIX}-{feature-slug}-prd.md`
- `mkdir -p docs/prd/` before writing

Wait for all PRD agents (`block: true`). Report: `{N} PRDs written to docs/prd/`.

## Step 8.5: Validation Pass

Run a minimum of 2 validation rounds autonomously — do NOT prompt the user during this loop.

### Per-Round Execution

**a.** Notify: "Validation round {round} running..."

**b.** Launch parallel validation agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Plan-level agent** — validates `{OUTPUT_FILE}`:
- All phases have: theme, feature list (with product column), rationale for ordering, dependencies
- "NOT this period" section present with rationale
- Strategic assumptions and open questions listed
- Failure Modes table filled — no empty rows; `TBD` only where genuinely unknown

**Per-feature agents** — one per PRD in `docs/prd/{DATE_PREFIX}-*-prd.md`:
- Problem statement present and specific
- Requirements table has priority column (P0/P1/P2)
- Acceptance criteria defined (verifiable conditions)
- Non-goals listed
- Open questions listed

**c.** Collect all results (`TaskOutput block: true`). Merge into a single issue list.

Overall status = `PASS` only if all agents return `PASS`. Any `NEEDS_IMPROVEMENT` = round is `NEEDS_IMPROVEMENT`.

**d.** If `NEEDS_IMPROVEMENT`: auto-fix all issues across affected files, then continue.

**e.** Loop: break if `PASS` and round >= 2. Cap at 3 rounds.

Report: "Validation complete ({N} rounds) — {PASS | X issues remain}"

## Step 9: Auto-launch review

Launch `pm:review` in background (always):

```
Agent:
  subagent_type: general-purpose
  run_in_background: true
  prompt: "Run /pm:review {OUTPUT_FILE} --silent. Review roadmap and all PRDs in docs/prd/{DATE_PREFIX}-*-prd.md, append findings to {SCRATCH_DIR}/review.md."
```

Report: `Product roadmap written to {OUTPUT_FILE}. PRDs: {N} features in docs/prd/. Review running in background.`

## Step 10: Notify

If `--bg`, notify:

```bash
npx @codevoyant/agent-kit notify --title "pm:plan complete" --message "{N} features planned with PRDs. Review running."
```
