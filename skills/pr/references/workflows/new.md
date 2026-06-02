# new

Generate an AI-powered inline code review for a PR (GitHub) or MR (GitLab). Writes a structured review doc and optionally submits as a draft.

## Arguments

- `PR_ID` (optional positional) — defaults to PR/MR for current branch
- `--github` / `--gitlab` — override provider detection
- `--name <slug>` — explicit slug for the review directory

## Step 0: Parse Args

```bash
PR_ID=""
PROVIDER=""
SLUG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --github) PROVIDER="github"; shift ;;
    --gitlab) PROVIDER="gitlab"; shift ;;
    --name)   SLUG="$2"; shift 2 ;;
    *)        [ -z "$PR_ID" ] && PR_ID="$1"; shift ;;
  esac
done
```

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

Write a professional, thorough inline code review. Rules:

TONE:
- Professional and courteous — no sarcasm, no faint praise ("nice work but…"), no rhetorical questions
- Direct and terse — one sentence where one sentence suffices
- Constructive — every comment should leave the author knowing exactly what to do

CONTENT:
- Flag bugs, logic errors, and security issues as blocking (MUST CHANGE)
- Flag style deviations, naming, and structure as non-blocking (CONSIDER)
- For each non-trivial issue, propose a concrete code change (diff block or replacement snippet)
- Cite relevant external documentation, RFCs, or prior art where it strengthens the point (URL preferred)
- Skip comments on style that matches project conventions — do not nitpick conforming code

OUTPUT FORMAT — always produce a valid JSON array (empty array if no comments):
[
  {
    "file": "src/foo.ts",
    "line": 42,
    "severity": "MUST CHANGE | CONSIDER | NOTE",
    "body": "Markdown comment body with proposed change if applicable",
    "reference": "optional URL or empty string"
  }
]

Return `[]` if the code has no issues. Do not include an overall summary in this JSON — that goes in a separate field.
```

Also produce a one-paragraph overall summary as a separate string.

## Step 7: Write Review Document

Read `references/new-review-template.md`. Replace all `{placeholder}` tokens via direct string substitution using the resolved values (`$TITLE`, `$AUTHOR`, `$BASE_REF`, `$HEAD_REF`, `$ADDITIONS`, `$DELETIONS`, `$CHANGED_FILES`, `$PR_NUMBER`, `$PR_URL`, current timestamp, and the summary paragraph).

For the inline comments section, iterate over the JSON array and render each entry using the template's `### {file}:{line} — {severity}` block.

Write the populated content to `${REVIEW_DIR}/new-review.md`.

## Step 8: Present & Confirm

Display:

```
✓ Review generated: {REVIEW_DIR}/new-review.md
  {count} comments ({must-change} blocking, {consider} non-blocking)

Open the file to review or adjust comments before submitting.
```

Use **AskUserQuestion**:

```yaml
question: "Submit this review to the PR/MR?"
header: "Submit Review"
options:
  - label: "Submit as draft (Recommended)"
    description: "Push comments as a pending review — you can edit before publishing"
  - label: "Submit and publish"
    description: "Push comments and immediately publish the review"
  - label: "Don't submit yet"
    description: "Leave the review in the doc for later"
```

Branch on the answer:

- **Submit as draft:**
  - GitHub: call `/gh push-comments {PR_NUMBER} --doc {REVIEW_DIR}/new-review.md` then `/gh draft {PR_NUMBER}`
  - GitLab: call `/glab push-comments {PR_NUMBER} --doc {REVIEW_DIR}/new-review.md` then `/glab draft {PR_NUMBER} --draft`
- **Submit and publish:**
  - GitHub: `/gh push-comments` then `/gh complete {PR_NUMBER}`
  - GitLab: `/glab push-comments` then `/glab complete {PR_NUMBER}`
- **Don't submit:** exit with `To submit later: /rev complete {PR_NUMBER}`

## Error Handling

- **Provider undetectable:** caught in Step 1
- **No open PR/MR:** caught in Step 2
- **Diff empty:** report `✗ Empty diff — nothing to review.` and exit
- **AI returns non-JSON:** retry once with a stricter prompt; if still invalid, surface raw output and exit
