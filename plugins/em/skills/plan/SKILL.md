---
description: "Use when planning a project (epic) or initiative with Linear as tracker.
  Triggers on: \"em plan\", \"plan a project\", \"plan an epic\", \"engineering planning\",
  \"what should we build\", \"initiative planning\". Produces local milestone-grouped task
  plan then pushes to Linear on user confirmation."
argument-hint: "[project-description|linear-url] [--delegate] [--continue <id>] [--push <slug>] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-opus-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Plan a project or initiative with Linear as tracker. Local-first: all artifacts land in `.codevoyant/em/plans/{slug}/`, then push to Linear on confirmation.

## Step 0: Parse Args

Extract flags:
```
DELEGATE    = true if --delegate present
CONTINUE_ID = value after --continue (Linear project ID or URL)
PUSH_SLUG   = value after --push (existing local plan slug to re-push)
BG_MODE     = true if --bg present
SILENT      = true if --silent present
```

- If `PUSH_SLUG` set: read `.codevoyant/em/plans/{PUSH_SLUG}/` local files and jump directly to **Step 8 (Push to Linear)**.
- If `CONTINUE_ID` set: jump to **Step 0.5 (Continue Mode)**.
- Detect Linear URL or issue ID in remaining args -> `SOURCE_ID`.
- Derive `SLUG` from description or SOURCE_ID; check `.codevoyant/em/plans/{slug}/` for collision (append `-2`, `-3`, etc.).

Set `PLAN_DIR=".codevoyant/em/plans/{SLUG}"`.

## Step 0.5: Continue Mode (only if --continue)

Extract project ID from `CONTINUE_ID` (strip URL prefix if a Linear URL was provided).

### Fetch Linear state (in sequence):

1. `mcp__claude_ai_Linear__get_project(id=CONTINUE_ID)` -- get project name, description, status. Derive `SLUG` from project name.
2. `mcp__claude_ai_Linear__list_milestones` filtered by `projectId=CONTINUE_ID` -- get milestone names and sort orders.
3. `mcp__claude_ai_Linear__list_issues` filtered by `projectId=CONTINUE_ID`, `includeArchived=false` -- get all active/completed/cancelled issues with their milestone assignments.

Set `PLAN_DIR=".codevoyant/em/plans/{SLUG}"`.

### Map Linear state to local plan:

**If local plan files do NOT exist yet** (first `--continue` run):
- Create `PLAN_DIR` directory structure (`tasks/`, `research/`)
- Write `plan.md` from project description using `references/plan-template.md`
- Create milestone files (`tasks/design.md`, `tasks/develop.md`, `tasks/deploy.md`) from Linear milestones, populating tasks using `references/task-template.md`
- Record Linear IDs in `linear-ids.json`

**If local plan files already exist** (reconciliation):
- **Local is source of truth for:** requirements, ACs, design/SA notes (do not overwrite from Linear)
- **Linear is source of truth for:** issue status, new issues added by team members
- Completed issues in Linear -> mark as `[x]` in the relevant milestone file
- Cancelled issues in Linear -> note as `~~dropped~~` with cancellation reason if available
- New issues in Linear (not in local files) -> append to the relevant milestone file using `references/task-template.md`
- Update `plan.md` milestone status table with current completion counts

### Resume planning:

After reconciliation, proceed to **Step 7 (Scope Confirmation Loop)** for the user to review the updated state.

On confirmation: push only changed items back to Linear via `mcp__claude_ai_Linear__save_issue` for any locally modified issues (updated requirements, ACs, or design notes). Do not re-push items whose only change came from Linear.

## Step 1: System Audit

Run the following bash commands and store all findings as `AUDIT_CONTEXT`:

