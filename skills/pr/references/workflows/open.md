# open

Create a draft PR (GitHub) or draft MR (GitLab) from the current branch with a structured template body.

## Arguments

```
BRANCH        --branch name     (default: current branch)
BASE          --base name       (default: main)
TEMPLATE      --bug | --feature (default: --feature; auto-detect if branch name starts with fix/ or bug/)
TITLE         --title "..."     (optional; derived from branch name if not given)
LOCAL         --local           (write the body to a local file for review instead of creating the PR/MR)
PROVIDER      auto-detected from git remote (github or gitlab)
```

## Step 0: Parse Args

```bash
BRANCH=""
BASE="main"
TEMPLATE="feature"
TITLE=""
LOCAL=false
PROVIDER=""

while [ $# -gt 0 ]; do
  case "$1" in
    --branch)  BRANCH="$2"; shift 2 ;;
    --base)    BASE="$2"; shift 2 ;;
    --bug)     TEMPLATE="bug"; shift ;;
    --feature) TEMPLATE="feature"; shift ;;
    --title)   TITLE="$2"; shift 2 ;;
    --local)   LOCAL=true; shift ;;
    --github)  PROVIDER="github"; shift ;;
    --gitlab)  PROVIDER="gitlab"; shift ;;
    *)         shift ;;
  esac
done
```

**`--local`** writes the drafted PR body to `.codevoyant/review/{slug}/pr-body.md` (where `{slug}` = the branch name, kebab-cased) and stops — nothing is created on the platform. Review/edit it, then re-run without `--local` (or `gh pr create --body-file …`) to open the PR. Default creates the draft PR/MR directly.

## Step 1: Verify CLI

```bash
# GitHub
command -v gh >/dev/null || { echo "gh not installed"; exit 1; }

# GitLab
command -v glab >/dev/null || { echo "glab not installed"; exit 1; }
```

Detect provider from git remote if not set by flag:

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

Resolve current branch if not overridden:

```bash
[ -z "$BRANCH" ] && BRANCH=$(git rev-parse --abbrev-ref HEAD)
```

## Step 2: Derive Title

If `--title` not given, derive from branch name:

- Strip known prefixes: `feature/`, `feat/`, `fix/`, `bug/`, `chore/`, `eng-NNN-`
- Replace `-` and `_` with spaces
- Title-case the result

Examples:
- `feature/add-dark-mode` → `Add dark mode`
- `fix/login-crash` → `Fix login crash`
- `eng-123-auth-refactor` → `Auth refactor`

## Step 3: Select Template

If `--bug` flag given, or `BRANCH` starts with `fix/` or `bug/`: set `TEMPLATE="bug"`.

Read the appropriate template:
- `bug` → `references/templates/pr-bug.md`
- `feature` → `references/templates/pr-feature.md`

Inspect recent commits and the current diff to fill in what is known. Leave `<!-- TODO -->` markers for sections that cannot be inferred confidently.

## Step 3.5: Write the body in a human voice

Fill the template following `references/voice.md`. Write for a busy teammate or **junior developer** seeing this change for the first time —

- **Terse.** Short sentences, one idea each. No long, flowing sentences — split them. Cut filler. Bullets over paragraphs.
- **Human, not robotic.** Drop AI boilerplate ("This PR aims to…", "It is worth noting…"). Say what changed and why; don't narrate what the diff already shows.
- **Junior-dev friendly.** Give the *why*. Expand an acronym or link a doc the first time it matters.
- **Respectful, no sarcasm or rhetorical flair.** No rhetorical questions, no hype words ("blazingly fast", "simply", "just"), no exclamation spam.
- **Link references when they help** — the relevant doc, RFC, issue, ADR, or prior art (URL), only when it saves the reader a search.
- Flag anything a reviewer should look at closely (risky area, follow-up, known limitation) in plain words.

## Step 4: Create Draft PR/MR — or write locally

**If `LOCAL` is true:** write `${BODY}` to `.codevoyant/review/{slug}/pr-body.md` (create the dir), and stop — do not create the PR/MR. Report:

```
✓ PR body written for review: .codevoyant/review/{slug}/pr-body.md

  Edit it, then:
    /pr open           — create the draft PR/MR with this body (re-run without --local)
    /pr update         — apply <!-- > … --> annotations or chat edits to this body
```

**Otherwise (default) — create the draft directly on the platform:**

**GitHub:**

```bash
gh pr create \
  --title "${TITLE}" \
  --body "${BODY}" \
  --base "${BASE}" \
  --draft \
  --assignee "@me"
```

**GitLab:**

```bash
glab mr create \
  --title "${TITLE}" \
  --description "${BODY}" \
  --target-branch "${BASE}" \
  --draft \
  --yes
```

## Step 5: Report

```
✓ Draft PR/MR created: {URL}

Fill in the template sections, then:
  /pr review        — generate inline review
  /pr update        — tweak the description (<!-- > … --> annotations or chat)
  /pr publish       — mark it ready for review
```

## Error Handling

- **Provider undetectable:** caught in Step 1
- **gh / glab not installed:** caught in Step 1
- **Branch has no upstream:** push with `git push -u origin ${BRANCH}` before creating the PR/MR, or advise the user to do so
- **PR/MR already exists:** surface the existing URL and exit without creating a duplicate
