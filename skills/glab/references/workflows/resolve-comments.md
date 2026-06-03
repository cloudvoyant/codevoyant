# resolve-comments

Mark MR discussion threads as resolved.

## Arguments

- `MR_IID` (optional positional) — defaults to MR for current branch
- `--discussion-ids <id,...>` — comma-separated discussion IDs (optional; resolves all unresolved if omitted)

## Step 1: Verify `glab` CLI

```bash
command -v glab >/dev/null 2>&1 || { echo "glab not installed. Run: brew install glab"; exit 1; }
glab auth status >/dev/null 2>&1 || { echo "glab not authenticated. Run: glab auth login"; exit 1; }
```

## Step 2: Resolve MR

Detect `MR_IID` from branch if not given (see `pull-comments.md` Step 2).

## Step 3: Determine Target Discussion IDs

If `--discussion-ids` was given, use those.

Otherwise fetch all unresolved discussions:

```bash
glab api "projects/:id/merge_requests/${MR_IID}/discussions" \
  --jq '.[] | select(.notes[] | .resolvable == true and .resolved == false) | .id'
```

## Step 4: Resolve Each Discussion

For each id:

```bash
for DISCUSSION_ID in $DISCUSSION_IDS; do
  glab api "projects/:id/merge_requests/${MR_IID}/discussions/${DISCUSSION_ID}?resolved=true" \
    --method PUT
done
```

Track success/failure per discussion.

## Step 5: Report

```
✓ {count} discussion(s) resolved.
```

If any failed: list the failed IDs with reason.

## Error Handling

- **Non-resolvable discussion:** GitLab returns 400 — skip with a note
- **Insufficient permissions:** surface the API error
