# ci

Monitor CI/CD workflows after a push. Always runs in the background — you'll be notified when done.

## Flags

- `--autofix`: On failure, fix the reported errors and re-push (max 2 attempts)
- `--silent`: Suppress desktop notification

## Step 1: Detect CI Provider

Detect the CI provider by inspecting the git remote and project files:

```bash
REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null)
if [ -d ".github/workflows" ] || echo "$REMOTE_URL" | grep -q "github.com"; then
  PROVIDER="github"
elif [ -f ".gitlab-ci.yml" ] || echo "$REMOTE_URL" | grep -q "gitlab.com"; then
  PROVIDER="gitlab"
else
  PROVIDER="unknown"
fi
```

Store `PROVIDER` (github | gitlab | unknown) and `REMOTE_URL`.

If `PROVIDER` is `unknown`: inform the user "No CI provider could be detected. Only Github Actions and Gitlab CI are supported at this time." Exit.

## Step 2: Get Recent Runs

Get the current branch:

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
```

**GitHub Actions:**

```bash
gh run list --limit 10 --json status,conclusion,name,createdAt,databaseId,headBranch
```

**GitLab CI:**

```bash
glab ci list --per-page 10 --output json
```

Filter for runs on the current branch triggered within the last 10 minutes. If none found, inform user and exit.

## Step 3: Launch Background Monitor

```
Agent:
  subagent_type: general-purpose
  run_in_background: true
  description: 'CI: {branch} ({provider})'
  prompt: |
    Watch {provider} CI for branch {branch}. Run IDs: {run-ids}.

    GitHub: gh run watch <id> for each run, then gh run view <id> --json conclusion.
    GitLab: poll glab ci status until all jobs finish.

    On failure: fetch logs (gh run view <id> --log-failed / glab ci trace <job>).
    If AUTOFIX={AUTOFIX}: fix errors, commit, push --force-with-lease, re-monitor (max 2 attempts).

    When done, report completion to the user with a brief summary: branch checks status (all passed or which job failed). Skip the report if SILENT=true.
```

Report immediately:

```
⏳ Monitoring CI ({provider}) for branch '{branch}' in background.
```

## Step 4: Handle Results (in background agent)

**All passed:** report success with job names and durations.

**Failures:** show relevant log lines. If `--autofix`:

1. Identify root cause from logs
2. Fix affected files
3. `git commit --amend --no-edit` or `git commit -m "fix: address CI failures"`
4. `git push --force-with-lease origin <branch>`
5. Re-enter Step 2 — stop after 2 attempts

## Error Handling

- **CLI not installed:** detection in Step 1 returned `unknown` for `PROVIDER`
- **Not authenticated:** prompt to run `gh auth login` / `glab auth login`
- **Autofix loop guard:** stop after 2 attempts and report remaining errors
