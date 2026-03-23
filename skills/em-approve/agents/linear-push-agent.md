# linear-push-agent

**Model:** claude-sonnet-4-6
**Background:** false
**Purpose:** Syncs an approved em-plan to Linear — creating projects and milestones. Does NOT create issues (that is dev-plan's responsibility).

## Inputs

- `{COMMIT_DIR}` — path to the promoted plan directory (e.g. `docs/engineering/plans/{slug}/`)
- `{PLAN_DIR}` — path to the draft plan directory (`.codevoyant/plans/{slug}/`)
- `{SLUG}` — plan slug
- `{LINEAR_URL}` — optional existing Linear project URL (empty = create new)

## Prompt

You are syncing an approved engineering plan to Linear.

### Step 0: Detect plan type

Read `{COMMIT_DIR}/plan.md`. Determine whether this is a **single-project plan** or an **initiative plan**:

- **Initiative plan**: plan.md contains multiple `### Project N:` or `### Project N —` headings, OR the metadata contains `Linear Initiative:` field, OR task files are named per project (e.g. `tasks/norm.md`, `tasks/skill-issues.md`)
- **Single-project plan**: everything else

Set `PLAN_TYPE = initiative | single`.

**If `PLAN_TYPE = initiative`**: skip Steps 1–5 and follow the **Initiative Flow** at the end of this document.
**If `PLAN_TYPE = single`**: continue with Step 1.

---

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
  - `addTeams`: [TEAM_NAME]
  - `startDate`: START_DATE (if found)
  - `targetDate`: END_DATE (if found)
- Note: "Created new project: {name} — {Linear URL}"

Store PROJECT_ID.

### Step 4: Create milestones

Parse milestone sections from `{COMMIT_DIR}/plan.md`. Look for headings matching any of these patterns:
- `### M1 — Name`, `### M2 — Name` (numbered milestone pattern)
- `## Milestone 1: Name`, `## Milestone 2: Name`
- `### Phase 1 — Name`, `### Phase 2 — Name`

For each milestone found, extract:
- **Name**: the milestone heading text (e.g. "M1 — Extract and package")
- **Description**: the paragraph or bullet list immediately following the heading (summarise to 2-3 sentences max)
- **Target date**: look for a `**Target:**` or `**Due:**` field under the heading, or estimate from any Gantt chart / timebox metadata in the plan. Use ISO format (YYYY-MM-DD). If no date can be determined, omit.

For each milestone, call `save_milestone` with:
- `project`: PROJECT_ID
- `name`: milestone name
- `description`: milestone description
- `targetDate`: target date (if available)

Store a mapping: `MILESTONE_MAP[milestone_name] = milestone_id` (returned by `save_milestone`).

If no milestone headings are found in plan.md, skip this step (no milestones created).

## Linear Sync Report

### Project
{Created / Updated}: [{name}]({url})
Start: {START_DATE or "not set"} | Target: {END_DATE or "not set"}

### Milestones created
{count} milestones: {list of milestone names}
(or "None found in plan.md")

### Errors
{any failures or "None"}

## Output

Reports results inline (no file output).

---

## Initiative Flow

Used when `PLAN_TYPE = initiative`. Syncs multiple projects and their issues to a Linear initiative.

### I-1: Read initiative metadata

From plan.md extract:
- Initiative name (H1)
- Objective
- `Linear Initiative:` URL if present → `INITIATIVE_URL`
- List of all projects: parse `### Project N:` sections, extracting project name, Linear project name, timebox/dates

### I-2: Resolve Linear initiative

If `{LINEAR_URL}` contains `/initiative/`: use it as INITIATIVE_URL.
If INITIATIVE_URL found in plan metadata: use it.
Otherwise: note "No initiative URL — projects will be created standalone."

### I-3: For each project — create/update project + milestones

For each project section in plan.md, in parallel:

1. **Resolve project**: call `save_project` (create or update via name match):
   - `name`: project name from plan
   - `description`: project objective/description from plan
   - `addTeams`: [TEAM_NAME]
   - `addInitiatives`: [INITIATIVE_URL] (if available)
   - `startDate`, `targetDate`: from timebox metadata

2. **Create milestones**: parse `#### Milestones` subsection under this project. For each milestone (`M1 —`, `M2 —`, etc.) call `save_milestone` with project ID, name, description, targetDate.

Issues are created by dev-plan, not here.

### I-4: Report

```
## Initiative Sync Report

Initiative: {name} ({url or "standalone"})

Projects synced: {N}
| Project          | Created/Updated | Milestones |
|------------------|-----------------|------------|
| norm             | Created         | 1          |
| skill-issues     | Created         | 5          |
| ...              | ...             | ...        |

Errors: {any failures or "None"}
```
