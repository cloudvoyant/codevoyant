---
description: "Use when planning a product roadmap from strategic context and feature ideas. Triggers on: \"pm plan\", \"product roadmap\", \"product planning\", \"feature roadmap\", \"what are we building\", \"product strategy\". Produces phased roadmap, generates inline PRDs per feature, and launches pm:review on completion."
name: pm:plan
license: MIT
compatibility: "Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline. Core functionality preserved on all platforms."
argument-hint: "[quarter|half|<horizon>] [--bg]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-opus-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially. The `context: fork` and `agent:` frontmatter fields are Claude Code-specific — on OpenCode and VS Code Copilot they are ignored and the skill runs inline using the current model.

---

## Critical Principles

- "If everything is P0, nothing is P0." — Every feature in the roadmap will feel urgent to someone. Forced prioritization is the plan's most valuable artifact. Each phase must have a clear P0 feature; if the user cannot identify one, surface that as a planning gap before proceeding.
- "The 'NOT this period' section is as important as the roadmap." — What is explicitly deferred tells the team what tradeoffs were made. A deferred item without rationale will be re-raised in every planning meeting. Every deferred item needs one sentence of rationale.
- "Roadmaps are zero-sum." — Adding a feature means removing capacity from something else. When the user adds a feature mid-loop, ask explicitly: "What comes off?" Do not expand scope without a corresponding reduction or capacity acknowledgment.

## Anti-Patterns

- ❌ **Solutioning before problem framing**: Starting to size or sequence features before the underlying user problem has been stated. → Before generating the phased roadmap, ensure each feature traces to a named user problem or business objective. Features without a stated problem should be flagged for the user to supply.
- ❌ **Feature parity thinking**: Prioritizing features because a competitor has them, not because users need them. → Competitive pressure is a market risk signal (Agent C), not a prioritization criterion on its own. If a feature is justified solely by "competitor X has it," flag the gap: what evidence shows our users need it?
- ❌ **Failure Modes table left as boilerplate**: Filling the Ships Late / Underperforms / Rollback table with generic text ("may delay Q3", "low adoption possible") that provides no actionable signal. → Each cell must name a specific downstream consequence or a named rollback mechanism. Generic rows must be flagged as NEEDS_IMPROVEMENT in the validation pass.
- ❌ **Strategic Assumptions missing or vague**: Listing assumptions like "market conditions remain favorable" with no specificity. → Assumptions must be falsifiable. Each assumption should name what would have to be true for the plan to hold, so the team knows when to revisit the roadmap.
- ❌ **Parallel PRD generation without roadmap confirmation**: Running PRD generation before the user has confirmed the roadmap. → PRDs are generated from roadmap scope; generating them before scope is confirmed creates wasted artifacts. Never advance to PRD generation until the user has selected "Hold Scope."

---

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
  - Prior roadmaps: 260101-growth-quarterly-roadmap.md (themes: onboarding, search), 260401-platform-half-roadmap.md (themes: platform, integrations)
  - Product docs found: docs/product/ (5 pages)
  - Active spec plans: ENG-101 (auth overhaul, in-progress), ENG-88 (webhook delivery, planned)
  Warning: Potential overlap: "notification preferences" -- similar to ENG-88 webhook delivery scope
