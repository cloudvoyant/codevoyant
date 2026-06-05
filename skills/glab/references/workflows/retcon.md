# glab retcon

Propose and apply conventional commit message edits for the current branch's open GitLab MR. Delegates to `changelog retcon --platform gitlab` after detecting the MR.

## Dependency Check

Verify `changelog` skill is available:
If `/changelog` is not in context: "Required skill not installed: changelog. Run: npx skills add codevoyant/codevoyant"

## Step 1: Detect current branch and open MR

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
MR_INFO=$(glab mr list --source-branch "$BRANCH" --output json 2>/dev/null | jq -r '.[0]')
```

If `MR_INFO` is empty or null: exit with "No open MR found for branch '{branch}' on GitLab. Open an MR first with: glab mr create"

Extract:
```bash
MR_IID=$(echo "$MR_INFO" | jq -r '.iid')
BASE_BRANCH=$(echo "$MR_INFO" | jq -r '.targetBranch')
MR_TITLE=$(echo "$MR_INFO" | jq -r '.title')
```

Report: `✓ Found MR !${MR_IID}: "${MR_TITLE}" (target: ${BASE_BRANCH})`

## Step 2: Delegate to changelog retcon

Execute `/changelog retcon` with:
- `PLATFORM=gitlab`
- `PR_ID=$MR_IID`
- `BASE_BRANCH=$BASE_BRANCH`
- `APPLY_MODE` — pass through from user's `glab retcon --apply`
