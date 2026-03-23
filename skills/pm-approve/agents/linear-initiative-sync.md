# linear-initiative-sync

**Model:** claude-sonnet-4-6
**Background:** false
**Purpose:** Reference documentation for the Linear initiative sync pattern used inline in pm:approve Step 5. Not spawned as an agent — kept here for pattern documentation only.

## Pattern: Browser-First Document Creation

Linear's `create_document` MCP tool requires a `project` or `issue` — it does NOT accept `initiativeId`. To attach documents to an initiative, use this browser-first pattern:

### Step 1: Navigate to initiative overview

```
mcp__claude-in-chrome__javascript_tool:
  text: "window.location.href = '{INITIATIVE_URL}/overview'"
```

### Step 2: Open the "Add document" dropdown

Use `find` tool to locate the button by text rather than coordinates (position shifts as docs are added):

```
mcp__claude-in-chrome__find:
  query: "Add document or link"
```

Click the returned ref. Then find and click "Create new document…".

### Step 3: Wait for blank doc tab

After clicking "Create new document…", the tab URL changes to:
`/document/untitled-{slug}`

Extract the slug from the URL. This blank doc is already linked to the initiative.

> **Critical:** Do NOT navigate away before calling `update_document`. Linear garbage-collects untitled empty docs on navigation.

### Step 4: Update immediately via MCP

Before uploading, strip local markdown links from the content — they don't resolve in Linear:
- Replace `[text](./path)`, `[text](../path)`, `[text](relative/path)` → `text` (keep label, drop URL)
- Absolute `https://` links are safe to keep as-is

```
mcp__claude_ai_Linear__update_document:
  id: "{slug}"
  title: "{humanised title}"
  content: "{file content with local links stripped}"
```

### Step 5: JS-navigate back

```
mcp__claude-in-chrome__javascript_tool:
  text: "window.location.href = '{INITIATIVE_URL}/overview'"
```

Using `window.location.href` (not the navigate tool's click-through) bypasses the "Leave site?" browser dialog that Linear shows for unsaved changes.

### Step 6: Repeat for next artifact

---

## Gotchas

- **Blank doc garbage collection**: Linear deletes blank untitled docs when navigating away. Always call `update_document` before any navigation.
- **"Leave site?" dialog**: Linear shows a browser dialog on navigation if there are unsaved changes. Use `window.location.href` via `javascript_tool` to bypass it.
- **Button coordinates are unreliable**: The "+" / "Add document" button is only visible on hover and shifts position as the resource list grows. Always click by ref ID from `find` or `read_page`, never by coordinate.
- **Tab URL confirmation**: After clicking "Create new document…", wait for the tab URL to contain `/document/untitled-`. If it doesn't change within a few seconds, retry the click once before declaring failure.
- **Local markdown links**: Strip relative links (`./path`, `../path`, `relative/path`) from document content before uploading — they show as broken paths in Linear. Keep the link label text; only remove the `(url)` portion.

## What This Agent Must NEVER Do

- Call `save_project` — creating Linear projects is em:approve's responsibility
- Call `create_document` with `initiativeId` — this parameter is not supported by the MCP tool
