# pull-comments

Fetch unresolved PR review threads from GitHub and write them to a Markdown doc for review.

## Arguments

- `PR_NUMBER` (optional positional) — defaults to PR for current branch
- `--output <path>` — output path (default: `.codevoyant/review/{branch}/comments.md`)

## Step 1: Verify `gh` CLI

```bash
command -v gh >/dev/null 2>&1 || { echo "gh not installed. Run: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh not authenticated. Run: gh auth login"; exit 1; }
```

## Step 2: Resolve PR Number

If `PR_NUMBER` was provided, use it. Otherwise detect from the current branch:

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PR_NUMBER=$(gh pr list --head "$BRANCH" --state open --json number,url --jq '.[0].number')

if [ -z "$PR_NUMBER" ] || [ "$PR_NUMBER" = "null" ]; then
  echo "No open PR found for branch '$BRANCH'."
  exit 1
fi
```

## Step 3: Fetch Review Threads

```bash
gh pr view "$PR_NUMBER" --json number,title,headRefName,baseRefName,url,reviewThreads,reviews
```

Filter for threads where `isResolved == false`.

## Step 4: Write Output Doc

Default output path: `.codevoyant/review/{branch}/comments.md`. Create parent dirs if missing.

Write using this structure:

```markdown
# PR #{number} — {title}
URL: {url}
Pulled: {timestamp}

## Unresolved Threads ({count})

### Thread {id} — {path}:{line}
**Reviewer:** {author}
**Comment:** {body}
**Diff context:**
```
{diffHunk}
```
---
```

## Step 5: Report

```
✓ {count} unresolved threads written to {output-path}
```

## Error Handling

- **No open PR for branch:** caught in Step 2
- **Zero unresolved threads:** still write the doc, report `✓ 0 unresolved threads — nothing to address`
