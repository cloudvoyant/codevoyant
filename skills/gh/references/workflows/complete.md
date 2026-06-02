# complete

Publish a pending draft PR review (the inverse of `draft`/`push-comments`).

## Arguments

- `PR_NUMBER` (optional positional) — defaults to PR for current branch
- `--review-id <id>` — pending review id (optional; auto-detected if omitted)
- `--event <APPROVE|REQUEST_CHANGES|COMMENT>` — submit event (default: `COMMENT`)
- `--body <text>` — overall review summary (optional)

## Step 1: Verify `gh` CLI

```bash
command -v gh >/dev/null 2>&1 || { echo "gh not installed. Run: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh not authenticated. Run: gh auth login"; exit 1; }
```

## Step 2: Resolve PR & Repo

Detect `PR_NUMBER` from branch if not given (see `pull-comments.md` Step 2). Then:

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
OWNER="${REPO%/*}"
NAME="${REPO#*/}"
```

## Step 3: Find Pending Review

If `--review-id` was not given:

```bash
REVIEW_ID=$(gh api "repos/${OWNER}/${NAME}/pulls/${PR_NUMBER}/reviews" \
  --jq '.[] | select(.state=="PENDING") | .id' | head -n 1)
```

If no pending review found: report and exit.

## Step 4: Submit Review

```bash
gh api "repos/${OWNER}/${NAME}/pulls/${PR_NUMBER}/reviews/${REVIEW_ID}/events" \
  --method POST \
  --field event="${EVENT}" \
  --field body="${BODY}"
```

## Step 5: Report

```
✓ Review submitted as {event}. {pr-url}
```

Use `gh pr view ${PR_NUMBER} --json url --jq .url` for the URL.

## Error Handling

- **No pending review:** report `No pending review on PR #{n}. Create one with /gh draft or /gh push-comments.`
- **Invalid event value:** validate against the allowed set before calling the API
