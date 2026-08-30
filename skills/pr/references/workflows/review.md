# new

Generate an AI-powered inline code review for a PR (GitHub) or MR (GitLab). Writes a structured review doc and optionally submits as a draft.

## Arguments

- `PR_ID` (optional positional) — defaults to PR/MR for current branch
- `--github` / `--gitlab` — override provider detection
- `--name <slug>` — explicit slug for the review directory
- `--local` — write the review to a local file for review instead of drafting it on the PR/MR
- `--update-docs` — opt in to letting the docs-freshness pass run `/docs update` and mutate the working tree. Off by default: review stays read-only and only reports stale docs as a `Docs:` finding.

## Step 0: Parse Args

```bash
PR_ID=""
PROVIDER=""
SLUG=""
LOCAL=false
UPDATE_DOCS=false

while [ $# -gt 0 ]; do
  case "$1" in
    --github)      PROVIDER="github"; shift ;;
    --gitlab)      PROVIDER="gitlab"; shift ;;
    --name)        SLUG="$2"; shift 2 ;;
    --local)       LOCAL=true; shift ;;
    --update-docs) UPDATE_DOCS=true; shift ;;
    *)             [ -z "$PR_ID" ] && PR_ID="$1"; shift ;;
  esac
done
```

**`--update-docs`** is off by default so `/pr review` stays **read-only** — it drafts comments without touching the working tree. By default the docs-freshness pass (Dimension 4) only *reports* stale docs as a `Docs:` finding that recommends `/docs update`. Pass `--update-docs` to opt in to having that pass actually run `/docs update` and refresh the docs as part of the review.

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
# {SKILL_ROOT} = the pr skill's package root (substitute the real path).
# Initialize the shared store before first use.
python3 "{SKILL_ROOT}/scripts/cv_init_store.py" >/dev/null
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

## Step 6: Assess the change with parallel subagents

### Step 5.5: Deterministic pre-checks (non-blocking)

Before the agent fan-out, run the deterministic checks from `references/security-gates.md` and record each result for the review's Verification section:

1. **CI status (best-effort warning).** GitHub: `gh pr checks "$PR_NUMBER"`; GitLab: `glab ci status`. Not green → record `⚠ CI is {failing|pending}` — review proceeds (merge/publish gate CI later). No CLI or no CI configured → skip, recorded.
2. **Commit consistency.** Fetch the commits (GitHub: `gh pr view "$PR_NUMBER" --json commits --jq '.commits[] | .messageHeadline'`; GitLab: `glab mr view "$PR_NUMBER" --output json | jq -r '.commits[].title'`). A non-conventional subject or a message that contradicts its diff becomes a NOTE finding (prefix `Commits: `).
3. **Static floor + project tooling.** Per `references/security-gates.md`: the project's format/lint/typecheck recipes first, then semgrep/bandit/trufflehog where applicable. Save raw findings as `STATIC_RAW`; every skip is recorded.

`/pr review` intentionally assesses the branch/PR across **five dimensions**, each handled by a focused subagent. Launch all five **in the same message** so they run concurrently, then merge their findings (Step 6e) before writing the review. The five dimensions:

1. **Intent-match** (Dimension 1, below) — does the diff deliver the stated intent end-to-end?
2. **Unnecessary changes** (Dimension 2 / Step 6b) — scope creep, stray edits, dead/commented code, accidental reverts, unrelated churn from a poorly-harnessed agentic run.
3. **Code quality** (Dimension 3 / Step 6c) — is the added/edited code high quality per the relevant codevoyant skill or the language/framework standard?
4. **Docs freshness** (Dimension 4 / Step 6d) — were docs updated? If not, report a `Docs:` finding recommending `/docs update` (default, read-only), or — only when `--update-docs` is set — invoke `/docs` to update them.
5. **Adversarial hunt** (Dimension 5 / Step 6e-launch) — the `red-team-adversary` agent tries to break the change: failure modes, edge cases, negative paths, mutation-mindset test review, STRIDE on security surfaces.

In the same message, also launch the **claim-checker** agent (`agents/claim-checker.md`) with `{TITLE}`, `{BODY}`, and `{DIFF_CONTENT}` — it verifies the body's claims against the diff (Step 6f).

### Dimension 1 — Intent-match & correctness

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