```

## Step 1: Parse arguments

Extract `--bg` flag. Extract time horizon from arguments: `quarter` = 13 weeks, `half` = 26 weeks.

If no time horizon or scope was provided, ask:

AskUserQuestion:
  question: "What are we planning?"
  header: "Planning scope"
  multiSelect: false
  options:
    - label: "Single feature deep-dive (quarter)"
      value: "single"
      description: "One large feature end-to-end; PM owns the PRD"
    - label: "Quarterly product roadmap (13 weeks)"
      value: "quarter"
      description: "Multiple features across a quarter, prioritized"
    - label: "Half-year strategy (26 weeks)"
      value: "half"
      description: "High-level themes + key initiatives for the half"

Derive:
- `DATE_PREFIX = $(date +%y%m%d)` (YYMMDD format)
- `TYPE` = derived from horizon: `single` → `single`, `quarter` → `quarterly`, `half` → `half`
- `SCRATCH_DIR = .codevoyant/pm/plans/{TYPE}-{DATE_PREFIX}` (scratch space for research, not committed docs)

`OUTPUT_FILE` is derived in Step 1.5 after the product scope is known. Do not set it here.

Create directories:
- `mkdir -p docs/product/roadmaps/`
- `mkdir -p {SCRATCH_DIR}/research/`

## Step 1.5: Product Discovery

Before planning, discover products in Linear:

1. Fetch teams: `mcp__linear-server__list_teams` — list available teams
2. Fetch labels: `mcp__linear-server__list_issue_labels` — identify product-scoped tags

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

Derive `PRODUCT_SLUG`: slugify the selected product names into a short identifier (lowercase, hyphens, no special chars). If "All products" was selected, use `all`. Examples: `growth`, `platform-infra`, `sdk`. Then set:
- `OUTPUT_FILE = docs/product/roadmaps/{DATE_PREFIX}-{PRODUCT_SLUG}-{TYPE}-roadmap.md`

## Step 2: Gather planning context

AskUserQuestion:
  question: "Where should I pull feature context from?"
  header: "Input source"
  multiSelect: true
  options:
    - label: "Linear backlog or project URL"
      description: "Fetch issues from Linear using the selected product scope"
    - label: "GitHub issues or milestone"
      description: "Provide a GitHub issue URL or milestone link"
    - label: "Notion page"
      description: "Provide a Notion page URL or ID"
    - label: "I'll describe the features verbally"
      description: "No external fetch needed — use my description directly"

## Step 3: Fetch ticket context

If ticket URLs or backlog input was provided in Step 2, fetch context using the appropriate mechanism per source:

- **Linear URL or backlog** — call `mcp__linear-server__get_issue` for each issue URL. For backlog queries, call `mcp__linear-server__list_issues` filtered by `PRODUCT_SCOPE` (team IDs and/or label IDs from Step 1.5). For each issue, also fetch linked comments via `mcp__linear-server__list_comments`.
- **GitHub issue URL** — call `WebFetch` on the URL to retrieve the issue body and comments (GitHub renders issue JSON at `{url}.json`). For a milestone, call `WebFetch` on the milestone issues API endpoint.
- **Notion page** — call `mcp__claude_ai_Notion__notion-fetch` with the page URL or ID.
- **Verbal description** — no fetch needed; use the user's description directly as context.

Save raw context for each feature to `{SCRATCH_DIR}/research/{feature-slug}.md`.

## Step 4: Parallel analysis

Run 3 parallel analysis agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

- **Agent A — Opportunity sizing**: Prioritize features by user impact vs. effort
- **Agent B — Dependencies**: Identify cross-feature dependencies and sequencing constraints
- **Agent C — Market risks**: Flag market/competitive risks where delay or deprioritization hurts most

Each agent saves findings to `{SCRATCH_DIR}/research/{agent-name}.md`. All findings must follow the format in `skills/shared/references/research-standards.md`.

Wait for all three. Synthesize into a prioritized feature list with rationale.

## Step 4.5: Quality Checkpoint

Before writing the roadmap, run a structured self-check. Output a Quality Checkpoint block.

**Criteria:**

1. **Feature-to-problem tracing** — Does each proposed feature trace to a named user problem or business objective?
   - PASS: each feature has a stated user problem or metric it addresses
   - WARN: some features lack stated rationale — proceed with note in roadmap Rationale column
   - BLOCK: no features have stated problems (pure feature list) → ask the user to name the top 1–2 user problems being solved before generating phases

2. **P0 feature identified** — Is there a clear P0 feature for Phase 1?
   - PASS: one feature is clearly highest priority with rationale
   - WARN: priorities are not yet differentiated — note that forced prioritization is the plan's most valuable artifact; do not block on this

3. **Not-this-period items have rationale** — For any explicitly deferred features, is there a one-line rationale?
   - PASS: each deferred item has a rationale
   - WARN: deferred items have no rationale — add placeholder rationale in the Not This Period section

4. **Failure Modes non-boilerplate** — Has the user provided specific failure mode information, or will the table be generic?
   - PASS: specific failure information was gathered
   - WARN: no specific information — flag the Failure Modes table as NEEDS_IMPROVEMENT after writing; do not block

5. **Scope confirmed before PRD generation** — Have the features and phases been confirmed by the user?
   - PASS: user has confirmed scope in this session
   - BLOCK: proceeding to PRD generation without scope confirmation → do not advance to PRD steps until user selects "Hold Scope"

**Output format:**
```
## Quality Checkpoint

