# complete

Publish a pending draft PR review (the inverse of `draft`/`push-comments`).

## Arguments

- `PR_NUMBER` (optional positional) — defaults to PR for current branch
- `--review-id <id>` — pending review id (optional; auto-detected if omitted)
- `--event <APPROVE|REQUEST_CHANGES|COMMENT>` — submit event (default: `COMMENT`)
- `--body <text>` — overall review summary, formatted markdown (optional; a non-empty default is derived when absent)

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

## Step 3.5: Resolve the review body

Never submit a review with an empty body — GitHub rejects it (`Review cannot be submitted with empty body and comments`). If `--body` is empty or absent, derive a non-empty markdown summary from the event:

```bash
if [ -z "$BODY" ]; then
  case "$EVENT" in
    APPROVE)         BODY="Approved." ;;
    REQUEST_CHANGES) BODY="Requesting changes." ;;
    *)               BODY="Review submitted." ;;
  esac
fi
```

If a pending review already carries a body and `--body` was not given, prefer reusing it as the top-level comment:

```bash
if [ -z "${BODY_OVERRIDE:-}" ]; then
  EXISTING_BODY=$(gh api "repos/${OWNER}/${NAME}/pulls/${PR_NUMBER}/reviews/${REVIEW_ID}" --jq '.body')
  [ -n "$EXISTING_BODY" ] && BODY="$EXISTING_BODY"
fi
```

(`BODY_OVERRIDE` is set to `true` by the caller when `--body` was explicitly provided.)

## Step 4: Submit Review

Build the args so `body` is only sent when non-empty, and pass it literally (markdown, `@`-free):

```bash
SUBMIT_ARGS=(--method POST --field "event=${EVENT}")
if [ -n "$BODY" ]; then
  SUBMIT_ARGS+=(--raw-field "body=${BODY}")
fi

gh api "repos/${OWNER}/${NAME}/pulls/${PR_NUMBER}/reviews/${REVIEW_ID}/events" "${SUBMIT_ARGS[@]}"
```

## Step 5: Report

```
✓ Review submitted as {event}. {pr-url}
```

Use `gh pr view ${PR_NUMBER} --json url --jq .url` for the URL.

## Error Handling

- **No pending review:** report `No pending review on PR #{n}. Create one with /gh draft or /gh push-comments.`
- **Invalid event value:** validate against the allowed set before calling the API
- **Still empty body (should not happen):** if `BODY` is empty after Step 3.5, abort with `✗ Cannot submit a review with an empty body.` rather than calling the API
