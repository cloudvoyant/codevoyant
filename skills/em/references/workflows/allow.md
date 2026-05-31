# allow

Pre-approve em plugin permissions so agents run without prompts.

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

Scan the em skill's workflow files (`skills/em/references/workflows/*.md`) for bash commands used during execution. Map each to a Claude Code allow entry using the narrowest command prefix that covers actual usage. Typical em entries include:

- `Bash(git status:*)`, `Bash(git log:*)`, `Bash(git diff:*)`, `Bash(git rev-parse:*)`
- `Bash(grep:*)`, `Bash(sed:*)`, `Bash(printf:*)`
- `mcp__linear-server__*` (for Linear sync)
- `WebFetch`, `WebSearch`

Do NOT include the standard baseline (Write, Edit, Read, Glob, Grep, Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(find:*), Bash(echo:*), Bash(date:*), Bash(jq:*), Bash(bash:*), Bash(cp:*), Bash(mv:*)).

Store the resulting list as `EM_ALLOW`.

## Step 3: Merge into settings.json

Read the existing settings (or start from `{}` if absent), union `EM_ALLOW` into `.permissions.allow` (deduplicate, sort), and write the file back. Use the Edit tool or `jq` for the merge.

## Step 4: Report

```
✓ em permissions applied to $SETTINGS_FILE. /em plan can now run without interruption.
```
