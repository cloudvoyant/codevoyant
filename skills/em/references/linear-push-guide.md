# Linear Push Guide

MCP call sequence for `em:plan` push step. Execute in order -- each step depends on IDs from previous.

## 1. Create Initiative (if initiative-scope)
Tool: `mcp__linear-server__save_initiative`
Fields: name, description (1 paragraph), teamIds

## 2. Create Project
Tool: `mcp__linear-server__save_project`
Fields: name, description (objective from plan.md), teamId, initiativeId (if set)
-> Store returned `PROJECT_ID`

## 3. Create Milestones
Tool: `mcp__linear-server__save_milestone` x 3
Fields: projectId=PROJECT_ID, name ("Design" | "Develop" | "Deploy"), sortOrder (0|1|2)
-> Store DESIGN_ID, DEVELOP_ID, DEPLOY_ID

## 4. Create Issues
Tool: `mcp__linear-server__save_issue` x N
Fields:
  - teamId
  - projectId = PROJECT_ID
  - projectMilestoneId = {DESIGN|DEVELOP|DEPLOY}_ID
  - title = task title
  - description = requirements + ACs from task-template (Markdown)

## 5. Record IDs
Write `.codevoyant/em/plans/{slug}/linear-ids.json`:
```json
{
  "projectId": "...",
  "initiativeId": "...",
  "milestones": { "design": "...", "develop": "...", "deploy": "..." },
  "issues": { "{task-title}": "{issue-id}", ... }
}
```

## Delegate Mode
Skip milestones. Create 3 stub issues directly on the project:
- "PM: {project} -- define requirements" (no milestoneId)
- "UX: {project} -- design exploration" (no milestoneId)
- "DEV: {project} -- architecture spike" (no milestoneId)

## Doc Attachment (for PM docs)
Tool: `mcp__linear-server__create_attachment`
Fields: issueId OR use project/initiative ID, title, url (file path or hosted URL)
Note: Linear attachments support URLs; local file paths may need a hosted URL.
Alternative: `mcp__linear-server__create_document` to create a Linear doc with content.
