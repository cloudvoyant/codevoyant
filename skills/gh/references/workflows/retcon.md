# gh retcon

Propose and apply conventional commit message edits for the current branch's open GitHub PR. Delegates to `changelog retcon --platform github` after detecting the PR.

## Dependency Check

Verify `changelog` skill is available:
If `/changelog` is not in context: "Required skill not installed: changelog. Run: npx skills add codevoyant/codevoyant"

## Step 1: Detect current branch and open PR

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PR_INFO=$(gh pr list --head "$BRANCH" --json number,baseRefName,title --jq '.[0]' 2>/dev/null)
```

If `PR_INFO` is empty or null: exit with "No open PR found for branch '{branch}' on GitHub. Open a PR first with: gh pr create"

Extract:
```bash
PR_NUMBER=$(echo "$PR_INFO" | jq -r '.number')
BASE_BRANCH=$(echo "$PR_INFO" | jq -r '.baseRefName')
PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')
```

Report: `✓ Found PR #${PR_NUMBER}: "${PR_TITLE}" (base: ${BASE_BRANCH})`

## Step 2: Delegate to changelog retcon

Pass platform, PR number, and base branch to the changelog retcon workflow:

Execute `/changelog retcon` with:
- `PLATFORM=github`
- `PR_ID=$PR_NUMBER`
- `BASE_BRANCH=$BASE_BRANCH` (pre-computed, skip the gh pr lookup in retcon.md Step 1)
- `APPLY_MODE` — pass through from user's invocation of `gh retcon --apply`

The changelog retcon workflow takes over from here.
