# publish

Publish what's in draft on a PR/MR — in one step:

1. Any **pending draft review** (the inline comments from `pr review` / `pr address`) → submitted.
2. The **PR/MR itself**, if it's still a draft → marked ready for review.

Runs whichever applies. (For review-only publishing, `pr complete` still exists; `publish` is the umbrella.)

## Arguments

- `PR_ID` (optional positional) — defaults to the PR/MR for the current branch
- `--github` / `--gitlab` — override provider detection
- `--event <APPROVE|REQUEST_CHANGES|COMMENT>` — event for the draft review, if one exists (default: `COMMENT`)
- `--yes` / `-y` — skip the confirmation prompt
- `--push` — push unpushed local commits before publishing
- `--ready-only` — only mark the PR/MR ready; leave any pending review as a draft
- `--review-only` — only publish the pending review; leave the PR/MR as a draft

## Step 0: Parse Args

```bash
PR_ID=""; PROVIDER=""; EVENT="COMMENT"
ASSUME_YES=false; DO_PUSH=false; READY_ONLY=false; REVIEW_ONLY=false

while [ $# -gt 0 ]; do
  case "$1" in
    --github) PROVIDER="github"; shift ;;
    --gitlab) PROVIDER="gitlab"; shift ;;
    --event)  EVENT="$2"; shift 2 ;;
    --yes|-y) ASSUME_YES=true; shift ;;
    --push)   DO_PUSH=true; shift ;;
    --ready-only)  READY_ONLY=true; shift ;;
    --review-only) REVIEW_ONLY=true; shift ;;
    *)        [ -z "$PR_ID" ] && PR_ID="$1"; shift ;;
  esac
done
```

## Step 1: Detect Provider

Same as `open.md` Step 1. Exit with `--github`/`--gitlab` guidance if undetectable.

## Step 2: Resolve PR/MR and current state

Resolve `PR_NUMBER`, `PR_TITLE`, `PR_URL`, and:

- **Draft state** — is the PR/MR itself a draft?
  - GitHub: `gh pr view {PR_ID or branch} --json number,title,url,isDraft`
  - GitLab: `glab mr view {PR_ID or branch}` — draft if the title is `Draft:`/`WIP:`-prefixed.
- **Pending review** — is there a draft review to submit?
  - GitHub: `gh api "repos/:owner/:repo/pulls/{PR_NUMBER}/reviews" --jq '[.[] | select(.state=="PENDING")] | length'` → `PENDING_COUNT`.
  - GitLab: no PENDING concept; treat as none.

If no open PR/MR is found: `✗ No open PR/MR found for this branch. Open one with /pr open.` and exit.

Compute what will happen (respecting `--ready-only` / `--review-only`):
- `WILL_PUBLISH_REVIEW` = review exists AND not `--ready-only`
- `WILL_MARK_READY` = PR/MR is a draft AND not `--review-only`

If neither is true: `✓ Nothing to publish — PR/MR #{PR_NUMBER} is already ready and has no pending review.` and exit.

## Step 3: Pre-flight checks (only relevant when marking ready)

1. **Unpushed commits.** If the local branch is ahead of upstream (`git rev-list --count @{upstream}..HEAD`): if `--push`, run `git push`; else warn `⚠ {N} local commit(s) not pushed — the reviewer won't see them. Re-run with --push, or push first.` and continue.
2. **CI status (informational).** Best-effort; warn, don't block:
   - GitHub: `gh pr checks {PR_NUMBER}`; GitLab: `glab ci status`.
   - If not green: note `⚠ CI is {failing|pending} — publishing anyway.`

## Step 4: Confirm

Unless `--yes`, use **AskUserQuestion**. Build the action line from what applies:

```
question: "Publish PR/MR #{PR_NUMBER} '{PR_TITLE}'? This will {publish the pending review as {EVENT}}{ and }{mark it ready for review}."
header: "Publish"
options:
  - label: "Publish"
    description: "{concise summary of the actions}{; CI is {status} if not passing}"
  - label: "Cancel"
    description: "Leave everything as-is"
```

Cancel → exit without changes.

## Step 5: Execute

Do these in order (each only if its flag computed true in Step 2):

1. **Publish the pending review** (`WILL_PUBLISH_REVIEW`): run the `complete` workflow — read and execute `references/workflows/complete.md` with `{PR_NUMBER} --event {EVENT}` — or directly:
   - GitHub: `/gh complete {PR_NUMBER} --event {EVENT}`
   - GitLab: `/glab complete {PR_NUMBER}` (`--approve` if `EVENT == APPROVE`)
2. **Mark the PR/MR ready** (`WILL_MARK_READY`):
   - GitHub: `gh pr ready {PR_NUMBER}`
   - GitLab: `glab mr update {PR_NUMBER} --ready`

If any step fails (auth, permissions, API): report `✗ Publish failed at {step}: {error}.`, state what did succeed, and exit.

## Step 6: Report

```
✓ Published PR/MR #{PR_NUMBER}
  {— review submitted as {EVENT} (if done)}
  {— marked ready for review (if done)}
  {PR_URL}
```

If CI was not passing, remind: `Heads-up: CI is {failing|pending} — worth getting green before reviewers dig in.`