INTENT ALIGNMENT (evaluate this FIRST — it usually matters more than line-level nits):
- Treat the PR/MR title and description above as the **stated intent** — the goal and its implicit acceptance criteria. If the description is thin, infer the intent from the branch name and the shape of the diff.
- Judge whether the diff actually **delivers that intent end-to-end**, not just whether the code is clean. **Trace the headline use case concretely** — walk the main path step by step and check it would really work as written.
- Flag anything that undercuts the stated purpose, even if the code is well-formed: a feature whose main path stalls or needs manual intervention, an abstraction that never connects to its consumer, something billed as "reusable/global/automatic" that isn't, a fix that doesn't actually cover the reported case, a config/flag that has no effect.
- These are **BLOCKING** when they mean the change doesn't do what it claims. A clean diff that fails its intent is still a failing change — say so, and name the exact scenario where it breaks.
- Do NOT rubber-stamp scope you didn't verify. If part of the intent can't be confirmed from the diff, say what you couldn't verify rather than assuming it works.

TONE (follow references/voice.md — terse, human, junior-dev friendly):
- Each comment is usually ONE or TWO short sentences: name the problem, then the ask. Skip the mechanism walk-through and the list of every consequence — the author can read the code.
- Human and respectful. No sarcasm, no faint praise ("nice work but…"), no rhetorical questions, no hype.
- Junior-dev friendly: if a term or risk isn't obvious, one short clause (or a linked doc) — not a lecture.
- Example — instead of: "Any logged-in user can POST any pathname and it'll be saved to the DB, so someone could record a path to another user's file or a made-up URL and it shows up as a legitimate upload…" write: "This accepts any pathname, even fake ones. Worth validating." Then a code suggestion if it helps.

CONTENT:
- **Intent gaps** (does the change deliver its stated purpose?) come first — see INTENT ALIGNMENT above.
- Flag bugs, logic errors, and security issues as **BLOCKING**
- Flag style deviations, naming, and structure as non-blocking (CONSIDER)
- For each non-trivial issue, prefer a concrete code suggestion (diff block or replacement snippet) over prose — it's usually clearer and shorter.
- Cite external documentation, an RFC, or prior art (URL) only when it saves the author a search or justifies the point — not as decoration.
- Skip comments on style that matches project conventions — do not nitpick conforming code
- Focus on correctness, security, design, and intent. **Unnecessary/out-of-scope changes and AI "slop" are handled by a dedicated pass (Step 6b) — don't duplicate that here.**

For an intent-gap finding, anchor the comment on the most relevant line of the change (the assumption that doesn't hold, the flag that does nothing, the seam that doesn't connect) and describe the concrete failure scenario in the body.

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

Also produce a one-paragraph overall summary as a separate string. **Lead the summary with an intent verdict** — does the change deliver its stated purpose end-to-end? — then note the most important findings. If the headline use case wouldn't work as written, say so up front, not buried under line nits.

### Dimension 2 — Unnecessary changes (Step 6b: dedicated slop pass)

Agentic coding routinely drags in noise beyond the task — scope creep, stray edits, dead/commented code, accidental reverts, unrelated churn, verbose boilerplate, debug leftovers. Catch it with a dedicated agent so it never hides in a large diff.

Launch the **slop-detector** agent (`agents/slop-detector.md`) via the Agent tool with `subagent_type: slop-detector` — in the **same message** as the other dimensions so they run concurrently. Give it the same `{TITLE}`, `{BODY}` (stated scope), and `{DIFF_CONTENT}`. It returns a JSON array in the same schema (`file`, `line`, `severity`, `body`, `reference`), flagging only changes the stated goal does not require. It returns `[]` for a clean, focused diff.

### Dimension 3 — Code quality (Step 6c)

Launch the **code-quality-auditor** agent (`agents/code-quality-auditor.md`) via the Agent tool with `subagent_type: code-quality-auditor` — in the **same message** as the other dimensions. Give it the same `{TITLE}`, `{BODY}`, and `{DIFF_CONTENT}`. It maps each changed file to the relevant codevoyant skill (e.g. `mise`) — reading that skill when available — or, failing a match, the language/framework's own standard, and returns a JSON array in the same schema. It returns `[]` for idiomatic, well-structured code.

### Dimension 4 — Docs freshness (Step 6d)

Launch the **docs-freshness-checker** agent (`agents/docs-freshness-checker.md`) via the Agent tool with `subagent_type: docs-freshness-checker` — in the **same message** as the other dimensions. Give it the same `{TITLE}`, `{BODY}`, and `{DIFF_CONTENT}`, plus the current `UPDATE_DOCS` value. It decides whether the change touches documented surface and whether the diff already updates the docs.

