---
description: "Use when checking CI/CD pipeline status after pushing. Triggers on: \"check CI\", \"monitor CI\", \"dev ci\", \"did CI pass\", \"watch pipeline\", \"CI status\". Runs in background by default and sends desktop notification when done. Supports --wait to block and --autofix to fix failures and re-push automatically."
argument-hint: "[--wait] [--autofix] [--silent]"
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


Monitor CI/CD workflows to ensure changes pass all checks.

## Purpose

After making changes and pushing code, verify that all CI/CD workflows complete successfully before declaring work "done". Supports both GitHub Actions and GitLab CI.

## Provider Detection

Auto-detect the CI provider from the remote URL:

```bash
REMOTE_URL=$(git remote get-url origin 2>/dev/null)

if echo "$REMOTE_URL" | grep -q "github"; then
  CI_PROVIDER="github"
elif echo "$REMOTE_URL" | grep -q "gitlab"; then
  CI_PROVIDER="gitlab"
else
  # Fallback: check which CLI is available
  if command -v gh >/dev/null 2>&1; then
    CI_PROVIDER="github"
  elif command -v glab >/dev/null 2>&1; then
    CI_PROVIDER="gitlab"
  else
    CI_PROVIDER="unknown"
  fi
fi
```

## Flags

- `--wait`: Block until CI completes (default: run in background)
- `--autofix`: After fetching failure logs, automatically attempt to fix the reported CI errors and re-push
- `--silent`: Suppress desktop notification on completion or failure

## Workflow

### Step 0: Parse Arguments

```bash
WAIT=false; AUTOFIX=false; SILENT=false
[[ "$*" =~ --wait ]]    && WAIT=true
[[ "$*" =~ --autofix ]] && AUTOFIX=true
[[ "$*" =~ --silent ]]  && SILENT=true
```

### Step 1: Get Workflow/Pipeline Runs

**GitHub Actions:**
```bash
gh run list --limit 10 --json status,conclusion,name,createdAt,databaseId,headBranch
```

**GitLab CI:**
```bash
glab ci list --per-page 10 --output json
```

Parse the output to identify:
- Which workflows/pipelines are running
- Which branch they're on
- Current status (queued, in_progress, completed / pending, running, success, failed)
- Conclusion

### Step 2: Identify Relevant Runs

Filter for workflows/pipelines that match:
- Current branch
- Recent timestamp (within last 10 minutes)
- Triggered by recent commits

If no relevant runs found, inform user and exit.

### Step 3: Monitor Progress

**If `--wait` flag is NOT set (default — background):**

Launch a background Task to poll until completion:

```
TaskCreate:
  subagent_type: general-purpose
  run_in_background: true
  description: "CI monitoring: {branch} ({provider})"
  prompt: |
    Poll {provider} CI for branch {branch} until all runs complete.
    Run IDs: {run-ids}.
    If --autofix: apply fixes, push, re-monitor (max 2 attempts).
    Report final pass/fail status.

    When monitoring is complete, unless SILENT={SILENT}, send a desktop notification:
    ```bash
    if [ "{SILENT}" != "true" ]; then
      npx @codevoyant/agent-kit notify --title "Claude Code — CI" --message "{branch}: all CI checks passed"
      # On failure: npx @codevoyant/agent-kit notify --title "Claude Code — CI" --message "CI failed: {job-name}"
    fi
    ```
```

Report immediately:

```
⏳ CI monitoring started in background for branch '{branch}'.
   You'll receive a desktop notification when checks complete. (Use --silent to suppress.)
```

Then exit — do not wait.

**If `--wait` flag IS set:**

Use blocking behavior — poll until all runs complete and display real-time progress:

**GitHub Actions:**
```bash
# For each relevant run not yet completed:
gh run watch <run-id>

# Or poll status:
gh run view <run-id> --json status,conclusion,name
```

**GitLab CI:**
```bash
# Watch pipeline until completion:
glab ci status --pipeline-id <pipeline-id>
# or stream job logs:
glab ci trace <job-name>
```

Display progress to user:
```
🔄 Monitoring CI (GitHub Actions | GitLab CI):
  ✓ Build (completed - success)
  ⏳ Tests (in_progress)
  ⏳ Lint (queued)
```

### Step 4: Handle Results

> This step applies when `--wait` is set, or when the background Task from Step 3 completes.

**All checks passed:**
```
✅ All CI checks passed!
  ✓ Build - success
  ✓ Tests - success
  ✓ Lint - success

Changes are verified and ready.
```

**Some checks failed — fetch logs:**

GitHub:
```bash
gh run view <run-id> --log-failed
```

GitLab:
```bash
glab ci trace <failed-job-name>
```

Show relevant error output.

**If `--autofix` flag is set:**

1. Analyze the failure logs to identify the root cause
2. Apply fixes to the affected files (lint errors, test failures, type errors, etc.)
3. Stage changes: `git add -A`
4. Amend the last commit (or create a new fix commit if amend is not appropriate):
   ```bash
   git commit --amend --no-edit
   # or
   git commit -m "fix: address CI failures"
   ```
5. Push: `git push --force-with-lease origin <branch>` (or regular push if on main)
6. Re-enter Step 1 to monitor the new run
7. If fixes fail after 2 attempts: report the remaining errors and stop — do not loop indefinitely

**If `--autofix` is NOT set:**
Show relevant error output to user and offer to help fix issues.

**Workflows cancelled/skipped:**
Report status and ask user if they want to re-run or investigate.

### Step 5: Summary

> This step applies when `--wait` is set, or when the background Task from Step 3 completes.

Provide clear summary:
- Total workflows/jobs checked
- Pass/fail count
- Time taken
- Next steps if failures occurred

## Error Handling

- **No CLI installed:**
  - GitHub: `gh auth status` fails → inform user to install GitHub CLI or run `gh auth login`
  - GitLab: `glab` not found → inform user to install GitLab CLI or run `glab auth login`
- **Not authenticated:** Prompt to authenticate
- **Not a git repo:** Inform user this only works in git repositories
- **No remote:** Inform user repo must have a remote configured
- **No workflows/pipelines found:** Check if CI is configured for this repo
- **API rate limits:** Handle gracefully and inform user
- **Autofix loop guard:** Stop after 2 fix attempts — failures not resolved in two automated passes likely need human judgment, and looping further just creates a noisy commit history

## Example Usage

### After pushing changes:
```
User: /dev:ci
```

Output:
```
🔍 Checking CI (GitHub Actions) for branch 'main'...

Found 3 workflow runs:
  • Build (#1234) - in_progress
  • Tests (#1235) - queued
  • Lint (#1236) - queued

⏳ Waiting for workflows to complete...

[1m 30s] Build completed - ✓ success
[2m 15s] Tests completed - ✓ success
[2m 45s] Lint completed - ✓ success

✅ All CI checks passed! (took 2m 45s)
```

### When failures occur with --autofix:
```
❌ Tests workflow failed

Error logs:
===================================
FAIL src/components/Button.test.tsx
  ● Button › renders correctly

    Expected: "Click me"
    Received: "Clck me"
===================================

🔧 Autofixing: correcting typo in Button component...
✓ Fix applied — amending commit and pushing...
⏳ Re-monitoring CI...
✅ All CI checks passed after autofix!
```

