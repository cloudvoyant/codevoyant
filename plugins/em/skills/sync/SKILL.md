---
description: Import or export an em roadmap to/from Linear, Notion, or GitHub. Bidirectional — pull epics/projects from your tracker into a local roadmap, or push a local em:plan roadmap back to the tracker. Respects team work-style (epic-based vs project-based) and tracker idioms. Triggers on: em sync, push to linear, pull from linear, sync roadmap, export to notion, import from linear, sync to github.
argument-hint: "[push|pull] [--tracker linear|notion|github] [--plan slug] [--bg] [--silent]"
disable-model-invocation: true
context: fork
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Import or export an em roadmap to/from Linear, Notion, or GitHub.

## Step 0: Parse Args

Extract direction: `push` or `pull`. If not provided, ask:

```
AskUserQuestion:
  question: "Which direction?"
  options:
    - label: "Pull — import from tracker to local"
    - label: "Push — export local roadmap to tracker"
```

Extract flags:
```
TRACKER_OVERRIDE = value after --tracker (linear|notion|github)
PLAN_SLUG        = value after --plan
BG_MODE          = true if --bg present
SILENT           = true if --silent present
```

If `PLAN_SLUG` not provided, default to most recently modified plan under `.codevoyant/em/plans/`.

Set `PLAN_DIR=".codevoyant/em/plans/{PLAN_SLUG}"`.

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

If `TRACKER_OVERRIDE` was provided, use it instead of the config value for this run. If tracker is "none", report error: "No tracker configured. Run with --tracker to specify one."

## Pull: Tracker to Local

### Step 1: Fetch Work Items

Fetch from the tracker using the appropriate MCP tool or CLI:

**Linear**:
- `mcp__claude_ai_Linear__list_projects` to get projects/epics
- `mcp__claude_ai_Linear__list_issues` filtered by cycle/project
- If epic-based: fetch parent issues and their children
- If project-based: fetch project milestones and their issues

**Notion**:
- `mcp__claude_ai_Notion__notion-search` for pages matching roadmap/planning criteria
- Follow up with page reads for each matched result

**GitHub**:
- `gh milestone list --json title,description,dueOn`
- `gh issue list --milestone {name} --json number,title,body,labels,assignees,state`

### Step 2: Map to Roadmap Format

Adapter logic per work-style:
- **Epic-based**: epics -> phases, child issues -> tasks within phases
- **Project-based**: projects/milestones -> phases, issues -> tasks
- **Milestone-based**: milestones -> phases, issues in milestone -> tasks

### Step 3: Write Imported Roadmap

Write `{PLAN_DIR}/roadmap.md` (or `{PLAN_DIR}/roadmap-imported.md` if `roadmap.md` already exists).

Show a summary: N epics/projects, M tasks, date range if available.

## Push: Local to Tracker

### Step 1: Read Local Roadmap

Read `{PLAN_DIR}/roadmap.md`. Parse phases and tasks. Count totals.

### Step 2: Confirm Push

```
AskUserQuestion:
  question: "Push {N} phases and {M} tasks to {tracker}?"
  options:
    - label: "Yes — create new items"
    - label: "Yes — update existing items"
      description: "Match by title and update"
    - label: "Dry run — show what would change"
    - label: "Cancel"
```

If "Dry run", display the list of items that would be created/updated and return to this question.

If "Cancel", exit.

### Step 3: Push to Tracker

Push using the tracker's write API:

**Linear**:
- `mcp__claude_ai_Linear__save_issue` for epics and tasks
- `mcp__claude_ai_Linear__save_milestone` for phases if project-based

**Notion**:
- `mcp__claude_ai_Notion__notion-create-pages` for each phase/task

**GitHub**:
- `gh milestone create --title {phase-name}` for each phase
- `gh issue create --title {task-name} --milestone {phase-name} --body {description}` for each task

Report: list of created/updated items with links where available.

## Step 4: Notification

If `BG_MODE=true`, send a desktop notification:

```
for _c in "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/em/scripts/notify.sh" "$HOME/.claude/plugins/em/scripts/notify.sh"; do [ -f "$_c" ] && bash "$_c" "em:sync complete" "{direction} {N} items {to|from} {tracker}" && break; done
```
