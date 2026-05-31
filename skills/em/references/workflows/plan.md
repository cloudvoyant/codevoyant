# plan

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

## Step 2: Gather Planning Context (minimize questions)

**Scope inference (no question by default):**

- If args contain a Linear URL or issue ID, set `SOURCE_ID` and fetch using the appropriate MCP call:
  - Issue URL or ID (e.g. `ENG-42`, contains `/issue/`): `mcp__linear-server__get_issue`
  - Project URL (contains `/project/`): `mcp__linear-server__get_project`
  - Initiative URL (contains `/initiative/`): `mcp__linear-server__get_initiative`
  - Store fetched title, description, and status as `SOURCE_CONTEXT`.
- If args contain a free-text scope description, use it directly as the planning objective.
- Only if args are empty AND no source is set, ask **one** AskUserQuestion: "What are we planning?" with options "Single project" / "Initiative" / "Pull from Linear (provide URL)".

**Team selection (auto-select when possible):**

Fetch teams via `mcp__linear-server__list_teams`.
- If exactly one team exists, auto-select it. Report: `✓ Team auto-selected: {TEAM_NAME}` and proceed.
- If multiple teams, ask one AskUserQuestion: "Which team owns this?" presenting teams as options.

Store as `TEAM_ID`, `TEAM_NAME`.

## Step 2.5: Fetch Requirements Context (if URL/ID provided)

- `mcp__linear-server__get_issue` or `mcp__linear-server__get_project`
- Store title, description, labels -> `SOURCE_CONTEXT`

## Step 2.6: Default Constraints (no question)

Do **not** ask for timeline, team size, or constraints up-front. Use these defaults:

- `START_DATE = today`
- `END_DATE = unset` (derived from estimates in Step 5.5)
- `TEAM_SIZE = 1` (sensible default; can be raised by user later via `/spec update` if explicit team capacity is provided in args)
- `CONSTRAINTS = "(none captured — surface via scope confirmation in Step 6)"`

Set `AVAILABLE_ENGINEER_DAYS = "(derived from estimates)"`. Capacity-versus-utilization warnings still fire in Step 5.5 once estimates exist; the 70% rule is applied there.

If the user wants to add hard dates, capacity, or constraints later, they will do so during the Step 6 scope confirmation loop.

## Step 3: Define Requirements (no design status question)

