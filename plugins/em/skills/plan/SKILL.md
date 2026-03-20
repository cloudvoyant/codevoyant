---
description: "Use when planning an engineering roadmap or single epic. Triggers on: \"em plan\", \"roadmap\", \"epic planning\", \"quarterly planning\", \"engineering roadmap\", \"architecture plan\". Produces phased roadmap with capacity, dependencies, architecture diagrams, and failure modes. Auto-invokes em:breakdown and em:review."
argument-hint: "[quarter|half|<horizon>] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-opus-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Plan a single epic or multi-epic engineering roadmap with architecture design, task breakdowns, and automatic review.

## Step 0: Parse Args and Setup

Extract the time horizon from the first argument:
- `quarter` = 13 weeks
- `half` = 26 weeks
- Any other string = custom horizon name

Extract flags:
```
BG_MODE  = true if --bg present
SILENT   = true if --silent present
```

Derive `SLUG` from horizon + current date:
- `quarter` → `quarter-{YYYY}-q{N}` (e.g. `quarter-2026-q2`)
- `half` → `half-{YYYY}-h{N}` (e.g. `half-2026-h1`)
- Custom → slugified argument

Check if `.codevoyant/em/plans/{SLUG}/` already exists. If so, append `-2`, `-3`, etc. until unique.

Set `PLAN_DIR=".codevoyant/em/plans/{SLUG}"`.

Create directories:
```bash
mkdir -p "{PLAN_DIR}/breakdowns" "{PLAN_DIR}/research"
```

## Step 0 — System Audit

Run the following bash commands and store all findings as `AUDIT_CONTEXT`. Pass `AUDIT_CONTEXT` to every subsequent agent in this skill.

```bash
# 1. What shipped recently — avoids duplicating just-completed work
git log --oneline -20

# 2. Existing em plans — user decides if this is an update or a new plan
ls .codevoyant/em/plans/*/roadmap.md 2>/dev/null || echo "(no existing plans)"

# 3. Existing architecture/planning docs
for loc in docs/architecture/ docs/planning/ ARCHITECTURE.md; do
  [ -e "$loc" ] && echo "EXISTS: $loc" || echo "absent: $loc"
done
```

After running, apply the **"Boring by Default"** cognitive pattern to any verbal input already provided: if the user's description mentions a new framework or system where an existing one in the codebase could work, flag it explicitly in `AUDIT_CONTEXT` with the label `[BORING-BY-DEFAULT FLAG]`. Do not block the plan — just surface the flag for the user to see later.

If existing plans are found, surface them immediately:
```
Found existing plans: {list}
-> This will create a NEW plan ({SLUG}). If you meant to update an existing one, say "update {slug}" instead.
```

## Step 0.5: Work-Style Detection

Check for cached team configuration:
```bash
CONFIG_FILE=".codevoyant/em/team-config.json"
if [ -f "$CONFIG_FILE" ]; then
  WORK_STYLE=$(jq -r '.workStyle' "$CONFIG_FILE")  # "epic-based" | "project-based"
  TRACKER=$(jq -r '.tracker' "$CONFIG_FILE")        # "linear" | "github" | "notion" | "none"
  TRACKER_IDIOMS=$(jq -r '.idioms' "$CONFIG_FILE")  # free-form notes on team conventions
fi
```

If no config file exists, ask once and persist:

```
AskUserQuestion:
  question: "How does your team structure work?"
  multiSelect: false
  options:
    - label: "Epic-based (Linear, Jira)"
      description: "Work lives in Epics with child issues; planning = filling epics"
    - label: "Project-based (Linear Projects, Notion)"
      description: "Work lives in Projects with milestones; epics are optional groupings"
    - label: "Milestone-based (GitHub)"
      description: "Issues live in milestones; no formal epic concept"
    - label: "We use a custom system — I'll describe it"
```

Follow up: "Which tracker?" -> Linear / GitHub / Notion / GitLab / None (local only)

If Linear: ask "Do you use Cycles?" and "How do you model epics — as Issues with children, or as Projects?"

Write responses to `.codevoyant/em/team-config.json` (create `.codevoyant/em/` dir if needed):
```json
{
  "workStyle": "{epic-based|project-based|milestone-based|custom}",
  "tracker": "{linear|github|notion|gitlab|none}",
  "idioms": "{free-form notes on team conventions}"
}
```

Use `WORK_STYLE`, `TRACKER`, and `TRACKER_IDIOMS` to shape all subsequent questions and the roadmap format.

## Step 1: Gather Planning Context

Use AskUserQuestion:

