# address

Pull unresolved review comments from a PR/MR, propose fixes for each, let the user adjust, apply approved fixes, and respond to each thread via a draft review.

## Arguments

- `PR_ID` (optional positional) — defaults to PR/MR for current branch
- `--github` / `--gitlab` — override provider detection
- `--name <slug>` — explicit slug for the review directory
- `--local` — write fix proposals to a local file and stop; do not apply, respond, or resolve
- `--no-resolve` — apply and respond, but leave threads unresolved

## Step 0: Parse Args

```bash
PR_ID=""
PROVIDER=""
SLUG=""
LOCAL=false
RESOLVE=true

while [ $# -gt 0 ]; do
  case "$1" in
    --github)     PROVIDER="github"; shift ;;
    --gitlab)     PROVIDER="gitlab"; shift ;;
    --name)       SLUG="$2"; shift 2 ;;
    --local)      LOCAL=true; shift ;;
    --no-resolve) RESOLVE=false; shift ;;
    *)            [ -z "$PR_ID" ] && PR_ID="$1"; shift ;;
  esac
done
```

**`--local`** stops after writing `comments.md` + `address.md` (proposals only) so you can review and edit them locally — nothing is applied, responded to, or resolved. Re-run without `--local` to apply. Default applies fixes and responds to + resolves the addressed threads on the platform.

## Step 1: Detect Provider & Resolve PR/MR

Identical to `new.md` Steps 1–2. Populate `PROVIDER`, `PR_NUMBER`, `PR_TITLE`, `PR_URL`.

## Step 2: Resolve Review Directory

Derive `SLUG` (or use `--name`); set `REVIEW_DIR=.codevoyant/review/{SLUG}`; create if absent.

- If `${REVIEW_DIR}/comments.md` already exists, overwrite it — it is always regenerated from the live PR/MR state.
- If `${REVIEW_DIR}/address.md` exists with any `Status: APPLIED` entries, warn:
  ```
  ⚠ address.md exists with applied fixes — overwriting proposals section only, preserving APPLIED entries.
  ```

## Step 3: Pull Comments

Delegate to the platform skill:

- **GitHub:** `/gh pull-comments {PR_NUMBER} --output {REVIEW_DIR}/comments.md`
- **GitLab:** `/glab pull-comments {PR_NUMBER} --output {REVIEW_DIR}/comments.md`

If the resulting doc lists 0 unresolved threads:

```
✓ No unresolved threads on PR/MR #{PR_NUMBER}.
```

and exit.

## Step 4: Propose Fixes

Initialize `${REVIEW_DIR}/address.md` using `references/address-template.md` header (substitute `{PR/MR title}`, `{number}`, `{url}`, timestamp).

For each unresolved thread in `${REVIEW_DIR}/comments.md`, run an inline sub-agent **sequentially** (each agent reads and appends to the same `address.md`):

```
Read the thread entry for Thread {id} ({file}:{line}) in {REVIEW_DIR}/comments.md.
Read the current source file at {file} (lines around {line} for context).
Propose a concrete fix for the reviewer's comment.
Append the proposal to {REVIEW_DIR}/address.md using this format:

### Fix for Thread {id} — {file}:{line}
**Reviewer comment:** {comment body}
**Proposed change:**
```diff
{diff}
```
**Notes:** {any caveats — e.g., merge conflict risk, tests to update}
**Status:** PENDING
---
```

If an agent fails for a thread (file not found, unparseable line number, etc.): log `⚠ Could not propose fix for Thread {id}: {reason}` and continue.

## Step 5: User Review

**If `LOCAL` is true — stop here for local review:**

```
✓ Fix proposals written for local review: {REVIEW_DIR}/address.md

  Edit the proposals (set Status: SKIP on any to exclude), then:
    /pr address        — apply them and respond on the PR/MR (re-run without --local)
    /pr update         — apply <!-- > … --> annotations or chat edits to the proposals
```

Do not apply, respond, or resolve. Exit.

**Otherwise (default):** proceed to apply. (If you want to eyeball first, that's what `--local` is for.) Report `✓ Proposals ready — applying fixes…` and continue to Step 6.

## Step 6: Apply Fixes

For each proposed fix in `address.md` where Status is not `SKIP` or `APPLIED`:

1. Read the target file at `{file}`.
2. Apply the proposed change using direct string replacement: locate the `-` lines from the diff block and replace with the `+` lines. For multi-line blocks, match the exact contiguous block. Use the Write/Edit tool — do NOT shell out to `patch`.
3. Write the updated file.
4. Update the entry's `**Status:**` line from `PENDING` to `APPLIED` in `address.md`.

If a fix fails to apply cleanly (no exact match, conflict): set Status to `FAILED` and record the reason on the `**Notes:**` line; continue with remaining fixes.

After the loop, report applied / skipped / failed counts.

## Step 7: Respond to and resolve threads

For each thread with Status `APPLIED`, post a draft response and then resolve the thread:

1. **Respond** (draft):
   - **GitHub:** `/gh draft {PR_NUMBER} --body "Addressed: {one-line summary}"` — see `skills/gh/references/workflows/draft.md` (creates or updates a PENDING review)
   - **GitLab:** `/glab draft {PR_NUMBER} --body "Addressed: {one-line summary}"` — see `skills/glab/references/workflows/draft.md`
2. **Resolve** the thread (unless `--no-resolve`):
   - **GitHub:** resolve via GraphQL — get the thread node id for the comment, then
     ```
     gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id={THREAD_NODE_ID}
     ```
   - **GitLab:** resolve the discussion — `glab api --method PUT "projects/:id/merge_requests/{PR_NUMBER}/discussions/{discussion_id}?resolved=true"`

Leave `SKIP` and `FAILED` threads **open** — they still need attention. Never resolve a thread whose fix was not applied.

## Step 8: Report

```
✓ {applied} fix(es) applied. Responded to and resolved {resolved} thread(s){, {skipped} skipped, {failed} failed}.

  To publish your responses:  /pr publish   (or /pr complete)
```

If any were `FAILED`: list them with reasons and note their threads were left open.

## Error Handling

- **Pull fails:** surface the upstream skill error
- **Empty thread list:** caught in Step 3
- **Patch conflict:** marked FAILED, included in report
