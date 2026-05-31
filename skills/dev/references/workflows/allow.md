# allow

Pre-approve dev plugin permissions so agents run without prompts.

## Flags

- `--global`: write to global config (`~/.claude/settings.json`) instead of project-level (`.claude/settings.json`)

## Step 1: Determine target settings file

```bash
if [ "$GLOBAL" = "true" ]; then
  SETTINGS_FILE="$HOME/.claude/settings.json"
else
  SETTINGS_FILE=".claude/settings.json"
fi
mkdir -p "$(dirname "$SETTINGS_FILE")"
```

## Step 2: Compute required allow entries

Scan the dev skill's workflow files (`skills/dev/references/workflows/*.md`) for bash commands used during execution. Map each to a Claude Code allow entry using the narrowest command prefix that covers actual usage. Typical dev entries include:

- `Bash(git commit:*)`, `Bash(git push:*)`, `Bash(git status:*)`, `Bash(git log:*)`, `Bash(git diff:*)`, `Bash(git rev-parse:*)`
- `Bash(gh pr:*)`, `Bash(gh issue:*)`, `Bash(glab mr:*)`, `Bash(glab issue:*)`
- `Bash(grep:*)`, `Bash(sed:*)`, `Bash(printf:*)`
- `WebFetch`, `WebSearch`

Do NOT include the standard baseline (Write, Edit, Read, Glob, Grep, Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(find:*), Bash(echo:*), Bash(date:*), Bash(jq:*), Bash(bash:*), Bash(cp:*), Bash(mv:*)).

Store the resulting list as `DEV_ALLOW`.

## Step 3: Merge into settings.json

Read the existing settings (or start from `{}` if absent), union `DEV_ALLOW` into `.permissions.allow` (deduplicate, sort), and write the file back. Use the Edit tool or `jq` for the merge.

## Step 4: Report

```
✓ dev permissions applied to $SETTINGS_FILE. /git commit and /git ci can now run without interruption.
```
