---
description: "Use when planning a project (epic) or initiative with Linear as tracker.
  Triggers on: \"em plan\", \"plan an engineering project\", \"plan a tech project\", \"plan an epic\", \"engineering planning\",
  \"initiative planning\", \"eng plan\", \"engineering roadmap\". Produces local milestone-grouped task
  plan then pushes to Linear on user confirmation."
name: em:plan
license: MIT
compatibility: "Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline. Core functionality preserved on all platforms."
argument-hint: '[project-description|linear-url] [--bg] [--silent]'
context: fork
agent: general-purpose
model: claude-opus-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially. The `context: fork` and `agent:` frontmatter fields are Claude Code-specific — on OpenCode and VS Code Copilot they are ignored and the skill runs inline using the current model.

---

## Critical Principles

- **Value first, descope ruthlessly.** — Ship the most value in the shortest time, even at the cost of product requirements. Every descoped item must be surfaced and confirmed, never silently dropped. The ideal plan balances short-term delivery speed with long-term investment in stability and continued engineering velocity.
- **Balance product needs and engineering constraints.** — Product requirements define desired outcomes; engineering constraints define what is achievable. When they conflict, negotiate scope explicitly rather than hiding technical debt. Flag any product requirement that carries hidden engineering cost.
- **Outcomes, not deliverables.** — The objective must state what changes for users or the business, not what gets built. "Ship the auth refactor" is a deliverable. "Reduce auth-related support tickets by 30%" is an outcome. If you cannot state the outcome, flag it before planning tasks.
- **Capacity is already allocated.** — A plan at 100% capacity is a plan that cannot absorb a single interrupt, bug, or scope discovery. Leave 20–30% unplanned. If the user insists on full allocation, flag it explicitly rather than silently accepting it.
- **Every dependency is a schedule bet.** — Any task blocked on another team, external API, or unresolved design decision is a risk multiplier, not just a sequencing note. Name the dependency, name who owns it, and name what happens if it slips.
- **Mermaid for all visual structure.** — Use Mermaid diagrams for timelines, milestone maps, and dependency graphs. Never use ASCII art for structured diagrams.

## Anti-Patterns

- ❌ **Objective stated as a feature list**: Writing the objective as a list of things to build ("Add SSO, add MFA, add session management") rather than a goal. → Ask: what user problem or business metric does this change? Restate as outcome before proceeding.
- ❌ **Tasks generated before design/SA is resolved**: Creating implement-phase tasks when Design/SA status is still open. → Design and SA decisions gate implementation scope. If design is deferred, create a design milestone task first; do not generate develop.md tasks that assume a design that hasn't been made.
- ❌ **Full-capacity milestone planning**: Filling every sprint or milestone to 100% of estimated capacity. → Apply the 70% rule: plan to 70% of capacity, leave 30% for discovered work. Flag to the user if their scope requires >80% utilization.
- ❌ **Acceptance criteria that cannot be verified in under 5 minutes**: ACs like "the feature works correctly" or "performance is acceptable." → Each AC must name a specific, observable condition a human can check in under 5 minutes without specialized tooling. Rewrite vague ACs before writing to disk.
- ❌ **Treating the codebase scan as optional research**: Skipping or summarizing Agent R1 when the project description seems self-contained. → Always complete the codebase scan. The most common planning waste is building something that already exists or that conflicts with an existing pattern.

---

Plan a project or initiative with Linear as tracker. Local-first: all artifacts land in `.codevoyant/plans/{slug}/`, then push to Linear on confirmation.

## Step 0: Parse Args

Extract flags:
```
BG_MODE  = true if --bg present
SILENT   = true if --silent present
```

- Detect Linear URL or issue ID in remaining args -> `SOURCE_ID`.
- Derive `SLUG` from description or SOURCE_ID; check `.codevoyant/plans/{slug}/` for collision (append `-2`, `-3`, etc.).

Set `PLAN_DIR=".codevoyant/plans/{SLUG}"`.

## Step 1: System Audit

Run the following bash commands and store all findings as `AUDIT_CONTEXT`:

