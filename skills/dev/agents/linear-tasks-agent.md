# linear-tasks-agent

**Model:** claude-sonnet-4-6
**Background:** false
**Purpose:** Creates Linear tasks from the task breakdown in a dev plan architecture plan. Each task includes enough context for autonomous execution via spec new/spec bg. Attaches the git repo to each task.

## Inputs

- `{PLAN_DIR}` — draft plan directory (`.codevoyant/plans/{slug}/`)
- `{COMMIT_PATH}` — promoted doc path (e.g. `docs/architecture/{slug}.md`)
- `{SLUG}` — plan slug (used as Linear project name if creating new)
- `{LINEAR_URL}` — optional existing Linear project URL (empty = create new)

## Prompt

You are creating Linear tasks from an architecture plan's task breakdown.

### Step 1: Read the plan

Read `{COMMIT_PATH}` (fallback: `{PLAN_DIR}/plan.md`).

Extract the `## Task Breakdown` section. Parse each task entry:
- Task name
- LOE (hours)
- Description
- Blocks / Blocked by relationships

If no Task Breakdown section exists, report "No task breakdown found — skipping Linear task creation." and stop.

### Step 2: Resolve the Linear team

Call `list_teams`. Present to user if more than one team exists. Store TEAM_ID.

### Step 3: Resolve the project

**If `{LINEAR_URL}` is provided:**
- Extract project ID from URL, call `get_project` to verify
- Store PROJECT_ID and PROJECT_NAME
- Note: "Using existing project: {name}"

**If `{LINEAR_URL}` is empty:**
- Call `save_project` with:
  - `name`: {SLUG} (humanised, e.g. "auth-refresh-flow" → "Auth Refresh Flow")
  - `description`: first paragraph of the Context section from plan.md
  - `teamId`: TEAM_ID
- Store PROJECT_ID
- Note: "Created new project: {name} — {Linear URL}"

### Step 4: Create issues from task breakdown

For each task in the breakdown:

1. **Build the task description for autonomous execution.** The description must be self-contained enough for an agent to run `/spec new` and `/spec bg` without further human input. Structure each issue description as:

   ```markdown
   ## Context

   This task implements the **{task name}** component described in the architecture doc at `{COMMIT_PATH}`.

   ### Relevant architecture sections

   {Copy the specific Design Decision, Data Model, API Surface, and/or System Boundaries sections from the architecture doc that pertain to this task. Include enough detail that the implementer does not need to read the full doc.}

   ## Scope

   {Task description from the breakdown — what specifically needs to be built or changed.}

   ## Constraints

   - **LOE**: {N} hours (rough estimate)
   - **Blocks**: {list of task names this must complete before}
   - **Blocked by**: {list of tasks that must complete first}
   - **Key decisions**: {any ONE-WAY door decisions from the architecture doc relevant to this task}

   ## Acceptance criteria

   {Derive specific, verifiable acceptance criteria from the architecture doc's design decisions and the task description. Each AC must be checkable in under 5 minutes.}

   ## Implementation hint

   To implement this task autonomously:
   1. Read the architecture doc at `{COMMIT_PATH}` for full context
   2. Run `/spec new {task-name-slug}` to create an implementation plan
   3. Run `/spec bg` to execute autonomously
   ```

2. Call `save_issue` with:
   - `teamId`: TEAM_ID
   - `projectId`: PROJECT_ID
   - `title`: task name
   - `description`: the structured description above
   - Do NOT set `projectMilestoneId`

3. Store ISSUE_ID and ISSUE_URL

**Link git repo:** Run `git remote -v` to find repo URL. If found, call `create_attachment` on each issue:
  - `url`: repo URL
  - `title`: "Git Repository"
  - `issueId`: ISSUE_ID

### Step 5: Report

## Linear Tasks Report

### Project
{Created / Updated}: [{name}]({url})

### Tasks created
{list of task names with LOE and Linear URLs}

### Git repo linked
{repo URL or "not found"}

### Errors
{any failures or "None"}

## Output

Reports results inline (no file output).
