# report

Analyze session artifacts and write a responsible-AI usage report. Filename is derived from the inline name, feature branch slug, or date fallback.

## Variables

- `REPORT_NAME` — first non-flag positional arg (may be empty); lowercased, spaces to hyphens
- `DATE` — today in YYYY-MM-DD format: `date +%Y-%m-%d`
- `BRANCH` — `git rev-parse --abbrev-ref HEAD`
- `BASE_BRANCH` — detect via `git merge-base --fork-point main HEAD 2>/dev/null` or default `main`
- `PLAN_DIR` — `.codevoyant/plans`
- `OUTPUT_FILE` — derived in Step 1

## Step 1: Resolve Context

```bash
DATE=$(date +%Y-%m-%d)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(no git)")

# Derive output filename — priority: inline name > feature branch slug > date only
if [[ -n "$REPORT_NAME" ]]; then
  SLUG=$(echo "$REPORT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
  OUTPUT_FILE=".codevoyant/usage/${SLUG}-${DATE}.md"
elif [[ "$BRANCH" == feature/* || "$BRANCH" == feat/* ]]; then
  FEATURE_SLUG=$(echo "$BRANCH" | sed 's|^feature/||;s|^feat/||' | tr '[:upper:]' '[:lower:]' | tr '/' '-' | tr -cd 'a-z0-9-')
  OUTPUT_FILE=".codevoyant/usage/${FEATURE_SLUG}-${DATE}.md"
else
  OUTPUT_FILE=".codevoyant/usage/${DATE}.md"
fi

mkdir -p .codevoyant/usage
```

State: `Analyzing session on branch: $BRANCH -> writing to ${OUTPUT_FILE}`

## Step 2: Parse Decision Logs

Read every `.codevoyant/plans/*/plan.md` file that exists. For each:

1. Extract the plan name (directory name)
2. Find `### User Decisions` and `### Agent Decisions` sections
3. Count and list all `[user]` entries (title + quote)
4. Count and list all `[agent]` entries (title + rationale)

Store as:
- `USER_DECISIONS` — list of `{plan, title, quote}` objects
- `AGENT_DECISIONS` — list of `{plan, title, rationale}` objects
- `PLANS_ANALYZED` — list of plan names with non-empty Decision Logs

If no plans exist or all Decision Logs are empty, set `DECISION_LOG_AVAILABLE=false` and note in the output.

## Step 3: Read Git Commit History

```bash
DIVERGE=$(git merge-base HEAD main 2>/dev/null || git rev-parse HEAD~20 2>/dev/null)
git log --oneline "$DIVERGE"..HEAD --pretty=format:"%h %s"
```

For each commit:
1. Extract the conventional commit type (text before `:` or `(`)
2. Apply attribution default from `references/attribution-rules.md`
3. If type is `weighted`, compute ratio from Decision Log counts:
   - `user_pct = USER_DECISIONS.length / (USER_DECISIONS.length + AGENT_DECISIONS.length) * 100`
   - If no Decision Log: default to 60% user / 40% agent with a note

Build `COMMIT_TABLE` — list of `{hash, subject, type, attribution, basis}`.

Skip `chore(release)` commits from the weighted calculation (they are infrastructure).

## Step 4: Detect Review Rounds

Scan the current conversation context (what is visible to you now) for signals of user review:

- `/code-review` calls with arguments (any specific instructions = 1 round)
- `spec review {plan}` calls
- `spec update` calls that followed user annotations
- User messages containing explicit review direction ("check for X", "make sure Y", "review Z", "ensure W")
- Inline `>` or `>>` annotation markers in any plan file (read them to confirm they exist)

Build `REVIEW_ROUNDS` — list of `{context, description}`. Each distinct review invocation = 1 entry.

**Note:** Review rounds from prior sessions (not visible in current context) cannot be detected. State this limitation in the output.

## Step 5: Compute Attribution and Score

```
total_user = USER_DECISIONS.length + (chore/refactor/docs/test/style/revert/release commits count)
total_agent = AGENT_DECISIONS.length + (agent-attributed weighted commits count)
total = total_user + total_agent

user_pct = round(total_user / total * 100) if total > 0 else 0
review_count = REVIEW_ROUNDS.length
```

Apply vibecoded checklist (from `references/attribution-rules.md`). If all five criteria met, set `SCORE=vibecoded`.

Otherwise apply score formula:
```
if user_pct >= 50 AND review_count >= 1 -> SCORE=high
elif user_pct >= 25 OR review_count >= 1 -> SCORE=medium
else -> SCORE=low
```

## Step 6: Write Output

Read `references/report-template.md`. Substitute all `{...}` placeholders with computed values.

Key substitutions:
- `{YYYY-MM-DD}` -> `$DATE`
- `{current branch}` -> `$BRANCH`
- `{N} plans` -> count of `$PLANS_ANALYZED`
- `{list of plan names}` -> comma-separated plan names
- Decision Log detail -> expand all USER_DECISIONS and AGENT_DECISIONS per plan
- Commit table -> render `COMMIT_TABLE` rows
- Review rounds -> list `REVIEW_ROUNDS` entries (or "No review rounds detected")
- Score -> `$SCORE` in uppercase
- Score factors -> fill the three-row table
- Rationale -> 2-3 sentences explaining the score
- Methodology summary -> copy verbatim from template (it is static)

Write the completed file to `$OUTPUT_FILE`.

State: `Written to $OUTPUT_FILE`

## Step 7: Post-write Check

```bash
test -s "$OUTPUT_FILE" && echo "File exists and is non-empty" || echo "File missing or empty"
```

Confirm to the user:

```
Usage output ready: {OUTPUT_FILE}

  Score: {SCORE}
  User decisions: {total_user} ({user_pct}%)
  Agent decisions: {total_agent}
  Review rounds: {review_count}
```

**Hard check — run before any output:**
Scan the generated file for the string `Co-Authored-By`. If found (anywhere except in the footer disclaimer), remove it immediately and re-write the file. Note the removal.