**By default (`UPDATE_DOCS=false`), review stays read-only:** if docs are stale and not updated in the diff, the agent returns a `Docs:` CONSIDER finding recommending the author run `/docs update` — it does **not** mutate the working tree. Only when `UPDATE_DOCS=true` (the caller passed `--update-docs`) does it invoke `/docs update` to bring docs current and return a NOTE recording what it did. If docs are fine (or the change needs none) it returns `[]`.

### Dimension 5 — Adversarial hunt (Step 6e-launch)

Launch the **red-team-adversary** agent (`agents/red-team-adversary.md`) via the Agent tool with `subagent_type: red-team-adversary` — in the **same message** as Dimensions 2–4 and the claim-checker. Give it `{TITLE}`, `{BODY}`, and `{DIFF_CONTENT}`. It returns `{"findings": [...], "what_was_not_verified": [...]}` per its schema. Store the not-verified list for the template's disclosure section. Do NOT feed it prior review comments or anchor metadata — the prompt stays skeptical and unanchored by design.

### Claim check (Step 6f)

The **claim-checker** agent (`agents/claim-checker.md`) is launched in the same message as the five dimensions. Give it `{TITLE}`, `{BODY}`, and `{DIFF_CONTENT}`. It parses the body into individual claims — each `Changes` bullet, each `Validation` checkbox, each behavioral statement — and proves or disproves each one against the diff, classifying every claim as proven, unfulfilled, or unverifiable. It returns a JSON array in the same schema (`file`, `line`, `candidate_severity`, `body`, `reference`): unfulfilled claims carry `candidate_severity: BLOCKING`, unverifiable ones `CONSIDER`; proven claims produce no finding. An empty `[]` means every claim in the body checks out.

### Step 6e — Merge and assign severity (the decision layer)

Agents detect; this step decides. Merge every source into one comment array and assign each finding's final severity here — severity never comes from an agent's prompt:

1. **Concatenate:** reviewer (Dimension 1), slop-detector (2), code-quality-auditor (3), docs-freshness-checker (4), red-team-adversary findings (5), claim-checker (6f), and curated `STATIC_RAW` findings (Step 5.5).
2. **Prefix bodies by source:** `Slop: `, `Quality: `, `Docs: `, `Adversarial: `, `Claim: `, `Static: ` — Dimension 1 findings stay unprefixed. Adversarial findings append their scenario (`Input: … expected: … observed: …`), and security findings their STRIDE/CWE tags.
3. **Assign severity:**
   - Adversarial findings: **BLOCKING iff** `scenario.input/expected/observed` are all concrete and consistent with the diff; any vague or missing leg → downgrade to CONSIDER. No scenario at all → CONSIDER.
   - Claim findings: unfulfilled claim → BLOCKING; unverifiable → CONSIDER.
   - Static findings the curator could not verify → NOTE (transparent, not dropped). Docs findings stay capped at CONSIDER/NOTE.
   - All others keep their agent-assigned severity.
4. **De-duplicate** by `file:line` + overlapping intent (keep the more specific/severe of a pair).
5. **Classify anchorability:** a finding is *un-anchorable* when it is structural/PR-wide and has no specific file:line (e.g. the change's architecture contradicts its stated approach; a one-way door with no rollback). Un-anchorable BLOCKING findings go to the review doc's `## Overall issues` section — everything else stays a file-level comment.

Do NOT write an overall summary of what the review did — the review speaks through its findings.

## Step 7: Write Review Document

Read `references/new-review-template.md`. Replace all `{placeholder}` tokens via direct string substitution using the resolved values (`$TITLE`, `$AUTHOR`, `$BASE_REF`, `$HEAD_REF`, `$ADDITIONS`, `$DELETIONS`, `$CHANGED_FILES`, `$PR_NUMBER`, `$PR_URL`, current timestamp, and the summary paragraph).

For the inline comments section, render every ANCHORED finding (all findings except the un-anchorable BLOCKING ones classified in Step 6e) using the template's `### {file}:{line} — {severity}` block. Render the un-anchorable BLOCKING findings into `## Overall issues`; if there are none, delete that section from the doc. Fill `## Verification` from the Step 5.5 records and `## What was NOT verified` from the adversary's list. The doc carries no summary of what the review did.

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

Only file-level comments are pushed here. The top-level review body is resolved at publish time (publish.md Step 2.5) from `## Overall issues` — when that section is absent, publish uses a fixed minimal body and posts no review prose at all.

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
