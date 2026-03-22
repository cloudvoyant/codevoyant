---
description: 'Promote a draft engineering plan from .codevoyant/plans/ to docs/engineering/plans/. Optionally syncs project, milestones, and issues to Linear. Triggers on: "em approve", "approve plan", "commit plan", "publish engineering plan", "promote em plan".'
name: em:approve
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline.'
argument-hint: '[plan-slug] [--push [project-url]] [--silent]'
disable-model-invocation: true
model: claude-opus-4-6
---

> **Compatibility**: AskUserQuestion falls back to numbered list on non-Claude-Code platforms.

## Skill Requirements

```bash
command -v npx >/dev/null 2>&1 || echo "MISSING: npx"
```

## Critical Rules

- Draft plans in `.codevoyant/plans/` remain after promotion — they are the working source of truth
- Linear sync is always optional and always last
- Never force-overwrite an existing committed plan directory without user confirmation
- Verify plan completeness before promoting — plan.md and at least one tasks/*.md must exist

## Step 0: Parse arguments

```bash
SLUG="${1:-}"
LINEAR_SYNC=false; LINEAR_URL=""; SILENT=false
if [[ "$*" =~ --push ]]; then
  LINEAR_SYNC=true
  # Capture optional URL immediately following --push
  if [[ "$*" =~ --push[[:space:]]+(https://linear\.app/[^[:space:]]+) ]]; then
    LINEAR_URL="${BASH_REMATCH[1]}"
  fi
fi
[[ "$*" =~ --silent ]] && SILENT=true
```

## Step 1: Locate draft plan

If SLUG provided: resolve to `.codevoyant/plans/{SLUG}/plan.md`.

If no SLUG, list directories in `.codevoyant/plans/` that contain a `plan.md` and were created by em-plan (check for `tasks/` subdirectory). Sort by modification time.

```
AskUserQuestion:
  question: "Which engineering plan do you want to approve?"
  header: "Draft plan"
  options:
    - label: "Most recently updated plan"
    - label: "I'll specify the slug below"
```

Read `plan.md`. Set PLAN_DIR = `.codevoyant/plans/{SLUG}` and PLAN_NAME = slug.

## Step 2: Validate completeness

Check:
```bash
test -s "$PLAN_DIR/plan.md"         && echo "✓ plan.md" || echo "✗ MISSING: plan.md"
ls "$PLAN_DIR/tasks/"*.md 2>/dev/null | head -1 && echo "✓ tasks/*.md" || echo "✗ MISSING: tasks files"
```

If any check fails: report the issue and stop. Do not promote an incomplete plan.

If complete: report "✓ Plan validated: plan.md + {N} task files found."

## Step 3: Confirm promotion

COMMIT_DIR = `docs/engineering/plans/{SLUG}`.

Check if COMMIT_DIR already exists. If it does:

```
AskUserQuestion:
  question: "A committed plan already exists at {COMMIT_DIR}. Overwrite?"
  header: "Overwrite?"
  options:
    - label: "Yes — overwrite"
    - label: "Save as new version (add -v2 suffix)"
    - label: "Cancel"
```

Otherwise ask for final confirmation:

```
AskUserQuestion:
  question: "Promote '{SLUG}' to {COMMIT_DIR}?"
  header: "Confirm promotion"
  options:
    - label: "Promote"
      description: "Copy plan to docs/engineering/plans/{SLUG}/"
    - label: "Cancel"
```

## Step 4: Promote

Create the target directory and copy:

```bash
mkdir -p "docs/engineering/plans/{SLUG}/tasks"
cp "$PLAN_DIR/plan.md" "docs/engineering/plans/{SLUG}/plan.md"
cp "$PLAN_DIR/tasks/"*.md "docs/engineering/plans/{SLUG}/tasks/" 2>/dev/null
# Do NOT copy research/ — that's working context, not a committed artifact
```

Update agent-kit status:
```bash
npx @codevoyant/agent-kit plans update-status --name "{SLUG}" --status Approved
```

Report: "Plan promoted to `{COMMIT_DIR}`."

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

If syncing, launch the linear-push-agent (see `agents/linear-push-agent.md`).

Pass: COMMIT_DIR, SLUG, PLAN_DIR, LINEAR_URL (empty string if creating new).

Wait for completion. Report sync results.

## Step 6: Notify

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify \
    --title "em:approve complete" \
    --message "Plan '{SLUG}' committed to {COMMIT_DIR}"
fi
```

Report: "Done. Plan is now at `{COMMIT_DIR}`."
