# ci

Watch GitHub Actions CI for the current branch. Always runs in the background — you'll be notified when done.

## Arguments

- `--branch <name>` — watch a specific branch (default: current)
- `--autofix` — on failure, fix the reported errors and re-push (max 2 attempts)
- `--silent` — suppress completion notification

## Step 1: Parse Flags & Resolve Branch

```bash
BRANCH=""
AUTOFIX=false
SILENT=false

while [ $# -gt 0 ]; do
  case "$1" in
    --branch) BRANCH="$2"; shift 2 ;;
    --autofix) AUTOFIX=true; shift ;;
    --silent) SILENT=true; shift ;;
    *) shift ;;
  esac
done

if [ -z "$BRANCH" ]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
fi
```

## Step 2: Verify `gh` CLI

```bash
command -v gh >/dev/null 2>&1 || {
  echo "GitHub CLI (gh) is not installed. Run: brew install gh"
  exit 1
}
gh auth status >/dev/null 2>&1 || {
  echo "GitHub CLI not authenticated. Run: gh auth login"
  exit 1
}
```

## Step 3: List Recent Runs

```bash
gh run list --limit 10 --branch "$BRANCH" --json status,conclusion,name,createdAt,databaseId,headBranch
```

Filter for runs on `$BRANCH` triggered within the last 10 minutes. If none found, report:

```
No recent runs for branch '{branch}'. Has the latest commit been pushed?
```

and exit.

## Step 4: Launch Background Monitor

```
Agent:
  subagent_type: general-purpose
  run_in_background: true
  description: 'gh ci: {branch}'
  prompt: |
    Watch GitHub Actions for branch {branch}. Run IDs: {run-ids}.

    For each run: `gh run watch <id>` then `gh run view <id> --json conclusion`.

    On failure: `gh run view <id> --log-failed` and report relevant lines.
    If AUTOFIX={AUTOFIX}: identify root cause, fix files, `git commit -m "fix: address CI failures"`, `git push --force-with-lease origin {branch}`, re-watch. Max 2 attempts.

    When done, report completion with a brief summary (passed or which job failed). Skip the report if SILENT=true.
```

Report immediately:

```
⏳ Monitoring GitHub Actions for branch '{branch}' in background.
```

## Step 5: Handle Results (in background agent)

- **All passed:** report success with job names and durations.
- **Failures:** show relevant log lines. If `--autofix`, run the fix loop (max 2 attempts).

## Error Handling

- **gh not installed / not authenticated:** caught in Step 2
- **Autofix loop guard:** stop after 2 attempts and report remaining errors
