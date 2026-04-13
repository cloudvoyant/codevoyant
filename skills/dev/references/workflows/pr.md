# pr

Create a pull request (GitHub) or merge request (GitLab) from the current branch.

## Arguments

- `[base-branch]` (optional positional): Target branch for the PR/MR. Defaults to `main`.
- `--github` / `--gitlab`: Override auto-detected provider.
- `--draft`: Create as a draft PR/MR.
- `--yes` / `-y`: Skip confirmation prompt and create immediately.

## Step 0: Parse Arguments

```bash
BASE_BRANCH="main"
PROVIDER=""   # auto-detect
DRAFT=false
YES=false

# First non-flag arg → BASE_BRANCH
[[ "$*" =~ --github ]]  && PROVIDER="github"
[[ "$*" =~ --gitlab ]]  && PROVIDER="gitlab"
[[ "$*" =~ --draft ]]   && DRAFT=true
[[ "$*" =~ --yes|-y ]]  && YES=true

# Extract positional base-branch if present (first arg that doesn't start with --)
```

## Step 1: Check Git State

```bash
git status --short
git rev-parse --abbrev-ref HEAD  # CURRENT_BRANCH
```

If there are **uncommitted or unstaged changes**, stop and inform the user:

```
✗ You have uncommitted changes. Commit or stash them first:
  /git commit        — commit changes and push
  git stash          — stash and come back
```

Do not proceed until the working tree is clean.

## Step 2: Detect Provider

If `PROVIDER` is already set via flag, skip this step.

```bash
git remote get-url origin  # → REMOTE_URL
```

- URL contains `github.com` → `PROVIDER=github`
- URL contains `gitlab.com` or `gitlab.` → `PROVIDER=gitlab`
- Neither matches → report and stop:

```
✗ Could not detect provider from remote URL: {REMOTE_URL}
  Use --github or --gitlab to specify manually.
```

## Step 3: Ensure Branch is Pushed

```bash
git status -sb  # check tracking branch
```

If the branch has no upstream or is ahead of origin:

```bash
git push origin {CURRENT_BRANCH}
```

If push fails (e.g. protected branch, auth error): report the error and stop.

Report: `✓ Branch pushed.`

## Step 4: Check for Existing PR/MR

**GitHub:**
```bash
gh pr list --head {CURRENT_BRANCH} --base {BASE_BRANCH} --state open --json number,url
```

**GitLab:**
```bash
glab mr list --source-branch {CURRENT_BRANCH} --target-branch {BASE_BRANCH} --state opened --output json
```

If one already exists, report its URL and stop:

```
✗ A PR/MR already exists for this branch:
  {url}
```

## Step 5: Gather Context

Collect commits between base and current branch:

```bash
git log {BASE_BRANCH}..HEAD --oneline --no-decorate
git diff {BASE_BRANCH}...HEAD --stat
```

Also read the repository description or README title if available:

```bash
head -3 README.md 2>/dev/null || true
```

Use this context to draft a title and body. Do NOT make anything up — derive everything from the actual commits and diff.

**Title:** One-line summary in imperative mood, ≤72 characters. Derive from the most significant commit or the overall theme if there are multiple commits.

**Body:** Follow this structure:

```markdown
## Summary
- {bullet per logical change, terse}

## Test plan
- [ ] {verifiable check the reviewer should do}
- [ ] {another check}
```

Keep body concise — 3–8 bullets total across both sections. Omit the test plan section if there's nothing meaningful to verify.

## Step 6: Review with User

Output the proposed PR/MR:

```
Proposed PR/MR:

  Title:  {title}
  Base:   {BASE_BRANCH}
  Head:   {CURRENT_BRANCH}
  Draft:  {yes/no}

  Body:
  ─────────────────────────────────
  {body}
  ─────────────────────────────────
```

If `YES=false`, ask for confirmation using AskUserQuestion:

```yaml
questions:
  - question: 'Does this PR/MR look good?'
    header: 'Review PR/MR'
    multiSelect: false
    options:
      - label: 'Looks good — create'
        description: '{title}'
      - label: 'Cancel'
        description: "Don't create"
```

- If **"Looks good — create"**: proceed to Step 7.
- If **"Cancel"**: exit without creating.
- If **Other** (user provided custom title or notes): incorporate feedback and proceed.

If `YES=true`: skip prompt, report `✓ Auto-approved with --yes flag`.

## Step 7: Create PR/MR

**GitHub:**

```bash
gh pr create \
  --title "{title}" \
  --body "$(cat <<'EOF'
{body}
EOF
)" \
  --base {BASE_BRANCH} \
  --head {CURRENT_BRANCH} \
  {--draft if DRAFT=true}
```

**GitLab:**

```bash
glab mr create \
  --title "{title}" \
  --description "$(cat <<'EOF'
{body}
EOF
)" \
  --target-branch {BASE_BRANCH} \
  --source-branch {CURRENT_BRANCH} \
  {--draft if DRAFT=true} \
  --yes
```

Capture the output URL from the CLI.

## Step 8: Report

```
✓ PR/MR created

  {url}

  Title:  {title}
  Base:   {BASE_BRANCH} ← {CURRENT_BRANCH}
  Draft:  {yes/no}
```