Gather:
- Functional requirements (what the system must do)
- Non-functional requirements (performance, security, scale)
- Acceptance criteria (how we know it's done)

Do **not** ask "is design/architecture already decided?". Default to **design TBD** — discover it during planning via Step 3.5 research and the codebase scan (Step 4 Agent R1). If research and codebase signals indicate a clear existing pattern, the planner adopts it; otherwise a design milestone is added automatically.

## Step 3.6: Scope Coverage Reconciliation (if source is a roadmap or initiative)

**Run this step only when the plan derives from a product roadmap, Linear initiative, or any multi-item source.**

Enumerate every item in the source (roadmap features, initiative projects, epic list). For each item, classify it as:

| Status | Meaning |
|--------|---------|
| `IN` | Addressed by this plan |
| `PARTIAL` | Partially addressed — note what's left out |
| `OUT` | Not addressed — must state why |

For every `OUT` or `PARTIAL` item, record a reason from this taxonomy:

- **Capacity** — would exceed available engineer-days given timeline
- **Dependency** — blocked on another team, project, or unresolved design decision (name the blocker)
- **Technical constraint** — requires infrastructure, tooling, or a prerequisite that doesn't exist yet
- **Timeline** — out of scope for this half/quarter; planned for a later period (name when)
- **Explicitly deferred** — agreed with stakeholders to defer; not a blocker for current goals
- **Out of initiative** — belongs to a different team or project; not this plan's responsibility

Write a `## Scope Decisions` section in `plan.md` with this table:

```markdown
## Scope Decisions

| Item | Status | Reason |
|------|--------|--------|
| Feature A | IN | — |
| Feature B | OUT | Capacity — exceeds available engineer-days; deferred to next half |
| Feature C | OUT | Dependency — blocked on Platform team releasing X |
| Feature D | PARTIAL | Timeline milestone 1 only; full rollout in H2 |
```

**This section is mandatory when a source document exists.** An em plan with a product roadmap as input that does not document scope decisions is incomplete.

## Step 3.5: Research backfill (if no prior exploration found)

Check for existing research:
- Look in `.codevoyant/explore/` for a dev:explore or pm:explore run relevant to this project (pm:explore artifacts live at `.codevoyant/explore/{slug}/summary.md`)

**If relevant research found:** load it as `PRIOR_RESEARCH` and skip this step.

**If no research found:** tell the user "No prior exploration found — running lightweight architecture research." Do not ask architecture or tech-constraint questions — the agent decides based on codebase context.

Launch 2 Sonnet agents in parallel (`run_in_background: false`, `model: claude-sonnet-4-6`):

**Agent A — Codebase architecture scan:**
Scan the repository for patterns, conventions, and existing implementations relevant to "{project description}".
- Glob and grep for related files, patterns, and abstractions
- Read the most relevant source files
- Identify what already exists and what must be built from scratch
- Write findings to `.codevoyant/explore/{slug}/architecture-research.md` under a `## Codebase Scan` section

**Agent B — External architecture patterns:**
Research how this type of project is typically structured.
- Run WebSearch("{project type} architecture patterns")
- Run WebSearch("{project type} implementation best practices {stack}")
- Fetch 2 relevant URLs (engineering blogs, reference implementations)
- Append 4–6 findings with citations to `.codevoyant/explore/{slug}/architecture-research.md` under an `## External Patterns` section

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

**Agent R1 -- Codebase Scan:** Glob/Grep for files relevant to this project. Identify affected systems, existing patterns, test coverage. Append findings to `.codevoyant/explore/{slug}/architecture-research.md` under a `## Codebase Deep Scan` section. Each finding must follow the format in `skills/em/references/research-standards.md`.

**Agent R2 -- Linear Context:** Fetch related projects in the same team (`mcp__linear-server__list_projects`), any matching issues (`mcp__linear-server__list_issues` with text filter), existing labels. Append findings to `.codevoyant/explore/{slug}/architecture-research.md` under a `## Linear Context` section. Each finding must follow the format in `skills/em/references/research-standards.md`.

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
mkdir -p .codevoyant/explore/{slug}
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

**Implementation guidance for `develop.md` tasks:** When a task includes build, test, lint, or format commands, the executing agent MUST call `/tasks detect` to identify the project's task runner and `/tasks list` to discover available recipes — and reference those recipe names in the task body. Never write raw `tsc`, `vitest`, `eslint`, etc. when a task wraps them.

After generating the task files, proceed to Step 5.5 before writing the Gantt or project-breakdown-proposal.

## Step 5.5: Parallel Milestone Estimation

Launch one estimation agent per milestone in parallel (`model: claude-haiku-4-5-20251001`, `run_in_background: true`).

Each agent receives its milestone's task file and answers:

```
For milestone "{milestone name}", given these tasks:
{task list}

Produce a structured estimate:
- Optimistic: X engineer-days (everything goes well)
- Realistic:  Y engineer-days (expected with normal friction)
- Pessimistic: Z engineer-days (if complexity materialises or blockers hit)
- Key risks: up to 3 risks that most threaten this estimate
- Dependencies: tasks that must complete before this milestone can start (from other milestones or external)
```

Collect all estimates. Compute totals:
- `TOTAL_REALISTIC` = sum of realistic estimates across all milestones
- `UTILISATION` = `TOTAL_REALISTIC / AVAILABLE_ENGINEER_DAYS × 100%`

**If `UTILISATION > 80%`:** surface over-capacity warning before writing dates. Present to user:
```
⚠️  Estimates total ~{TOTAL_REALISTIC} engineer-days against ~{AVAILABLE_ENGINEER_DAYS} available ({UTILISATION}% utilisation).
Suggested descopes to reach 70%:
  - {milestone or task} — saves ~N days — reason: {lowest risk/priority}
```
Ask: "Accept estimates as-is, or descope before locking the plan?"

**If `UTILISATION ≤ 80%`:** proceed without prompting.

Use the realistic estimates to assign actual start and end dates to each milestone in the Gantt chart — do not assign arbitrary dates. If `START_DATE` is set, schedule milestones sequentially from that date (accounting for parallelism where tasks are independent). If no `START_DATE`, use today as the anchor.

Now write `.codevoyant/explore/{slug}/project-breakdown-proposal.md` containing:
- **Objective** (one paragraph)
- **Milestones** — name, start date, end date, realistic estimate, task count, key deliverables
- **Estimation summary** — optimistic / realistic / pessimistic totals, utilisation %
- **Risks** — top risks from estimation agents that could blow the timeline
- **Out of scope** — anything from the Scope Decisions table with `OUT` status
- **Open questions** — unresolved design/architecture decisions

If the plan has inter-milestone dependencies or a timeline, include a **Mermaid Gantt** in plan.md using the estimated dates (not arbitrary ones). For system architecture plans, also add a flowchart or sequence diagram. For example:
- Gantt chart for timeline-heavy plans
- Sequence diagram for plans involving multiple system interactions
- Flowchart for plans with branching decision logic

Register the plan in `.codevoyant/README.md`:

```bash
PLAN_DESCRIPTION="{OBJECTIVE first line}"
grep -q "| {SLUG} |" .codevoyant/README.md 2>/dev/null || \
  printf "| %s | Active | em | %s | %s | %s |\n" \
    "{SLUG}" "$PLAN_DESCRIPTION" "$(date +%Y-%m-%d)" "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '(none)')" \
    >> .codevoyant/README.md
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
    description: "Save the plan to .codevoyant/plans/{slug}/ and register in .codevoyant/README.md"
  - label: "Adjust scope"
    description: "Change what's in the plan before saving"
```

Loop on adjustments until "Looks good — done".

## Step 7: Notification

If `BG_MODE`, report completion to the user with a brief summary stating that plan `{slug}` was saved to `.codevoyant/plans/{slug}/` and instructing them to run `/em approve` to promote it.
