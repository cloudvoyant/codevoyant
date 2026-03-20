---
description: 'Use when checking CI/CD pipeline status after pushing. Triggers on: "check CI", "monitor CI", "dev ci", "did CI pass", "watch pipeline", "CI status". Runs in background and sends a desktop notification when done.'
argument-hint: '[--autofix] [--silent]'
---

Monitor CI/CD workflows after a push. Always runs in the background — you'll be notified when done.

## Flags

- `--autofix`: On failure, fix the reported errors and re-push (max 2 attempts)
- `--silent`: Suppress desktop notification

## Step 0: Parse Arguments

```bash
AUTOFIX=false; SILENT=false
[[ "$*" =~ --autofix ]] && AUTOFIX=true
[[ "$*" =~ --silent  ]] && SILENT=true
```

## Step 1: Detect CI Provider

```bash
npx @codevoyant/agent-kit ci detect
```

Store `provider` (github | gitlab | unknown) and `remote` from the JSON output.

If `provider` is `unknown`: inform the user "No CI provider could be detected. Only Github Actions and Gitlab CI are supported at this time." Exit.

## Step 2: Get Recent Runs

Get the current branch: `npx @codevoyant/agent-kit git branch`

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
TaskCreate:
  subagent_type: general-purpose
  run_in_background: true
  description: 'CI: {branch} ({provider})'
  prompt: |
    Watch {provider} CI for branch {branch}. Run IDs: {run-ids}.

    GitHub: gh run watch <id> for each run, then gh run view <id> --json conclusion.
    GitLab: poll glab ci status until all jobs finish.

    On failure: fetch logs (gh run view <id> --log-failed / glab ci trace <job>).
    If AUTOFIX={AUTOFIX}: fix errors, commit, push --force-with-lease, re-monitor (max 2 attempts).

    When done:
    npx @codevoyant/agent-kit notify \
      --title "Claude Code — CI" \
      --message "{branch}: all checks passed | CI failed: {job}" \
      {if SILENT: --silent}
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

- **CLI not installed:** `gh auth status` / `glab --version` fails → tell user to install and authenticate
- **Not authenticated:** prompt to run `gh auth login` / `glab auth login`
- **Autofix loop guard:** stop after 2 attempts and report remaining errors
