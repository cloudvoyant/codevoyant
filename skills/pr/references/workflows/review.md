# new

Generate an AI-powered inline code review for a PR (GitHub) or MR (GitLab). Writes a structured review doc and optionally submits as a draft.

## Arguments

- `PR_ID` (optional positional) — defaults to PR/MR for current branch
- `--github` / `--gitlab` — override provider detection
- `--name <slug>` — explicit slug for the review directory
- `--local` — write the review to a local file for review instead of drafting it on the PR/MR

## Step 0: Parse Args

```bash
PR_ID=""
PROVIDER=""
SLUG=""
LOCAL=false

while [ $# -gt 0 ]; do
  case "$1" in
    --github) PROVIDER="github"; shift ;;
    --gitlab) PROVIDER="gitlab"; shift ;;
    --name)   SLUG="$2"; shift 2 ;;
    --local)  LOCAL=true; shift ;;
    *)        [ -z "$PR_ID" ] && PR_ID="$1"; shift ;;
  esac
done
```

**`--local`** writes the review to `.codevoyant/review/{slug}/new-review.md` and stops — nothing is pushed. Read/edit it, then push with `/pr review` (no `--local`) or `/pr publish`. Default pushes the review as a pending draft directly on the PR/MR.

## Step 1: Detect Provider

If `PROVIDER` not set by flag:

```bash
REMOTE_URL=$(git config --get remote.origin.url)
if echo "$REMOTE_URL" | grep -q "github.com"; then
  PROVIDER="github"
elif echo "$REMOTE_URL" | grep -qE "gitlab\.com|gitlab\."; then
  PROVIDER="gitlab"
else
  echo "✗ Could not detect provider from remote URL: $REMOTE_URL"
  echo "  Use --github or --gitlab to specify manually."
  exit 1
fi
```

## Step 2: Resolve PR/MR

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
```

If `PR_ID` not given:

- **GitHub:** `gh pr list --head "$BRANCH" --state open --json number,title,url --jq '.[0]'`
- **GitLab:** `glab mr list --source-branch "$BRANCH" --state opened --output json | jq '.[0]'`

If result is empty/null:

```
✗ No open PR/MR found for branch '{BRANCH}'. Pass the PR/MR number explicitly: /rev new {PR_ID}
```

Store: `PR_NUMBER`, `PR_TITLE`, `PR_URL`.

## Step 3: Resolve Review Slug

If `--name` was given, use it. Otherwise derive from `PR_TITLE`: lowercase, replace non-alnum with `-`, collapse runs of `-`, trim to 50 chars.

```bash
REVIEW_DIR=".codevoyant/review/${SLUG}"
mkdir -p "$REVIEW_DIR"
```

## Step 4: Fetch Diff

- **GitHub:** `DIFF_CONTENT=$(gh pr diff "$PR_NUMBER")`
- **GitLab:** `DIFF_CONTENT=$(glab mr diff "$PR_NUMBER")`

## Step 5: Fetch PR/MR Metadata

**GitHub:**

```bash
META=$(gh pr view "$PR_NUMBER" --json title,body,author,baseRefName,headRefName,additions,deletions,changedFiles)
TITLE=$(echo "$META" | jq -r '.title')
BODY=$(echo "$META" | jq -r '.body')
AUTHOR=$(echo "$META" | jq -r '.author.login')
BASE_REF=$(echo "$META" | jq -r '.baseRefName')
HEAD_REF=$(echo "$META" | jq -r '.headRefName')
ADDITIONS=$(echo "$META" | jq -r '.additions')
DELETIONS=$(echo "$META" | jq -r '.deletions')
CHANGED_FILES=$(echo "$META" | jq -r '.changedFiles')
```

**GitLab:**

```bash
META=$(glab mr view "$PR_NUMBER" --output json)
TITLE=$(echo "$META" | jq -r '.title')
BODY=$(echo "$META" | jq -r '.description')
AUTHOR=$(echo "$META" | jq -r '.author.username')
BASE_REF=$(echo "$META" | jq -r '.target_branch')
HEAD_REF=$(echo "$META" | jq -r '.source_branch')
```

## Step 6: Generate Review

Run an inline agent (NOT background) with this prompt:

```
You are a senior software engineer conducting a code review.

PR/MR: {TITLE}
Author: {AUTHOR}
Base → Head: {BASE_REF} → {HEAD_REF}
Stats: +{ADDITIONS} -{DELETIONS} across {CHANGED_FILES} files

Description:
{BODY}

Diff:
{DIFF_CONTENT}

Write a thorough inline code review. Be thorough in what you CATCH, terse in what you WRITE.

