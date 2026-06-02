# resolve-comments

Mark PR review threads as resolved. GitHub exposes thread resolution only via GraphQL, so we use `gh api graphql`.

## Arguments

- `PR_NUMBER` (optional positional) — defaults to PR for current branch
- `--thread-ids <id,...>` — comma-separated thread node IDs (optional; resolves all unresolved if omitted)

## Step 1: Verify `gh` CLI

```bash
command -v gh >/dev/null 2>&1 || { echo "gh not installed. Run: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh not authenticated. Run: gh auth login"; exit 1; }
```

## Step 2: Resolve PR

Detect `PR_NUMBER` from branch if not given (see `pull-comments.md` Step 2).

## Step 3: Determine Target Thread IDs

If `--thread-ids` was given, use those node IDs directly.

Otherwise fetch all unresolved threads:

```bash
gh pr view "$PR_NUMBER" --json reviewThreads --jq '.reviewThreads[] | select(.isResolved == false) | .id'
```

## Step 4: Resolve Each Thread

For each thread node id:

```bash
gh api graphql -f query='
  mutation($id: ID!) {
    resolveReviewThread(input: {threadId: $id}) {
      thread { isResolved }
    }
  }' -f id="$THREAD_ID"
```

Track success/failure per thread.

## Step 5: Report

```
✓ {count} thread(s) resolved.
```

If any failed: list the failed thread IDs with reason.

## Error Handling

- **Insufficient permissions:** GitHub requires write access to resolve threads — surface the API error
- **Invalid thread id:** report and continue with remaining threads
