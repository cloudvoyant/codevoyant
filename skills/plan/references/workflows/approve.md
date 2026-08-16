# approve

## Critical Rules

- Draft plans in `.codevoyant/plan/` remain after promotion — they are the working source of truth
- Research artifacts from `.codevoyant/explore/{slug}/` and `.codevoyant/plan/{slug}/research/` are copied flat into the promoted plan's research directory
- Linear sync is always optional and always last
- Never force-overwrite an existing committed plan without user confirmation
- Verify plan completeness before promoting

## Step 0: Parse arguments

If SLUG provided: resolve to `.codevoyant/plan/{SLUG}/plan.md`.

If no SLUG, list directories in `.codevoyant/plan/` that contain a `plan.md`, sorted by modification time.

```
AskUserQuestion:
  question: "Which plan do you want to approve?"
  header: "Draft plan"
  options:
    - label: "Most recently updated plan"
    - label: "I'll specify the slug below"
```

Read `plan.md`. Set PLAN_DIR = `.codevoyant/plan/{SLUG}` and PLAN_NAME = slug.

## Step 1: Detect plan level

Determine the plan's level from its shape:

- **Task/architecture-level plan**: `plan.md` has a `## Task Breakdown` section and no `tasks/` milestone subdirectory.
- **Project/initiative/product-level plan**: `plan.md` has no `## Task Breakdown` section and/or has a `tasks/` milestone subdirectory (`design.md`, `develop.md`, `deploy.md`).

Set `PLAN_LEVEL = task | project`.

## Step 2: Validate completeness

```bash
test -s "$PLAN_DIR/plan.md"         && echo "✓ plan.md" || echo "✗ MISSING: plan.md"
```

For a `project` plan also check milestone files:

```bash
ls "$PLAN_DIR/tasks/"*.md 2>/dev/null | head -1 && echo "✓ tasks/*.md" || echo "✗ MISSING: tasks files"
```

If any check fails: report the issue and stop. Do not promote an incomplete plan.

If complete: report "✓ Plan validated."

## Step 3: Confirm promotion

- For a `task` plan: COMMIT_PATH = `docs/architecture/{SLUG}.md`.
- For a `project` plan: COMMIT_DIR = `docs/engineering/plans/{SLUG}`.

If the target already exists:

```
AskUserQuestion:
  question: "A committed plan already exists at {target}. Overwrite?"
  header: "Overwrite?"
  options:
    - label: "Yes — overwrite"
    - label: "Save as new version (add -v2 suffix)"
    - label: "Cancel"
```

Otherwise ask for final confirmation:

```
AskUserQuestion:
  question: "Promote '{SLUG}' to {target}?"
  header: "Confirm promotion"
  options:
    - label: "Promote"
    - label: "Cancel"
```

## Step 4: Promote

**If `PLAN_LEVEL = task`** (architecture doc):

```bash
mkdir -p docs/architecture/
cp "$PLAN_DIR/plan.md" "docs/architecture/{SLUG}.md"

# Copy all research artifacts flat into docs/architecture/research/
RESEARCH_DIR="$PLAN_DIR/research"
if [ -d "$RESEARCH_DIR" ] && [ "$(ls -A "$RESEARCH_DIR" 2>/dev/null)" ]; then
  mkdir -p "docs/architecture/research"
  cp "$RESEARCH_DIR/"*.md "docs/architecture/research/" 2>/dev/null
fi
```

Report: "Architecture doc promoted to `docs/architecture/{SLUG}.md`."

**If `PLAN_LEVEL = project`** (engineering plan):

```bash
mkdir -p "docs/engineering/plans/{SLUG}/tasks"
cp "$PLAN_DIR/plan.md" "docs/engineering/plans/{SLUG}/plan.md"
cp "$PLAN_DIR/tasks/"*.md "docs/engineering/plans/{SLUG}/tasks/" 2>/dev/null

# Copy all research artifacts flat into docs/engineering/plans/{SLUG}/research/
EXPLORE_DIR=".codevoyant/explore/{SLUG}"
RESEARCH_DIR="$PLAN_DIR/research"
if { [ -d "$EXPLORE_DIR" ] && [ "$(ls -A $EXPLORE_DIR 2>/dev/null)" ]; } || \
   { [ -d "$RESEARCH_DIR" ] && [ "$(ls -A $RESEARCH_DIR 2>/dev/null)" ]; }; then
  mkdir -p "docs/engineering/plans/{SLUG}/research"
  [ -d "$EXPLORE_DIR"  ] && cp "$EXPLORE_DIR/"*.md  "docs/engineering/plans/{SLUG}/research/" 2>/dev/null
  [ -d "$RESEARCH_DIR" ] && cp "$RESEARCH_DIR/"*.md "docs/engineering/plans/{SLUG}/research/" 2>/dev/null
fi
```

Report: "Plan promoted to `docs/engineering/plans/{SLUG}/`." Include research artifact count if any were copied.

Update plan status in `.codevoyant/README.md`:

```bash
sed -i '' "s/| {SLUG} | [A-Za-z]* |/| {SLUG} | Approved |/" .codevoyant/README.md
```

## Step 5: Linear sync (optional)

If `--push` flag not passed, ask:

```
AskUserQuestion:
  question: "Push this plan to Linear?"
  header: "Linear sync"
  options:
    - label: "Yes — create a new Linear project"
    - label: "Yes — use an existing project (I'll provide the URL)"
    - label: "No — skip Linear sync"
```

If "use an existing project", ask:

```
AskUserQuestion:
  question: "Paste the Linear project URL:"
  header: "Project URL"
  freeform: true
```

Set LINEAR_URL to the provided value.

If syncing, launch the matching agent:
- `PLAN_LEVEL = task` → **linear-tasks-agent** (see `agents/linear-tasks-agent.md`): creates Linear issues from the `## Task Breakdown`.
- `PLAN_LEVEL = project` → **linear-push-agent** (see `agents/linear-push-agent.md`): creates Linear projects + milestones.

Pass: PLAN_DIR, SLUG, LINEAR_URL (empty string if creating new), and the commit target (COMMIT_PATH for task plans, COMMIT_DIR for project plans).

Wait for completion. Report sync results.

## Step 6: Notify

If `SILENT` is not true, report completion to the user with a brief summary stating plan `{SLUG}` was committed to `{target}`.

Report: "Done. Plan is now at `{target}`."