```bash
git log --oneline -10
ls .codevoyant/plans/*/plan.md 2>/dev/null || echo "(no existing plans)"
ls docs/architecture/ 2>/dev/null && echo "arch docs present" || echo "no arch docs"
```

If existing plans are found, surface them:
```
Found existing plans: {list}
-> This will create a NEW plan ({SLUG}). If you meant to update an existing one, say "update {slug}" instead.
```

## Step 2: Gather Planning Context

AskUserQuestion:
```
question: "What are we planning?"
header: "Scope"
options:
  - label: "Single project (epic, 1-2 weeks)"
    description: "One bounded deliverable -- becomes a Linear Project"
  - label: "Initiative (multiple projects, possibly multiple teams)"
    description: "Larger goal spanning several epics -- becomes a Linear Initiative"
  - label: "Pull from Linear"
    description: "Fetch an existing Linear project or initiative to plan from"
```

If "Pull from Linear": ask for the URL or ID, then fetch using the appropriate MCP call based on the input:
- Issue URL or ID (e.g. `ENG-42`, contains `/issue/`): `mcp__linear-server__get_issue`
- Project URL (contains `/project/`): `mcp__linear-server__get_project`
- Initiative URL (contains `/initiative/`): `mcp__linear-server__get_initiative`

Store the fetched title, description, and status as `SOURCE_CONTEXT`.

Second question -- team context:
```
question: "Which team owns this?"
header: "Team"
```
Fetch teams: `mcp__linear-server__list_teams`. Present as options. Store as `TEAM_ID`, `TEAM_NAME`.

## Step 2.5: Fetch Requirements Context (if URL/ID provided)

- `mcp__linear-server__get_issue` or `mcp__linear-server__get_project`
- Store title, description, labels -> `SOURCE_CONTEXT`

## Step 2.6: Timeline, Scope, and Resources

Before gathering requirements, understand the constraints that will shape what can realistically be planned.

AskUserQuestion:
```
question: "What constraints does this project have?"
header: "Capacity"
questions:
  - question: "What is the target timeline for this project?"
    header: "Timeline"
    options:
      - label: "~1 week (small epic)"
      - label: "2–4 weeks (standard epic)"
      - label: "1–2 months (large initiative)"
      - label: "3+ months (major initiative)"
  - question: "How many engineers are available for this work?"
    header: "Team size"
    options:
      - label: "1 engineer"
      - label: "2–3 engineers"
      - label: "4+ engineers"
      - label: "Not yet determined"
  - question: "Are there hard deadlines or sequencing constraints?"
    header: "Constraints"
    options:
      - label: "No hard deadlines"
      - label: "Yes — I'll describe below"
      - label: "Soft target (not a blocker if missed)"
```

Store as `TIMELINE`, `TEAM_SIZE`, `CONSTRAINTS`. These will be used in Step 7 to descope items that exceed capacity.

Apply the 70% rule: never plan to more than 70% of calculated capacity. For a 1-engineer/2-week project, that is roughly 7 engineer-days of planned work, leaving 3 days for discovered work and interrupts.

## Step 3: Define Requirements

