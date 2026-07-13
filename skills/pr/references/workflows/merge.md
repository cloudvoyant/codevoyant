# merge

Merge the current-branch PR/MR (or an explicit `PR_ID`) via `gh pr merge` / `glab mr merge`.

Squash by default, and **semantic-release aware**: a squash merge onto a release branch (`main`) uses the squashed commit's subject as the release trigger, so the subject must be a conventional-commit line or the release is silently skipped. `merge` guards against that.

## Arguments

- `PR_ID` (optional positional) — defaults to the PR/MR for the current branch
- `--squash` (default) / `--rebase` / `--merge` — merge method
- `--delete-branch` — delete the source branch after merge
- `--yes` / `-y` — skip confirmation and the semantic-release subject prompt (use the best derived subject)
- `--subject "..."` — the squash commit subject (overrides derivation)
- `--body "..."` — the squash commit body
- `--push` — push unpushed local commits before merging
- `--github` / `--gitlab` — override provider detection

## Step 0: Parse Args

```bash
PR_ID=""; PROVIDER=""
METHOD="squash"          # squash | rebase | merge
DELETE_BRANCH=false
ASSUME_YES=false
DO_PUSH=false
SUBJECT=""; BODY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --squash)        METHOD="squash"; shift ;;
    --rebase)        METHOD="rebase"; shift ;;
    --merge)         METHOD="merge";  shift ;;
    --delete-branch) DELETE_BRANCH=true; shift ;;
    --yes|-y)        ASSUME_YES=true; shift ;;
    --push)          DO_PUSH=true; shift ;;
    --subject)       SUBJECT="$2"; shift 2 ;;
    --body)          BODY="$2"; shift 2 ;;
    --github)        PROVIDER="github"; shift ;;
    --gitlab)        PROVIDER="gitlab"; shift ;;
    *)               [ -z "$PR_ID" ] && PR_ID="$1"; shift ;;
  esac
done
```

## Step 1: Detect Provider

Same as `open.md` Step 1 (remote-URL sniff + `--github`/`--gitlab` override). Exit with `--github`/`--gitlab` guidance if undetectable.

## Step 2: Resolve PR/MR and state

Resolve for `PR_ID` or the current branch, capturing `PR_NUMBER`, `PR_TITLE`, `PR_URL`, `IS_DRAFT`, `MERGEABLE`, and `BASE` (target branch):

- **GitHub:** `gh pr view {PR_ID or branch} --json number,title,url,isDraft,mergeable,baseRefName`
  - `IS_DRAFT` ← `isDraft`; `MERGEABLE` ← `mergeable` (`MERGEABLE`/`CONFLICTING`/`UNKNOWN`); `BASE` ← `baseRefName`.
- **GitLab:** `glab mr view {PR_ID or branch}` — `IS_DRAFT` if the title is `Draft:`/`WIP:`-prefixed; `MERGEABLE` from the merge status; `BASE` from the target branch.

If no open PR/MR is found: `✗ No open PR/MR found for this branch. Open one with /pr open.` and exit.

## Step 3: Pre-flight checks

**Hard blocks** (exit without merging):

1. **Draft.** If `IS_DRAFT`: `✗ PR/MR #{PR_NUMBER} is still a draft — publish it first with /pr publish.` and exit.
2. **Not mergeable.** If `MERGEABLE == CONFLICTING` (or GitLab reports conflicts): `✗ PR/MR #{PR_NUMBER} has merge conflicts — resolve them, then re-run.` and exit. If `MERGEABLE == UNKNOWN`, note `⚠ Mergeability unknown — GitHub may still be computing it.` and continue.

