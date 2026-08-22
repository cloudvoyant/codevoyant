# publish

Publish whatever is pending on a PR/MR, in one step — what gets published depends on what is being done:

1. A **pending draft review** (the inline comments from `pr review` / `pr address`) → submitted with a non-empty markdown body.
2. A **local review doc** (`.codevoyant/review/{slug}/new-review.md`) with no pending review yet → pushed to the platform as a pending review, then submitted.
3. The **PR/MR itself**, if it is still a draft → marked ready for review.

Runs whichever apply. Scope it with `--review-only` (submit the review but leave the PR/MR a draft) or `--ready-only` (mark ready but leave the review as a draft).

## Arguments

- `PR_ID` (optional positional) — defaults to the PR/MR for the current branch
- `--github` / `--gitlab` — override provider detection
- `--event <APPROVE|REQUEST_CHANGES|COMMENT>` — event for the review submission (default: `COMMENT`)
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

Resolve `PR_NUMBER`, `PR_TITLE`, `PR_URL`, and `BRANCH = git rev-parse --abbrev-ref HEAD` (the branch whose PR/MR this is, and the branch a `--push` would push):

- **Draft state** — is the PR/MR itself a draft?
  - GitHub: `gh pr view {PR_ID or branch} --json number,title,url,isDraft`
  - GitLab: `glab mr view {PR_ID or branch}` — draft if the title is `Draft:`/`WIP:`-prefixed.
- **Pending review** — is there a draft review to submit?
  - GitHub: `gh api "repos/:owner/:repo/pulls/{PR_NUMBER}/reviews" --jq '[.[] | select(.state=="PENDING")] | length'` → `PENDING_COUNT`.
  - GitLab: pending draft notes — `glab api "projects/:id/merge_requests/${PR_NUMBER}/draft_notes" --jq 'length'` → `PENDING_COUNT`.
- **Unpublished local review/address doc** — a `.codevoyant/review/*/new-review.md` (from `pr review --local`) or `.codevoyant/review/*/address.md` (from `pr address --local`) that matches this PR/MR (match by number, else by branch) and has not been pushed yet. Present only when `PENDING_COUNT == 0`.

If no open PR/MR is found: `✗ No open PR/MR found for this branch. Open one with /pr open.` and exit.

Compute what will happen (respecting `--ready-only` / `--review-only`):
- `WILL_SUBMIT_REVIEW` = (PENDING_COUNT > 0) AND not `--ready-only`
- `WILL_PUSH_LOCAL_REVIEW` = (PENDING_COUNT == 0 AND a matching local review/address doc exists) AND not `--ready-only`
- `WILL_MARK_READY` = PR/MR is a draft AND not `--review-only`

If none of the three is true: `✓ Nothing to publish — PR/MR #{PR_NUMBER} is already ready and has no pending review or unpublished review doc.` and exit.

## Step 2.5: Resolve the review body

Before any review submission, resolve a **non-empty markdown** `REVIEW_BODY`:

1. If a matching local review doc exists, read its `## Summary` section and use that paragraph (trimmed) as the top-level review comment, formatted as markdown.
2. Else if a pending review already carries a body, reuse it (GitHub: `gh api "repos/:owner/:repo/pulls/{PR_NUMBER}/reviews/{review_id}" --jq '.body'`).
3. Else derive a one-line summary that matches the event: `Submitted via /pr publish.` (COMMENT), `Approved via /pr publish.` (APPROVE), or `Requesting changes via /pr publish.` (REQUEST_CHANGES).

Never submit a review with an empty body — GitHub rejects it (`Review cannot be submitted with empty body and comments`), and an empty top-level comment renders as nothing.

## Step 3: Push an unpublished local review doc

If `WILL_PUSH_LOCAL_REVIEW`:
- Locate the newest matching doc (`new-review.md`, else `address.md`) under `.codevoyant/review/*/`.
- GitHub: `/gh push-comments {PR_NUMBER} --doc {REVIEW_DIR}/new-review.md` then `/gh draft {PR_NUMBER} --body "{REVIEW_BODY}"` — this creates the PENDING review with the summary as its body.
- GitLab: `/glab push-comments {PR_NUMBER} --doc {REVIEW_DIR}/new-review.md` — this creates the pending draft notes.
- Re-check `PENDING_COUNT` after pushing; if it is now > 0, set `WILL_SUBMIT_REVIEW=true`.

