# draft

Create or update a pending (draft) PR review. Pending reviews accumulate inline comments without publishing them — finalize with `/gh complete`.

## Arguments

- `PR_NUMBER` (optional positional) — defaults to PR for current branch
- `--body <text>` — overall review body (optional)
- `--review-id <id>` — update an existing pending review (optional)

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

## Step 3: Create or Update Pending Review

If `--review-id` was given, update the existing review body:

```bash
gh api "repos/${OWNER}/${NAME}/pulls/${PR_NUMBER}/reviews/${REVIEW_ID}" \
  --method PUT \
  --field body="${BODY}"
```

Otherwise, create a new pending review:

```bash
REVIEW_ID=$(gh api "repos/${OWNER}/${NAME}/pulls/${PR_NUMBER}/reviews" \
  --method POST \
  --field event=PENDING \
  --field body="${BODY}" \
  --jq '.id')
```

## Step 4: Report

```
✓ Draft review ready (id: {review-id}). Run /gh complete to publish.
```

## Error Handling

- **Review id not found:** report and exit
- **No PR for branch:** caught in Step 2