**Warnings** (note, don't block):

3. **Unpushed commits.** If the local branch is ahead of upstream (`git rev-list --count @{upstream}..HEAD`): if `--push`, run `git push`; else warn `⚠ {N} local commit(s) not pushed — they won't be in the merge. Re-run with --push, or push first.` and continue.
4. **CI status.** Best-effort — GitHub: `gh pr checks {PR_NUMBER}`; GitLab: `glab ci status`. If not green: `⚠ CI is {failing|pending} — merging anyway.`

## Step 4: Semantic-release subject guard

Only when `METHOD == squash` **and** `BASE == main` (the release branch — `.releaserc.json` `"branches": ["main"]`). The squashed commit's subject becomes the release trigger, so it must be a conventional-commit subject or the release is skipped. Otherwise (non-squash method, or non-release base) skip this step and leave `SUBJECT`/`BODY` as given.

Conventional-commit pattern (same one `squash`/`changelog` rely on):

```
^(feat|fix|perf|refactor|docs|chore|test|build|ci|style|revert)(\([^)]+\))?!?: .+
```

Resolve the subject:

1. If `--subject` was given: if it matches the pattern, use it. If not, and `--yes`, use it anyway but warn `⚠ Subject is not a conventional-commit line — the release may be skipped.`; if not `--yes`, confirm/adjust via **AskUserQuestion**.
2. Else if `PR_TITLE` already matches the pattern: use it as `SUBJECT`.
3. Else derive a candidate from the branch name and commits (pick a type — `fix/`/`bug/` branches → `fix`, else `feat` — and a terse summary). Then:
   - If `--yes`: use the candidate.
   - Else use **AskUserQuestion** to confirm or adjust it:
     ```
     question: "Squashing to '{BASE}' — the commit subject is the release trigger. Use this conventional-commit subject?\n  {candidate}"
     header: "Subject"
     options:
       - label: "Use it"       description: "{candidate}"
       - label: "Edit"         description: "Provide a different conventional-commit subject"
       - label: "Merge anyway" description: "Skip the guard — the release may not run"
     ```
   - On **Edit**, take the corrected subject (re-validate; loop once if still invalid). On **Merge anyway**, clear `SUBJECT` so the platform default is used and warn that the release may be skipped.

## Step 5: Confirm

Unless `--yes`, use **AskUserQuestion**:

```
question: "Merge PR/MR #{PR_NUMBER} '{PR_TITLE}' into {BASE} via {METHOD}{, deleting the branch (if --delete-branch)}?"
header: "Merge"
options:
  - label: "Merge"
    description: "{METHOD} merge{ · subject: {SUBJECT} (if set)}{ · CI {status} (if not green)}"
  - label: "Cancel"
    description: "Leave the PR/MR open"
```

Cancel → exit without changes.

## Step 6: Execute

Delegate to the platform CLI with the method, subject/body, and delete-branch flags:

- **GitHub:**
  ```bash
  gh pr merge {PR_NUMBER} \
    --{squash|rebase|merge} \
    {--subject "$SUBJECT" \}   # only for squash, if set
    {--body "$BODY" \}         # only for squash, if set
    {--delete-branch}          # if DELETE_BRANCH
  ```
  Append each optional flag (with its trailing `\`) only when it applies; the final flag in the composed command carries no trailing backslash.
- **GitLab:**
  ```bash
  glab mr merge {PR_NUMBER} \
    {--squash | --rebase}    # omit both to use the project's configured merge method
    {--squash-message "$SUBJECT"}  # for squash, if set
    {--remove-source-branch}       # if DELETE_BRANCH
    --yes
  ```
  With no `--squash`/`--rebase` flag, glab uses the project's configured merge method (which may be a merge commit, squash, or fast-forward per repo settings) — it does not force a merge commit.

If the merge fails (not mergeable, auth, permissions, protected-branch rules): report `✗ Merge failed: {error}.` and exit.

## Step 7: Report

Capture the resulting merge commit SHA (`gh pr view {PR_NUMBER} --json mergeCommit --jq .mergeCommit.oid`, or the CLI output) and report:

```
✓ Merged PR/MR #{PR_NUMBER} into {BASE} ({METHOD})
  merge commit {SHA}
  {— source branch deleted (if done)}
  {PR_URL}
```

If the semantic-release guard was skipped or the subject wasn't conventional, remind: `Heads-up: the squash subject isn't a conventional-commit line — a release may not be triggered.`
