# approve

## Critical Rules

- Draft plans in `.codevoyant/plans/` remain after promotion — they are the working source of truth
- Linear sync is always optional and always last
- Never force-overwrite an existing doc without user confirmation
- Verify plan.md exists before promoting

## Step 1: Locate draft plan

If SLUG provided: resolve to `.codevoyant/plans/{SLUG}/plan.md`.

If no SLUG, list directories in `.codevoyant/plans/` created by dev-plan (contain a `plan.md` but no `tasks/` subdirectory, or have been registered with `--plugin dev`). Sort by modification time.

```
AskUserQuestion:
  question: "Which architecture plan do you want to approve?"
  header: "Draft plan"
  options:
    - label: "Most recently updated plan"
    - label: "I'll specify the slug"
```

Read `plan.md`. Set PLAN_DIR = `.codevoyant/plans/{SLUG}`.

## Step 2: Validate completeness

```bash
test -s "$PLAN_DIR/plan.md" && echo "✓ plan.md" || echo "✗ MISSING: plan.md"
```

If plan.md missing: report the issue and stop. Do not promote an incomplete plan.

If complete: report "✓ Plan validated."

## Step 3: Confirm promotion

COMMIT_PATH = `docs/architecture/{SLUG}.md`

Check if COMMIT_PATH already exists. If it does:

```
AskUserQuestion:
  question: "A doc already exists at {COMMIT_PATH}. Overwrite?"
  header: "Overwrite?"
  options:
    - label: "Yes — overwrite"
    - label: "Save as new version (add date suffix)"
    - label: "Cancel"
```

Otherwise ask for final confirmation:

```
AskUserQuestion:
  question: "Promote '{SLUG}' to {COMMIT_PATH}?"
  header: "Confirm promotion"
  options:
    - label: "Promote"
    - label: "Cancel"
```

## Step 4: Promote

```bash
mkdir -p docs/architecture/
cp "$PLAN_DIR/plan.md" "{COMMIT_PATH}"
```

Update agent-kit status:
```bash
npx @codevoyant/agent-kit plans update-status --name "{SLUG}" --status Approved
```

Report: "Architecture doc promoted to `{COMMIT_PATH}`."

## Step 5: Linear sync (optional)

If `--push` flag not passed, ask:

```
AskUserQuestion:
  question: "Push task breakdown to Linear?"
  header: "Linear sync"
  options:
    - label: "Yes — create tasks under a new Linear project"
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

If syncing, launch the linear-tasks-agent (see `agents/linear-tasks-agent.md`).

Pass: PLAN_DIR, COMMIT_PATH, SLUG, LINEAR_URL.

Wait for completion. Report sync results.

## Step 6: Notify

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify \
    --title "dev approve complete" \
    --message "Architecture doc promoted to {COMMIT_PATH}"
fi
```

Report: "Done. Architecture doc is now at `{COMMIT_PATH}`."
