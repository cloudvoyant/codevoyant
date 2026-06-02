# learn

Extract a skill from an artifact in front of you — a local path, a URL, or a PR/MR. The workflow reads the source, identifies discrete operations, and produces a SKILL.md with broken-down workflows and terse recipe steps.

## Variables

Received from dispatcher:
- `SOURCE` — first non-flag argument: local path, URL, or free-text goal (may be empty)
- `SKILL_NAME` — value after `--name` (may be empty; derived from source if absent)
- `REMAINING_ARGS` — everything after SOURCE

## Step 0.5: Detect Source Type

```bash
SOURCE_TYPE=""   # path | url | pr | goal

# Detect PR/MR URL
if echo "$SOURCE" | grep -qE "(github\.com|gitlab\.com).*/pull/|/merge_requests/"; then
  SOURCE_TYPE="pr"
# Detect any URL
elif echo "$SOURCE" | grep -qE "^https?://"; then
  SOURCE_TYPE="url"
# Detect local path
elif [ -e "$SOURCE" ]; then
  SOURCE_TYPE="path"
# Treat as goal description
else
  SOURCE_TYPE="goal"
fi
```

## Step 1: Extract Source Content

**`path`** — read the local artifact:
- If a directory: glob for `*.md`, `*.ts`, `*.js`, `*.sh`, `*.py` (max depth 3); read each file; identify entry points (README, SKILL.md, main script, index)
- If a single file: read it in full
- Store raw content as `RAW_CONTENT`; note file structure

**`url`** — fetch and extract:
```bash
# Fetch with WebFetch
# Extract: page title, main headings, code blocks, command examples, CLI flags
# Strip navigation, ads, footer
```
Store extracted content as `RAW_CONTENT`.

**`pr`** — read the diff and context:
- GitHub: `gh pr view {number} --json title,body,headRefName,baseRefName,additions,deletions` and `gh pr diff {number}`
- GitLab: `glab mr view {iid} --output json` and `glab mr diff {iid}`
- Store PR title, description, and diff as `RAW_CONTENT`
- Note: the diff shows **what was built** — extract the pattern, not the one-off change

**`goal`** — no extraction needed; `RAW_CONTENT = SOURCE`

Report: `✓ Source loaded ({SOURCE_TYPE}): {one-line description}`

## Step 2: Identify Operations

Analyze `RAW_CONTENT` and extract a flat list of discrete operations the source performs or describes. An "operation" is one atomic thing the eventual skill will do.

Apply these rules:
- Each operation maps to one step in a workflow
- Name each operation with an imperative verb phrase: "fetch PR threads", "post inline comment", "watch CI run"
- Group related operations into workflows (a workflow is 2–6 operations with a shared goal)
- Discard operations that are one-off or context-specific — keep only the generalizable pattern
- Cap at 3 workflows; if more emerge, merge or drop the least useful

Store as `OPERATION_MAP`:
```
Workflow A: {name}
  - {operation 1}
  - {operation 2}
  ...

Workflow B: {name}
  - {operation 1}
  ...
```

## Step 3: Derive Skill Name

If `--name` provided: use it.
Otherwise: derive from source — URL domain, PR title slug, directory name, or first noun in goal. Lowercase, hyphens only, max 40 chars.

Store as `SKILL_NAME`.

## Step 4: Draft Workflows as Terse Recipes

For each workflow in `OPERATION_MAP`, write a terse recipe section. Recipe rules:

- **No prose.** Steps are instructions, not explanations.
- **Prefer direct narrow commands** — `gh`, `glab`, `git`, `jq`, `grep`, `sed`, `curl`. Not wrapper scripts.
- **One action per step.** If a step needs two commands, number them `a.` and `b.`.
- **Expose flags explicitly.** List the flags the step accepts; no hidden behavior.
- **Fail fast.** Every step that can fail should specify the exit condition and error message.
- **No "then" chains** — each step stands alone so an agent can execute it independently.

Format per workflow:
```
### {Workflow Name}

## Arguments
- `{arg}` — {type}, {required|optional}: {description}

## Steps

**Step 1: {imperative title}**
\```bash
{exact command}
\```
Exit if: {condition} → `✗ {message}`

**Step 2: {imperative title}**
\```bash
{exact command}
\```
```

## Step 5: Present Plan

Show the user:
```
📋 Skill plan: {SKILL_NAME}

Source: {SOURCE_TYPE} — {source summary}

Workflows ({N}):
  {workflow-a}: {verb1} → {verb2} → {verb3}
  {workflow-b}: {verb1} → {verb2}
  ...

Files to create:
  skills/{SKILL_NAME}/SKILL.md
  skills/{SKILL_NAME}/references/workflows/{workflow-a}.md
  skills/{SKILL_NAME}/references/workflows/{workflow-b}.md
  skills/{SKILL_NAME}/references/workflows/help.md
  [skills/{SKILL_NAME}/references/{template}.md  — if templates needed]
  skills/{SKILL_NAME}/LICENSE.md
```

Use **AskUserQuestion**:
```yaml
question: "Does this plan look right?"
header: "Plan review"
options:
  - label: "Create the skill"
    description: "Write all files now"
  - label: "Adjust"
    description: "Describe what to change in the Other field"
```

Loop until accepted.

## Step 6: Write Skill Files

Only after plan accepted.

**a. `skills/{SKILL_NAME}/SKILL.md`** — dispatcher following `references/skill-template.md`:
- Frontmatter: name, description (≤200 chars, includes trigger phrases), license MIT, compatibility
- Step 0: bash argument parsing
- Dispatch table (one case per workflow verb)
- Workflow Index (one line per workflow)

**b. `skills/{SKILL_NAME}/references/workflows/{verb}.md`** for each workflow — the terse recipe from Step 4, cleaned up.

**c. `skills/{SKILL_NAME}/references/workflows/help.md`** — command reference table.

**d. `skills/{SKILL_NAME}/LICENSE.md`** — MIT, copyright codevoyant contributors.

**e. Templates if needed** — if any workflow step writes a document, create a `references/{name}-template.md` defining its structure.

## Step 7: Validate

Run `/skill critique {SKILL_NAME}` and surface any issues.

Report: `✓ Skill {SKILL_NAME} created at skills/{SKILL_NAME}/`
