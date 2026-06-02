# ci

Watch GitLab CI for the current branch. Always runs in the background — you'll be notified when done.

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

## Step 2: Verify `glab` CLI

```bash
command -v glab >/dev/null 2>&1 || {
  echo "GitLab CLI (glab) is not installed. Run: brew install glab"
  exit 1
}
glab auth status >/dev/null 2>&1 || {
  echo "GitLab CLI not authenticated. Run: glab auth login"
  exit 1
}
```

## Step 3: List Recent Pipelines

```bash
glab ci list --per-page 10 --ref "$BRANCH" --output json
```

Filter for pipelines on `$BRANCH` created within the last 10 minutes. If none found, report:

```
No recent pipelines for branch '{branch}'. Has the latest commit been pushed?
```

and exit.

## Step 4: Launch Background Monitor

```
Agent:
  subagent_type: general-purpose
  run_in_background: true
  description: 'glab ci: {branch}'
  prompt: |
    Watch GitLab CI for branch {branch}. Pipeline IDs: {pipeline-ids}.

    Poll `glab ci status --ref {branch}` until all jobs finish.

    On failure: fetch logs via `glab ci trace <job-id>` and report relevant lines.
    If AUTOFIX={AUTOFIX}: identify root cause, fix files, `git commit -m "fix: address CI failures"`, `git push --force-with-lease origin {branch}`, re-watch. Max 2 attempts.

    When done, report completion with a brief summary (passed or which job failed). Skip the report if SILENT=true.
```

Report immediately:

```
⏳ Monitoring GitLab CI for branch '{branch}' in background.
```

## Step 5: Handle Results (in background agent)

- **All passed:** report success with job names and durations.
- **Failures:** show relevant log lines. If `--autofix`, run the fix loop (max 2 attempts).

## Error Handling

- **glab not installed / not authenticated:** caught in Step 2
- **Autofix loop guard:** stop after 2 attempts and report remaining errors
