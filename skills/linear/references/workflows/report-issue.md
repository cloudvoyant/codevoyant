# Workflow: report-issue

Create a Linear issue from a bug report.

## Step 0: Parse arguments

```
TEAM_KEY      --team KEY      (required if no --project; e.g. "ENG")
PROJECT_ID    --project ID    (optional; links issue to a project)
TITLE         --title "..."   (or from --from report file)
PRIORITY      --priority 1|2|3|4  (1=urgent, 2=high, 3=medium, 4=low; default 3)
FROM_FILE     --from <path>   (optional; read fields from debug/smoke report)
```

## Step 1: Resolve team

If `--team` not given, list teams and ask:
```
mcp__claude_ai_Linear__list_teams → present team names → user selects
```

If `--from` given, read the report file and extract: title, environment, steps, expected, actual, severity → map severity to priority (Critical→1, High→2, Medium→3, Low→4).

## Step 2: Render issue body

Use `references/templates/bug-report.md`. Substitute all fields from arguments or parsed report.

## Step 3: Create issue

```
mcp__claude_ai_Linear__save_issue({
  title: TITLE,
  description: BODY,  // rendered markdown
  teamId: TEAM_ID,
  projectId: PROJECT_ID,  // optional
  priority: PRIORITY,
  labelIds: [bug-label-id]  // use mcp__claude_ai_Linear__list_issue_labels to find "Bug" label
})
```

## Step 4: Report

```
✓ Linear issue created: {issue identifier} — {title}
  URL: {issue URL}
```