TONE (follow references/voice.md — terse, human, junior-dev friendly):
- Each comment is usually ONE or TWO short sentences: name the problem, then the ask. Skip the mechanism walk-through and the list of every consequence — the author can read the code.
- Human and respectful. No sarcasm, no faint praise ("nice work but…"), no rhetorical questions, no hype.
- Junior-dev friendly: if a term or risk isn't obvious, one short clause (or a linked doc) — not a lecture.
- Example — instead of: "Any logged-in user can POST any pathname and it'll be saved to the DB, so someone could record a path to another user's file or a made-up URL and it shows up as a legitimate upload…" write: "This accepts any pathname, even fake ones. Worth validating." Then a code suggestion if it helps.

CONTENT:
- Flag bugs, logic errors, and security issues as **BLOCKING**
- Flag style deviations, naming, and structure as non-blocking (CONSIDER)
- For each non-trivial issue, prefer a concrete code suggestion (diff block or replacement snippet) over prose — it's usually clearer and shorter.
- Cite external documentation, an RFC, or prior art (URL) only when it saves the author a search or justifies the point — not as decoration.
- Skip comments on style that matches project conventions — do not nitpick conforming code
- Focus on correctness, security, and design. **Unnecessary/out-of-scope changes and AI "slop" are handled by a dedicated pass (Step 6b) — don't duplicate that here.**

OUTPUT FORMAT — always produce a valid JSON array (empty array if no comments):
[
  {
    "file": "src/foo.ts",
    "line": 42,
    "severity": "BLOCKING | CONSIDER | NOTE",
    "body": "Markdown comment body with proposed change if applicable",
    "reference": "optional URL or empty string"
  }
]

Return `[]` if the code has no issues. Do not include an overall summary in this JSON — that goes in a separate field.
```

Also produce a one-paragraph overall summary as a separate string.

## Step 6b: Dedicated slop pass (run in parallel with Step 6)

Agentic coding routinely drags in noise beyond the task — unnecessary edits, random churn, verbose boilerplate, debug leftovers. Catch it with a dedicated agent so it never hides in a large diff.

Launch the **slop-detector** agent (`agents/slop-detector.md`) via the Agent tool with `subagent_type: slop-detector` — ideally in the **same message** as the Step 6 reviewer so they run concurrently. Give it the same `{TITLE}`, `{BODY}` (stated scope), and `{DIFF_CONTENT}`. It returns a JSON array in the same schema (`file`, `line`, `severity`, `body`, `reference`), flagging only changes the stated goal does not require. It returns `[]` for a clean, focused diff.

**Merge** its findings into the review's comment array before Step 7:
- Concatenate the reviewer's array and the slop-detector's array.
- De-duplicate by `file:line` + overlapping intent (keep the more specific/severe of a pair).
- Prefix each slop finding's body with `Slop: ` so the author can see it came from the scope pass (e.g. `Slop: unrelated reformat here — revert to keep the diff focused.`).

If the slop-detector returns a non-empty array, add one line to the overall summary noting how many unnecessary-change findings were raised.

## Step 7: Write Review Document

Read `references/new-review-template.md`. Replace all `{placeholder}` tokens via direct string substitution using the resolved values (`$TITLE`, `$AUTHOR`, `$BASE_REF`, `$HEAD_REF`, `$ADDITIONS`, `$DELETIONS`, `$CHANGED_FILES`, `$PR_NUMBER`, `$PR_URL`, current timestamp, and the summary paragraph).

For the inline comments section, iterate over the JSON array and render each entry using the template's `### {file}:{line} — {severity}` block.

Write the populated content to `${REVIEW_DIR}/new-review.md`.

## Step 8: Deliver

**If `LOCAL` is true — stop here for local review:**

```
✓ Review written for local review: {REVIEW_DIR}/new-review.md
  {count} comments ({blocking} BLOCKING, {consider} CONSIDER, {note} NOTE)

  Edit it, then:
    /pr review        — push it to the PR/MR as a draft (re-run without --local)
    /pr update        — apply <!-- > … --> annotations or chat edits to this review
```

Do not push anything.

**Otherwise (default) — draft it directly on the PR/MR as a pending review:**

- GitHub: `/gh push-comments {PR_NUMBER} --doc {REVIEW_DIR}/new-review.md` then `/gh draft {PR_NUMBER}`
- GitLab: `/glab push-comments {PR_NUMBER} --doc {REVIEW_DIR}/new-review.md` then `/glab draft {PR_NUMBER} --draft`

Report:

```
✓ Draft review posted to {provider} PR/MR #{PR_NUMBER} — review it in the UI.
  {count} comments ({blocking} BLOCKING, {consider} CONSIDER, {note} NOTE)
  {PR_URL}

  To adjust: /pr update   ·   To publish: /pr publish
```

(The local `{REVIEW_DIR}/new-review.md` is still written as the source for the push and for `/pr update`.)

## Error Handling

- **Provider undetectable:** caught in Step 1
- **No open PR/MR:** caught in Step 2
- **Diff empty:** report `✗ Empty diff — nothing to review.` and exit
- **AI returns non-JSON:** retry once with a stricter prompt; if still invalid, surface raw output and exit