✅ Each feature traces to a named user problem
✅ P0 feature identified for Phase 1
⚠️  WARN: 2 deferred items lack rationale — will add placeholders
⚠️  WARN: No specific failure mode info gathered — will flag table
❌ BLOCK: Scope not yet confirmed — waiting for "Hold Scope"
   → Resolve: present roadmap for user confirmation before proceeding

Quality Brief:
- 5 features mapped to 3 user problems
- P0: [feature] — [rationale]
- Gap: deferred item rationale missing — adding placeholders
- BLOCK: scope confirmation required before PRD generation
```

**BLOCK behavior:** If one or more BLOCKs are found, do not proceed to Step 5. Present the BLOCK items to the user with specific questions and wait for resolution. After resolution, re-run the checkpoint.

After running the checkpoint, write the Quality Brief and use it as context for the roadmap write step.

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

If the user selects **Expansion**, enforce the zero-sum rule before accepting the new feature: AskUserQuestion: "Roadmaps are zero-sum — adding a feature takes capacity from something else. What are you willing to cut or defer to make room?" Do not add the feature to scope until the user names a corresponding reduction or explicitly acknowledges the capacity tradeoff.

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
  1. `mcp__linear-server__list_initiatives` — present as options (title + description)
  2. User selects — store INITIATIVE_ID

If "Yes — create new initiative":
  1. Ask for initiative name and 1-sentence description
  2. `mcp__linear-server__save_initiative` with name, description, teamIds (from PRODUCT_SCOPE)
  3. Store INITIATIVE_ID

Create document in Linear:
  `mcp__linear-server__create_document`:
    title: "{DATE_PREFIX} {TYPE} Product Roadmap"
    content: (full Markdown content of OUTPUT_FILE)
    initiativeId: INITIATIVE_ID

Report: "Roadmap attached to Linear initiative: {initiative-name}"

If "No — repo only": skip. Report: "Roadmap saved to {OUTPUT_FILE}. Not attached to Linear."

## Step 8: Generate PRDs for each feature

For each feature in the roadmap, generate a PRD directly (inline — do NOT invoke pm:breakdown).

Run in parallel (Task agents, `model: claude-haiku-4-5-20251001`, `run_in_background: true`). Before launching, run `mkdir -p docs/prd/`. Each agent receives the following prompt (substitute values per feature):

```
You are writing a PRD for the following feature.

Feature name: {feature-name}
Roadmap section:
{full text of this feature's section from the roadmap, including rationale and dependencies}

Ticket context (may be empty):
{content of {SCRATCH_DIR}/research/{feature-slug}.md, or "none"}

Instructions:
1. Read the PRD template at references/prd-template.md.
2. Write a complete PRD following that template exactly.
3. Output path: docs/prd/{DATE_PREFIX}-{feature-slug}-prd.md
4. Do not invoke any other skill or agent.
5. When done, output exactly one line: DONE docs/prd/{DATE_PREFIX}-{feature-slug}-prd.md
```

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
- Goals section contains both a `### Leading Indicators` and a `### Lagging Indicators` header?
  NEEDS_IMPROVEMENT if either is absent.
- Any goal bullet uses vague language ("improve", "better", "faster") without a measurable delta?
  NEEDS_IMPROVEMENT — must include baseline → target.
- Problem statement contains output framing ("ship X", "build Y")?
  NEEDS_IMPROVEMENT — problem statement describes a problem, not a solution.

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
