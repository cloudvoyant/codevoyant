# linear-push-agent

**Model:** claude-sonnet-4-6
**Background:** false
**Purpose:** Syncs an approved em-plan to a Linear project — creating one if needed — setting start/end dates, and creating issues (no milestones) directly under the project.

## Inputs

- `{COMMIT_DIR}` — path to the promoted plan directory (e.g. `docs/engineering/plans/{slug}/`)
- `{PLAN_DIR}` — path to the draft plan directory (`.codevoyant/plans/{slug}/`)
- `{SLUG}` — plan slug
- `{LINEAR_URL}` — optional existing Linear project URL (empty = create new)

## Prompt

You are syncing an approved engineering plan to Linear.

### Step 1: Read the plan

Read `{COMMIT_DIR}/plan.md`. Extract:
- Plan name (first H1 heading)
- Objective (first paragraph after Objective header)
- Timeline: look for start/end date metadata or Gantt chart. If found, extract START_DATE and END_DATE in ISO format (YYYY-MM-DD). If not explicitly stated, leave blank.
- Team name (if present in metadata)

### Step 2: Resolve the Linear team

Call `list_teams`. If TEAM_ID is set in plan.md metadata, use it. Otherwise present teams to the user and ask which to use.

### Step 3: Resolve the project

**If `{LINEAR_URL}` is provided:**
- Extract the project ID from the URL
- Call `get_project` to verify it exists
- Call `save_project` to update its name, description (objective text), and dates if available
- Note: "Updated existing project: {name}"

**If `{LINEAR_URL}` is empty:**
- Call `save_project` with:
  - `name`: plan name
  - `description`: objective text
  - `teamId`: TEAM_ID
  - `startDate`: START_DATE (if found)
  - `targetDate`: END_DATE (if found)
- Note: "Created new project: {name} — {Linear URL}"

Store PROJECT_ID.

### Step 4: Create issues from task files

Read all task files in `{COMMIT_DIR}/tasks/*.md` (or `{PLAN_DIR}/tasks/*.md` if not in COMMIT_DIR).

For each task found:
1. Parse title, description, and acceptance criteria
2. Call `save_issue` with:
   - `teamId`: TEAM_ID
   - `projectId`: PROJECT_ID
   - `title`: task title
   - `description`: task description + ACs formatted as markdown
   - **Do NOT set `projectMilestoneId`** — no milestones

**Link git repos:** Run `git remote -v` to find the repo URL. If found, attempt to create an attachment on each issue linking to the repo using `create_attachment`:
  - `url`: repo URL
  - `title`: "Git Repository"
  - `issueId`: issue ID

## Linear Sync Report

### Project
{Created / Updated}: [{name}]({url})
Start: {START_DATE or "not set"} | Target: {END_DATE or "not set"}

### Issues created
{count} issues under project (no milestones)

### Git repo linked
{repo URL or "not found"}

### Errors
{any failures or "None"}

## Output

Reports results inline (no file output).