```
question: "What are we planning?"
multiSelect: false
options:
  - label: "Single epic"
    description: "One large feature or initiative with sub-tasks"
  - label: "Multi-epic roadmap"
    description: "Multiple epics across a quarter or half-year"
  - label: "Feature sprint (1-2 weeks)"
    description: "Short horizon, tight scope"
```

Second question:
```
question: "Input source?"
multiSelect: true
options:
  - label: "Linear backlog URL or issue IDs"
  - label: "GitHub milestone or issues"
  - label: "I'll describe the epics verbally"
```

Third question:
```
question: "Team size for capacity planning?"
options:
  - label: "1-3 engineers"
  - label: "4-8 engineers"
  - label: "9+ engineers"
  - label: "Specify exactly"
```

## Step 2: Fetch Input

If ticket URLs were provided, fetch each using the ticket-fetch pattern:
- **Linear**: `mcp__claude_ai_Linear__get_issue` with the issue ID
- **GitHub**: `gh issue view {number} --json title,body,labels,milestone,assignees`
- **Notion**: `mcp__claude_ai_Notion__notion-search` for the page

Save fetched content to `{PLAN_DIR}/research/{epic-slug}.md`.

If verbal description, ask the user to describe each epic. Record in `{PLAN_DIR}/research/`.

## Step 3: Parallel Planning Analysis