Gather:
- Functional requirements (what the system must do)
- Non-functional requirements (performance, security, scale)
- Acceptance criteria (how we know it's done)
- Design/SA status: already decided (describe it) | deferred (note what needs deciding)

AskUserQuestion after user describes the project:
```
question: "Is design/architecture already decided?"
header: "Design status"
options:
  - label: "Yes -- I'll describe the high-level design"
    description: "No code yet, but architecture is known"
  - label: "Deferred -- needs a design milestone"
    description: "Design work is part of this plan"
  - label: "Simple -- no design needed"
    description: "Straightforward task, no architecture decision"
```

## Step 3.5: Research backfill (if no prior exploration found)

Check for existing research:
- Look in `.codevoyant/explore/` for a dev:explore or pm:explore run relevant to this project (pm:explore artifacts live at `.codevoyant/explore/{slug}/summary.md`)

**If relevant research found:** load it as `PRIOR_RESEARCH` and skip this step.

**If no research found:** tell the user "No prior exploration found — I'll run lightweight research to ground the architecture before planning."

Ask one round of architecture clarifying questions:

AskUserQuestion:
```
question: "A few quick questions before I start planning."
header: "Architecture"
questions:
  - question: "Is there an existing architectural pattern in this codebase to follow?"
    header: "Architecture"
    options:
      - label: "Yes — I'll describe it"
      - label: "No — it's greenfield in this area"
      - label: "Unsure — check the codebase"
  - question: "Are there known libraries or tools you want to use or avoid?"
    header: "Tech constraints"
    options:
      - label: "Yes — I'll describe them"
      - label: "No constraints"
```

Launch 2 Sonnet agents in parallel (`run_in_background: false`, `model: claude-sonnet-4-6`):

**Agent A — Codebase architecture scan:**
Scan the repository for patterns, conventions, and existing implementations relevant to "{project description}".
- Glob and grep for related files, patterns, and abstractions
- Read the most relevant source files
- Identify what already exists and what must be built from scratch
- Write findings to `.codevoyant/plans/{slug}/research/codebase-backfill.md`

**Agent B — External architecture patterns:**
Research how this type of project is typically structured.
- Run WebSearch("{project type} architecture patterns")
- Run WebSearch("{project type} implementation best practices {stack}")
- Fetch 2 relevant URLs (engineering blogs, reference implementations)
- Write 4–6 findings with citations to `.codevoyant/plans/{slug}/research/external-backfill.md`

Wait for both to complete. Read outputs as `PRIOR_RESEARCH`.

**Executive decision protocol:**
After research, make decisive architectural calls rather than deferring every decision to the user. The guiding question: *what is the simplest architecture that solves the problem and fits the existing codebase conventions?* Principles:
- Prefer the architectural pattern already present in the codebase
- Prefer a well-maintained library over a custom implementation
- Prefer a smaller surface area — fewer new abstractions is better
- Flag any decision that is genuinely risky or controversial as `[ARCH DECISION — please confirm]`

Proceed to Step 4 with PRIOR_RESEARCH set.

## Step 4: Parallel Research

Launch two background agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Agent R1 -- Codebase Scan:** Glob/Grep for files relevant to this project. Identify affected systems, existing patterns, test coverage. Save to `.codevoyant/plans/{slug}/research/codebase.md`. Each finding must follow the format in `skills/shared/references/research-standards.md`.

**Agent R2 -- Linear Context:** Fetch related projects in the same team (`mcp__linear-server__list_projects`), any matching issues (`mcp__linear-server__list_issues` with text filter), existing labels. Save to `.codevoyant/plans/{slug}/research/linear-context.md`. Each finding must follow the format in `skills/shared/references/research-standards.md`.

Wait for both. Synthesize: flag anything that already exists or overlaps with active projects.

## Step 4.5: Quality Checkpoint

Before writing plan.md, run a structured self-check against these criteria. Output a Quality Checkpoint block as shown.

**Criteria:**

1. **Objective framing** — Does the objective describe a user/business outcome, not a deliverable list?
   - PASS: at least one bullet names a measurable outcome (metric, user behavior change, system property)
   - WARN: objective is ambiguous but not purely a feature list — note and proceed
   - BLOCK: objective is entirely a list of deliverables ("build X, add Y, implement Z") with no outcome → ask the user: "What changes for users or the business if this ships successfully?"

2. **Codebase scan completed** — Was Agent R1 run and did it produce findings?
   - PASS: R1 findings are present and non-empty
   - BLOCK: R1 was skipped or returned no findings → re-run R1 before proceeding

3. **Dependencies named** — Are external dependencies (other teams, external APIs, unresolved design decisions) explicitly named?
   - PASS: at least one dependency named with owner, or explicitly confirmed there are none
   - WARN: dependencies likely exist but were not surfaced — add a note in the plan's Open Questions

4. **Capacity headroom noted** — Is there any indication the plan accounts for buffer (not 100% allocated)?
   - PASS: user mentioned capacity constraints or the plan scope is clearly partial
   - WARN: no mention — add a reminder comment in the plan's milestone section

5. **Acceptance criteria measurable** — Are the stated ACs specific enough to verify in under 5 minutes?
   - PASS: each AC names a specific observable condition
   - WARN: one or more ACs are vague — flag them with inline comments in plan.md
   - BLOCK: all ACs are vague or absent → ask the user for at least one concrete, verifiable AC before proceeding

**Output format:**
```
## Quality Checkpoint

✅ Objective is outcome-framed (not a deliverable list)
✅ Codebase scan completed with findings
✅ 3 dependencies named with owners
⚠️  WARN: Capacity buffer not mentioned — will note in plan
❌ BLOCK: All ACs are vague — need at least one concrete, verifiable AC
   → Resolve: ask the user for specific acceptance criteria before writing

Quality Brief:
- Building X for Y to achieve Z (outcome confirmed)
- Key dependencies: [list]
- Gap: capacity buffer not mentioned — adding reminder in milestone section
- BLOCK: ACs need user input before proceeding
```

**BLOCK behavior:** If one or more BLOCKs are found, do not proceed to Step 5. Present the BLOCK items to the user with specific questions and wait for resolution. After resolution, re-run the checkpoint.

After running the checkpoint, write the Quality Brief (3–5 bullets) and use it as the grounding context for Step 5.

## Step 5: Build Milestone Task Plan

Create plan directory:
```bash
mkdir -p .codevoyant/plans/{slug}/tasks
mkdir -p .codevoyant/plans/{slug}/research
```

Write `.codevoyant/plans/{slug}/plan.md` using the plan template at `references/plan-template.md`.

After writing plan.md, scan the Objective bullets. If any bullet's primary verb is a delivery verb (ship / build / implement / deliver / release / complete):
  Insert an inline comment: `<!-- RIGOR: reframe as outcome — what changes for users/team? -->`
  and flag in the scope confirmation summary: "1 objective bullet uses output framing — see plan.md comment."

Generate the three milestone files inline:
- `tasks/design.md` -- design, UX, architecture, product research tasks
- `tasks/develop.md` -- implementation tasks (only after design is defined/deferred)
- `tasks/deploy.md` -- staging + prod deployment, smoke tests, rollback plan

Each task file uses the template at `references/task-template.md`. Requirements and ACs must be spelled out per task. Design/SA must be specified or explicitly marked deferred.

If the plan has inter-milestone dependencies, a timeline, or a system architecture relevant to the project, include a Mermaid diagram in plan.md. For example:
- Gantt chart for timeline-heavy plans
- Sequence diagram for plans involving multiple system interactions
- Flowchart for plans with branching decision logic

Register the plan with agent-kit:

```bash
npx @codevoyant/agent-kit plans register \
  --name "{SLUG}" \
  --plugin em \
  --description "{OBJECTIVE first line}" \
  --total "{total task count from all milestone files}"
```

Report: `✓ Plan registered: {SLUG}`

## Step 6: Scope Confirmation Loop

Show plan summary.

**Capacity check:**

Calculate total task count across all milestone files. Compare against available capacity (from Step 2.6):
- Available capacity = `TEAM_SIZE × TIMELINE_DAYS × 0.7` (70% rule)
- If total tasks exceed available capacity: surface which tasks to descope, with rationale

Present to user:
```
📊 Capacity: {N} tasks planned, ~{X} engineer-days available (70% of {Y})
{if over capacity:}
⚠️ Over capacity by ~{Z} tasks. Suggested descopes:
  - {task} → reason: lowest priority / deferred by {rationale}
```

AskUserQuestion:
```
question: "Does this plan cover everything?"
header: "Plan Review"
options:
  - label: "Looks good — done"
    description: "Save the plan to .codevoyant/plans/{slug}/ and register with agent-kit"
  - label: "Adjust scope"
    description: "Change what's in the plan before saving"
```

Loop on adjustments until "Looks good — done".

## Step 7: Notification

If `BG_MODE`:

```bash
npx @codevoyant/agent-kit notify --title "em:plan complete" --message "Plan '{slug}' saved to .codevoyant/plans/{slug}/. Run /em:approve to promote."
```