```bash
git log --oneline -10
ls .codevoyant/em/plans/*/plan.md 2>/dev/null || echo "(no existing plans)"
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

If "Pull from Linear": ask for URL/ID, fetch via MCP, seed context.

Second question -- team context:
```
question: "Which team owns this?"
header: "Team"
```
Fetch teams: `mcp__claude_ai_Linear__list_teams`. Present as options. Store as `TEAM_ID`, `TEAM_NAME`.

## Step 2.5: Fetch Requirements Context (if URL/ID provided)

- `mcp__claude_ai_Linear__get_issue` or `mcp__claude_ai_Linear__get_project`
- Store title, description, labels -> `SOURCE_CONTEXT`

## Step 3: Define Requirements

If `DELEGATE=true`: skip detailed requirements -- ask only for a 1-paragraph summary per project; proceed to Step 6 (Delegate).

Otherwise, gather:
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

## Step 4: Parallel Research

Launch two background agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Agent R1 -- Codebase Scan:** Glob/Grep for files relevant to this project. Identify affected systems, existing patterns, test coverage. Save to `.codevoyant/em/plans/{slug}/research/codebase.md`.

**Agent R2 -- Linear Context:** Fetch related projects in the same team (`mcp__claude_ai_Linear__list_projects`), any matching issues (`mcp__claude_ai_Linear__list_issues` with text filter), existing labels. Save to `.codevoyant/em/plans/{slug}/research/linear-context.md`.

Wait for both. Synthesize: flag anything that already exists or overlaps with active projects.

## Step 5: Build Milestone Task Plan

If `DELEGATE=true`: skip this step entirely -- proceed to **Step 6 (Delegate Mode)**.

Create plan directory:
```bash
mkdir -p .codevoyant/em/plans/{slug}/tasks
mkdir -p .codevoyant/em/plans/{slug}/research
```

Write `.codevoyant/em/plans/{slug}/plan.md` using the plan template at `references/plan-template.md`.

Generate the three milestone files inline:
- `tasks/design.md` -- design, UX, architecture, product research tasks
- `tasks/develop.md` -- implementation tasks (only after design is defined/deferred)
- `tasks/deploy.md` -- staging + prod deployment, smoke tests, rollback plan

Each task file uses the template at `references/task-template.md`. Requirements and ACs must be spelled out per task. Design/SA must be specified or explicitly marked deferred.

## Step 6: Delegate Mode (only if DELEGATE=true)

Create plan directory and write lightweight stubs instead of full milestone breakdown:

```bash
mkdir -p .codevoyant/em/plans/{slug}/tasks
mkdir -p .codevoyant/em/plans/{slug}/research
```

Write `.codevoyant/em/plans/{slug}/plan.md` using `references/plan-template.md` (mark milestones as "delegated").

Write `tasks/stubs.md`:
```markdown
# Delegation Stubs — {project name}

These issues will be created in Linear for the relevant teams to detail.

## PM Stub
**Title:** PM: {project} — define requirements and acceptance criteria
**Description:** Scope: {1-paragraph summary}. Owner: PM team.

## UX Stub
**Title:** UX: {project} — design exploration and wireframes
**Description:** Scope: {1-paragraph summary}. Owner: UX team. Starts after PM stub resolved.

## DEV Stub
**Title:** DEV: {project} — architecture spike
**Description:** Scope: {1-paragraph summary}. Owner: Engineering. Starts after PM + UX stubs.
```

Proceed to Step 7 (confirmation) with delegate context flagged.

## Step 7: Scope Confirmation Loop

Show plan summary. If `DELEGATE=true`: show stub titles from `tasks/stubs.md` (not full task list). If `CONTINUE_ID` was set: show reconciliation diff (new issues, status changes).

AskUserQuestion:
```
question: "Does this plan cover everything?"
header: "Plan Review"
options:
  - label: "Confirm -- push to Linear"
    description: "Create project, milestones, and issues in Linear"
  - label: "Adjust scope"
    description: "Change what's in the plan before pushing"
  - label: "Save locally only"
    description: "Keep as local draft, don't push to Linear yet"
```

Loop on adjustments until "Confirm" or "Save locally only".

## Step 8: Push to Linear

Only runs if user selected "Confirm -- push to Linear" (or `--push` flag).

Follow the MCP call sequence in `references/linear-push-guide.md`:

1. If initiative-level: `mcp__claude_ai_Linear__save_initiative` -> store `INITIATIVE_ID`
2. `mcp__claude_ai_Linear__save_project` with `teamId`, `name`, description (from plan.md objective), `initiativeId` if set -> store `PROJECT_ID`
3. For each milestone (design / develop / deploy):
   `mcp__claude_ai_Linear__save_milestone` with `projectId=PROJECT_ID`, name, sortOrder -> store `MILESTONE_IDs`
4. For each task in each milestone file:
   `mcp__claude_ai_Linear__save_issue` with `teamId`, `projectId`, `projectMilestoneId`, title, description (requirements + ACs)

If `DELEGATE=true`: skip milestone creation (steps 2-3 above). Create only the project and the 3 stub issues from Step 6 (PM, UX, DEV). No milestones are created.

Record all created IDs in `.codevoyant/em/plans/{slug}/linear-ids.json`.

Report: `Pushed to Linear: {project-url}. {N} milestones, {M} issues created.`

## Step 9: Notification

```bash
npx @codevoyant/agent-kit notify --title "em:plan complete" --message "Plan '{slug}' confirmed and pushed to Linear: {M} issues across 3 milestones."
```
