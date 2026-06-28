# allow

Pre-approve pm plugin permissions so agents run without prompts.

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

Scan the pm skill's workflow files (`skills/pm/references/workflows/*.md`) for bash commands used during execution. Map each to a Claude Code allow entry using the narrowest command prefix that covers actual usage. Typical pm entries include:

- `Bash(git status:*)`, `Bash(git log:*)`, `Bash(git diff:*)`, `Bash(git rev-parse:*)`
- `Bash(grep:*)`, `Bash(sed:*)`, `Bash(printf:*)`
- `mcp__linear-server__*` (for Linear sync)
- `mcp__claude_ai_Notion__notion-fetch`
- `WebFetch`, `WebSearch`

Do NOT include the standard baseline (Write, Edit, Read, Glob, Grep, Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(find:*), Bash(echo:*), Bash(date:*), Bash(jq:*), Bash(bash:*), Bash(cp:*), Bash(mv:*)).

**Always include the skill-reference Read baseline.** Skill workflow/reference files live outside the project working directory, so reads prompt every session. Add these portable glob rules (gitignore-style, no hardcoded usernames) to the allow set so skill reference reads never prompt:

- `Read(~/.claude/skills/**)`
- `Read(~/.claude/plugins/**/skills/**)`
- `Read(.claude/skills/**)`

Store these as `SKILL_READ_BASELINE` and union them into the allow set alongside `PM_ALLOW`.

Store the resulting list as `PM_ALLOW`.

## Step 3: Merge into settings.json

Read the existing settings (or start from `{}` if absent), union `PM_ALLOW` and `SKILL_READ_BASELINE` into `.permissions.allow` (deduplicate, sort), and write the file back. Use the Edit tool or `jq` for the merge.

## Step 4: Report

```
✓ pm permissions applied to $SETTINGS_FILE. /pm plan and /pm prd can now run without interruption.
```
