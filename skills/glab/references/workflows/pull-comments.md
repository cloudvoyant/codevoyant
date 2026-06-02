# pull-comments

Fetch unresolved MR discussion threads from GitLab and write them to a Markdown doc for review.

## Arguments

- `MR_IID` (optional positional) — defaults to MR for current branch
- `--output <path>` — output path (default: `.codevoyant/review/{branch}/comments.md`)

## Step 1: Verify `glab` CLI

```bash
command -v glab >/dev/null 2>&1 || { echo "glab not installed. Run: brew install glab"; exit 1; }
glab auth status >/dev/null 2>&1 || { echo "glab not authenticated. Run: glab auth login"; exit 1; }
```

## Step 2: Resolve MR IID

If `MR_IID` was provided, use it. Otherwise detect from the current branch:

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
MR_IID=$(glab mr list --source-branch "$BRANCH" --state opened --output json | jq -r '.[0].iid')

if [ -z "$MR_IID" ] || [ "$MR_IID" = "null" ]; then
  echo "No open MR found for branch '$BRANCH'."
  exit 1
fi
```

## Step 3: Fetch Discussions

```bash
glab api "projects/:id/merge_requests/${MR_IID}/discussions"
```

Filter for unresolved threads: any discussion where `resolved == false` for at least one note (or top-level `resolved == false`). Skip system notes (`system == true`) and non-diff notes that have no `position`.

## Step 4: Write Output Doc

Default output path: `.codevoyant/review/{branch}/comments.md`. Create parent dirs if missing.

Write using the same structure as `gh pull-comments`:

```markdown
# MR !{iid} — {title}
URL: {url}
Pulled: {timestamp}

## Unresolved Threads ({count})

### Thread {discussion-id} — {new_path}:{new_line}
**Reviewer:** {author}
**Comment:** {body}
**Diff context:**
```
{diff-hunk}
```
---
```

## Step 5: Report

```
✓ {count} unresolved threads written to {output-path}
```

## Error Handling

- **No open MR for branch:** caught in Step 2
- **Zero unresolved threads:** still write the doc, report `✓ 0 unresolved threads — nothing to address`
