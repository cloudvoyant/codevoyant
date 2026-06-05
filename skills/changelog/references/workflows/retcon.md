# retcon

Propose (and optionally apply) conventional commit message edits for all commits on the current branch relative to its PR/MR base. Rewrites commit messages only — never tree content.

## Step 0: Safety checks

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
CLEAN=$(git status --porcelain)
```

Refuse and exit with a clear error if any of these are true:
- `$BRANCH` matches: `main`, `master`, `develop`, `*-stable`, `release/*`
- `$CLEAN` is non-empty (when `APPLY_MODE=true` only)

## Step 1: Detect platform and PR/MR

Auto-detect platform if `$PLATFORM` not set:
```bash
git remote get-url origin 2>/dev/null
```
If URL contains `github.com` → `PLATFORM=github`. If `gitlab.com` or self-hosted GitLab → `PLATFORM=gitlab`.

Get PR/MR ID:
```bash
# GitHub
gh pr list --head "$BRANCH" --json number,baseRefName --jq '.[0] | "\(.number) \(.baseRefName)"'

# GitLab
glab mr list --source-branch "$BRANCH" --json iid,targetBranch --output json | jq -r '.[0] | "\(.iid) \(.targetBranch)"'
```

Store as `PR_ID` and `BASE_BRANCH`. If no open PR/MR found, exit: "No open PR/MR found for branch {branch}. Open one first."

## Step 2: Get commits on this branch

```bash
MERGE_BASE=$(git merge-base HEAD "origin/$BASE_BRANCH")
git log "$MERGE_BASE"..HEAD --format="%H|||%s|||%b" --no-merges
```

Parse each line into: `HASH`, `SUBJECT`, `BODY`.

Parse `SUBJECT` with conventional commit regex:
```
^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\([^)]+\))?(!)?: .+
```

If match: extract `TYPE`, `SCOPE`, `BREAKING`, `SUBJECT_TEXT`.
If no match: flag as `NON_CONVENTIONAL`.

## Step 3: Propose edits

For each commit, generate a `PROPOSED` message:
- Normalize type to lowercase
- Trim trailing whitespace and periods from subject
- If `NON_CONVENTIONAL`: propose a best-guess conventional type based on subject keywords
  - Contains "fix", "bug", "broken", "error" → `fix:`
  - Contains "add", "new", "create", "implement" → `feat:`
  - Contains "update", "bump", "upgrade" → `chore:`
  - Contains "doc", "readme", "comment" → `docs:`
  - Otherwise: `chore:` with original subject
- Keep body unchanged

## Step 4: Write retcon.md

```bash
RETCON_DIR=".codevoyant/changelog/$BRANCH/$PR_ID"
mkdir -p "$RETCON_DIR"
```

Write `$RETCON_DIR/retcon.md` with this structure:

```markdown
# Retcon: {branch} ({platform} #{PR_ID})

Base: {BASE_BRANCH}  
Commits: {N}  
Generated: {timestamp}

## Instructions

1. Review and edit the **Proposed** column below
2. Leave **Hash** unchanged
3. Run `/changelog retcon --apply` when ready
4. Or `/changelog retcon --apply --platform github` if auto-detection fails

⚠️  `--apply` rewrites git history and force-pushes. Only run on feature branches.

## Commits

| Hash | Current | Proposed |
|------|---------|----------|
| {hash7} | {current subject} | {proposed subject} |
| ... | ... | ... |

## Bodies (only commits with non-empty bodies shown)

### {hash7}
```
{current body}
```
**Proposed body:**
```
{proposed body — edit this}
```
```

Report: `✓ Retcon proposal written to {RETCON_DIR}/retcon.md — edit it, then run /changelog retcon --apply`

## Step 5: Apply (only if `APPLY_MODE=true`)

Read `$RETCON_DIR/retcon.md` and extract the Commits table.

Build a message map: `{hash} → {proposed message}`.

Create a temporary script for the sequence editor:
```bash
TMPSCRIPT=$(mktemp)
cat > "$TMPSCRIPT" << 'SCRIPT'
#!/bin/bash
# Mark all commits as 'reword'
sed -i '' 's/^pick /reword /' "$1"
SCRIPT
chmod +x "$TMPSCRIPT"
```

Create a message substitution editor:
```bash
MSG_SCRIPT=$(mktemp)
cat > "$MSG_SCRIPT" << SCRIPT
#!/bin/bash
# Read current message, find hash in map, write proposed message
CURRENT=$(cat "\$1")
# ... lookup hash in message map and substitute
SCRIPT
chmod +x "$MSG_SCRIPT"
```

Run the rebase:
```bash
GIT_SEQUENCE_EDITOR="$TMPSCRIPT" GIT_EDITOR="$MSG_SCRIPT" \
  git rebase -i "$MERGE_BASE"
```

On success: push with `git push --force-with-lease`.

Report what changed (list of `{old subject} → {new subject}` for each modified commit) and the new HEAD SHA.

Clean up temp scripts with `rm -f "$TMPSCRIPT" "$MSG_SCRIPT"`.

If rebase fails: run `git rebase --abort`, report the error, and preserve the retcon.md file.