Run three Task agents in parallel (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Agent P1 — Impact/Effort Matrix**: Categorize and prioritize epics by strategic value vs. effort. Produce a 2x2 matrix (high/low impact x high/low effort). Include `AUDIT_CONTEXT`.

**Agent P2 — Dependencies & Blockers**: Identify dependencies between epics and external blockers. Map which epics must come before others. Flag external team dependencies. Include `AUDIT_CONTEXT`.

**Agent P3 — Risks & Capacity**: Flag risks, unknowns, and capacity assumptions (holidays, on-call load, ramp-up time for new hires). Include `AUDIT_CONTEXT`.

Wait for all three (`TaskOutput block: true`). Synthesize findings into a unified analysis.

## Step 4: Draft Phased Roadmap

Using the synthesized analysis, draft a phased roadmap:

- **Phases** = monthly buckets (or logical milestones for single-epic)
- Each phase includes:
  - Theme (one sentence describing the phase's purpose)
  - Key deliverables (concrete, verifiable outcomes)
  - Dependencies (what must be true for this phase to start)
  - Team allocation % per epic
  - Risks specific to this phase
- **"NOT this period"** section — explicitly list what was considered and deferred, with rationale (prevents scope creep)
- **Assumptions** — team size, no major incidents, key people available, etc.
- **Open questions** — items that must be resolved before or during execution

## Step 5: Scope Confirmation Loop

Show a brief summary of the draft roadmap. Use AskUserQuestion:

```
question: "Does this roadmap reflect your priorities?"
options:
  - label: "Hold Scope — commit to this roadmap as-is"
  - label: "Selective Expansion — expand 1-2 specific epics deeper"
    description: "Drill into one or two epics with more sub-tasks or phases"
  - label: "Expansion — add an epic I didn't mention"
    description: "There's additional work that should be in this plan"
  - label: "Scope Reduction — cut something to make this more achievable"
    description: "Remove or defer an epic to fit team capacity"
  - label: "Adjust phasing — same epics, different timing"
    description: "Change what's in which phase without changing scope"
```

Loop on adjustments until the user selects "Hold Scope — commit to this roadmap as-is".

## Step 6: Write Roadmap

Write `{PLAN_DIR}/roadmap.md` with the full phased roadmap.

Extract the list of epics from the roadmap — these are the named initiatives that will each get a breakdown file. Derive a slug per epic (e.g. `auth-migration`, `search-v2`).

## Step 6.5: Architecture Design

For each epic, launch an architecture agent in parallel (`model: claude-sonnet-4-6`, `run_in_background: true`). Each agent receives the epic description, codebase context (from Step 3 agents), and `AUDIT_CONTEXT` from Step 0, and must produce:

**ASCII system diagram** — components involved, boundaries, data stores:
```
+-----------------+    +----------------+    +-----------------+
|   Client        |--->|   API Layer    |--->|   DB / Cache    |
+-----------------+    +----------------+    +-----------------+
```

**Data flow** — what data moves, in what direction, at what trigger

**API surface** — new or modified endpoints/contracts (method, path, payload shape)

**Failure modes** — top 3 ways this epic can fail in production with mitigations

**Hidden assumptions** — things that must be true for this design to hold (surface these explicitly)

**Edge cases** — inputs or states the happy path ignores

**One-way vs two-way door classification** — for each major architectural decision in this epic, classify explicitly:
- `ONE-WAY (!)` — hard to reverse once implemented (e.g. data model changes, public API contracts, infrastructure migrations). Document the rationale for choosing this path.
- `TWO-WAY` — easily changed later (e.g. internal implementation details, config values, UI layout)

**Error & Rescue Registry** — a table of every exception/failure class this epic can produce:

| Failure class | Trigger | Rescue action | User-facing message |
|---|---|---|---|
| (e.g. DB timeout) | (high write load) | (retry with backoff, fallback to cache) | ("Saving..." spinner, auto-retry) |

List the top 3-5 failure classes. Empty rows are not acceptable — if unknown, write `TBD — spike needed`.

**Cognitive patterns check** (agent must explicitly answer each):
- **Boring by Default**: Is there an existing solution in the codebase or ecosystem that avoids building this from scratch? If yes, name it. If no, state why not.
- **Systems Over Heroes**: Is this design a simple utility or a complex orchestrator? Flag if the design is adding orchestration where a simpler utility would do.
- **Reversibility Preference**: Are the reversible options favored where possible? If a one-way door was chosen over a two-way alternative, explain the tradeoff.

**Completeness Principle** (mandatory instruction to each architecture agent): Produce a complete architecture — all edge cases, all failure paths, all assumptions explicit. Do NOT produce a happy-path-only design. AI compression makes thorough architecture cost minutes; incomplete designs cost days in rework. If a section is genuinely unknown, write `TBD — spike needed` rather than omitting it.

Wait for all architecture agents (`TaskOutput block: true`). Append each epic's architecture section to `{PLAN_DIR}/roadmap.md` under a `### Architecture: {epic-name}` heading, and also save to `{PLAN_DIR}/breakdowns/{epic-slug}-arch.md` for standalone reference.

## Step 7: Epic Breakdowns

Invoke `em:breakdown` for each epic in parallel (Task agents, `run_in_background: true`). Pass each agent:
- The epic name and its section from `roadmap.md`
- The `PLAN_DIR` path so it writes to `{PLAN_DIR}/breakdowns/{epic-slug}.md`
- Any fetched ticket context from Step 2
- The detected `WORK_STYLE` and `TRACKER_IDIOMS`

Wait for all breakdown agents to complete (`TaskOutput block: true`). Report how many breakdown files were written.

## Step 7.5: Validation Pass

Run a minimum of 2 validation rounds autonomously — do NOT prompt the user during this loop.

### Per-Round Execution

**a.** Notify: `🔍 Validation round {round} running...`

**b.** Launch parallel validation agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Plan-level agent** — validates `{PLAN_DIR}/roadmap.md`:
- All phases have: theme, deliverables, dependencies, team allocation %, risks
- "NOT this period" section present with rationale
- Assumptions and open questions listed
- Architecture section present for each epic (from Step 6.5)
- Error & Rescue Registry filled — no empty rows; `TBD` only where genuinely unknown

**Per-epic agents** — one per file in `{PLAN_DIR}/breakdowns/`:
- ASCII architecture diagram present and non-trivial
- Data flow described
- API surface defined (or explicitly marked N/A)
- Failure modes table filled
- One-way vs two-way door classification present for each major decision
- Tasks specific and actionable (no vague verbs like "handle" or "deal with")

**c.** Collect all results (`TaskOutput block: true`). Merge into a single issue list.

Overall status = `PASS` only if all agents return `PASS`. Any `NEEDS_IMPROVEMENT` = round is `NEEDS_IMPROVEMENT`.

**d.** If `NEEDS_IMPROVEMENT`: auto-fix all issues across affected files, then continue.

**e.** Loop: break if `PASS` and round ≥ 2. Cap at 3 rounds.

Report: `✅ Validation complete ({N} rounds) — {PASS | X issues remain}`

## Step 8: Auto-Launch Review

Auto-launch `em:review` in background (always — not gated on `--bg`):

```
TaskCreate:
  subagent_type: general-purpose
  run_in_background: true
  description: "em:review auto-launched after plan completion"
  prompt: "Run /em:review {PLAN_DIR} --silent. Review roadmap.md and all breakdowns/, append findings to {PLAN_DIR}/review.md."
```

Report: `Plan written to {PLAN_DIR}/. Breakdowns: {N} epics. Review running in background.`

## Step 9: Notification

If `BG_MODE=true`, send a desktop notification:

```bash
npx @codevoyant/agent-kit notify --title "em:plan complete" --message "{N} epics planned and broken down. Review running."
```
