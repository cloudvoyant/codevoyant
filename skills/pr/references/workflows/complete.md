# complete

Publish a pending draft review on a PR/MR. Delegates to `/gh complete` or `/glab complete`.

## Arguments

- `PR_ID` (optional positional) — defaults to PR/MR for current branch
- `--github` / `--gitlab` — override provider detection
- `--event <APPROVE|REQUEST_CHANGES|COMMENT>` — submit event (default: `COMMENT`)

## Step 0: Parse Args

```bash
PR_ID=""
PROVIDER=""
EVENT="COMMENT"

while [ $# -gt 0 ]; do
  case "$1" in
    --github) PROVIDER="github"; shift ;;
    --gitlab) PROVIDER="gitlab"; shift ;;
    --event)  EVENT="$2"; shift 2 ;;
    *)        [ -z "$PR_ID" ] && PR_ID="$1"; shift ;;
  esac
done
```

## Step 1: Detect Provider

Same as `new.md` Step 1. Exit with `--github`/`--gitlab` guidance if undetectable.

## Step 2: Resolve PR/MR

Same as `new.md` Step 2. Exit with message if no open PR/MR found.

## Step 3: Validate Pending Draft Exists

- **GitHub:**
  ```bash
  PENDING_COUNT=$(gh api "repos/:owner/:repo/pulls/${PR_NUMBER}/reviews" \
    --jq '[.[] | select(.state=="PENDING")] | length')
  ```
  If `PENDING_COUNT == 0`:
  ```
  ⚠ No pending draft review found for PR #{PR_NUMBER}. Run /gh push-comments first.
  ```
  and exit.

- **GitLab:** No PENDING concept exists — proceed to Step 4.

## Step 4: Delegate

- **GitHub:** call `/gh complete {PR_NUMBER} --event {EVENT}`
- **GitLab:** call `/glab complete {PR_NUMBER}` and add `--approve` if `EVENT == APPROVE`

## Step 5: Handle Delegation Errors

If the platform skill reports an error (review missing, auth failure, API rejection):

```
✗ Publish failed: {error}. Check /gh help or /glab help for troubleshooting.
```

and exit.

## Step 6: Report

```
✓ Review published as {EVENT} on {provider} PR/MR #{PR_NUMBER}
  {url}
```