## Step 4: Pre-flight checks (only relevant when marking ready)

1. **Unpushed commits.** If the local branch is ahead of upstream (`git rev-list --count @{upstream}..HEAD`): if `--push`, run `git push` and set `PUSHED=true`; else warn `⚠ {N} local commit(s) not pushed — the reviewer won't see them. Re-run with --push, or push first.` and continue.
2. **CI status (informational).** Best-effort; warn, don't block:
   - GitHub: `gh pr checks {PR_NUMBER}`; GitLab: `glab ci status`.
   - If not green: note `⚠ CI is {failing|pending} — publishing anyway.`

## Step 5: Confirm

Unless `--yes`, use **AskUserQuestion**. Build the action line from what applies:

```
question: "Publish PR/MR #{PR_NUMBER} '{PR_TITLE}'? This will {submit the pending review as {EVENT}}{ and }{mark it ready for review}."
header: "Publish"
options:
  - label: "Publish"
    description: "{concise summary of the actions}{; CI is {status} if not passing}"
  - label: "Cancel"
    description: "Leave everything as-is"
```

Cancel → exit without changes.

## Step 6: Execute

Do these in order (each only if its flag computed true in Steps 2–3):

1. **Submit the pending review** (`WILL_SUBMIT_REVIEW`):
   - GitHub: re-confirm a PENDING review still exists (`gh api "repos/:owner/:repo/pulls/{PR_NUMBER}/reviews" --jq '[.[] | select(.state=="PENDING")] | length'`); if none, note `⚠ No pending draft review found — run /gh push-comments first` and skip this sub-step. Otherwise call `/gh complete {PR_NUMBER} --event {EVENT} --body "{REVIEW_BODY}"` — never with an empty body.
   - GitLab: publish the pending draft notes — `glab api "projects/:id/merge_requests/${PR_NUMBER}/draft_notes/bulk_publish" --method POST` — then post the summary note — `glab mr note {PR_NUMBER} --message "{REVIEW_BODY}"` — and, if `EVENT == APPROVE`, `glab mr approve {PR_NUMBER}`.
2. **Mark the PR/MR ready** (`WILL_MARK_READY`):
   - GitHub: `gh pr ready {PR_NUMBER}`
   - GitLab: `glab mr update {PR_NUMBER} --ready`

If any step fails (auth, permissions, API): report `✗ Publish failed at {step}: {error}.`, state what did succeed, and exit.

## Step 6.5: Watch CI after the push (best-effort)

Only when `--push` actually pushed commits (Step 4.1 set `PUSHED=true`). This closes the residual gap where a workflow commits+pushes without a CI-watch — e.g. commits made directly by a flow step outside `/git commit`, which would otherwise never be watched. Reuse the platform `ci` workflow — do NOT reimplement CI polling. Skip silently (leave `CI_STATUS` unset) if nothing was pushed (`PUSHED != true`), if there is no remote, if the repo has no CI configured, or if the needed CLI (`gh` for GitHub, `glab` for GitLab) is not installed.

Watch the CI run the push kicked off on the PR/MR branch `{BRANCH}`:

- **GitHub:** `/gh ci --branch {BRANCH}` (no `--autofix` — `publish` only watches and notifies).
- **GitLab:** `/glab ci --branch {BRANCH}`.

Capture the outcome into `CI_STATUS`:

- Watch completes green → `CI_STATUS = "green"`.
- Watch reports failure → `CI_STATUS = "failing"` and record the failing check names and the logs pointer (the failing-run URL, or the `gh run view --log-failed` / `glab ci trace` hint the `ci` workflow surfaces).
- No recent run found for `{BRANCH}`, or the check was skipped → leave `CI_STATUS` unset (treated as "not watched").

## Step 7: Report

```
✓ Published PR/MR #{PR_NUMBER}
  {— review submitted as {EVENT} (if done)}
  {— marked ready for review (if done)}
  {PR_URL}
```

If CI was not passing, remind: `Heads-up: CI is {failing|pending} — worth getting green before reviewers dig in.`

If the post-push watch ran: add `✓ CI is green on {BRANCH} after the push` when `CI_STATUS == "green"`; when `CI_STATUS == "failing"`, NOTIFY prominently — `⚠ CI is FAILING on {BRANCH} after the push — fix before reviewers dig in.` If `CI_STATUS` is unset (not watched), say nothing.
