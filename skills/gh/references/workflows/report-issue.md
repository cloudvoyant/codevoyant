# gh: report-issue workflow

Create a GitHub issue from a bug report or QA report file.

## Step 1: Verify gh CLI

```bash
command -v gh >/dev/null || { echo "gh not installed"; exit 1; }
gh auth status >/dev/null || { echo "gh not authenticated"; exit 1; }
```

## Step 2: Parse Arguments

```
REPO          (optional) --repo owner/repo  (defaults to current repo remote)
TITLE         (optional) --title "..."       (will prompt if not given)
LABEL         (optional) --label bug
ASSIGNEE      (optional) --assignee @me
FROM          (optional) --from <path>       (path to a .codevoyant/qa/*/debug-report.md or smoke-report.md)
```

Parse `$REMAINING_ARGS` for the above flags. If `--repo` is not provided, default to the current repo detected via `gh repo view --json nameWithOwner -q .nameWithOwner`.

## Step 3: Collect Bug Report Details

**If `--from <path>` is provided:**

Read the report file at `<path>` and extract the following fields automatically:

- **Title** — from the report's title heading or `# Title:` line
- **Environment** — OS, runtime/browser version, relevant config
- **Steps to Reproduce** — numbered list
- **Expected Behavior**
- **Actual Behavior**
- **Severity** — Critical / High / Medium / Low

**If running interactively (no `--from`, no `--title`):**

Prompt the user for each field in order:
1. Title (one-line summary)
2. OS
3. Runtime / Browser and version
4. Version (app/package version)
5. Relevant config
6. Steps to reproduce (numbered)
7. Expected behavior
8. Actual behavior
9. Severity (Critical / High / Medium / Low)
10. Additional context (optional — logs, screenshots, links)

**If `--title` is provided but no `--from`:**

Use the provided title and prompt for all remaining fields.

## Step 4: Render Issue Body

Read the template at `references/templates/bug-report.md`. Substitute all `{placeholder}` fields with the collected values to produce `$BODY`.

## Step 5: Create Issue

```bash
gh issue create \
  --repo "${REPO}" \
  --title "${TITLE}" \
  --body "${BODY}" \
  --label "bug" \
  ${LABEL:+--label "$LABEL"} \
  ${ASSIGNEE:+--assignee "$ASSIGNEE"}
```

## Step 6: Report

```
✓ Issue created: {issue URL}
```

Print the URL returned by `gh issue create`.
