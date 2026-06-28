# allow

Pre-approve ux plugin permissions so agents run without prompts.

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

Scan the ux skill's workflow files (`skills/ux/references/workflows/*.md`) for bash commands used during execution. Map each to a Claude Code allow entry using the narrowest command prefix that covers actual usage. Typical ux entries include:

- `Bash(pnpm:*)`, `Bash(npm:*)`, `Bash(pnpm run dev:*)`
- `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git rev-parse:*)`
- `Bash(grep:*)`, `Bash(sed:*)`, `Bash(printf:*)`
- `mcp__pencil__*` (for design generation)
- `WebFetch`, `WebSearch`

Do NOT include the standard baseline (Write, Edit, Read, Glob, Grep, Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(find:*), Bash(echo:*), Bash(date:*), Bash(jq:*), Bash(bash:*), Bash(cp:*), Bash(mv:*)).

**Always include the skill-reference Read baseline.** Skill workflow/reference files live outside the project working directory, so reads prompt every session. Add these portable glob rules (gitignore-style, no hardcoded usernames) to the allow set so skill reference reads never prompt:

- `Read(~/.claude/skills/**)`
- `Read(~/.claude/plugins/**/skills/**)`
- `Read(.claude/skills/**)`

Store these as `SKILL_READ_BASELINE` and union them into the allow set alongside `UX_ALLOW`.

Store the resulting list as `UX_ALLOW`.

## Step 3: Merge into settings.json

Read the existing settings (or start from `{}` if absent), union `UX_ALLOW` and `SKILL_READ_BASELINE` into `.permissions.allow` (deduplicate, sort), and write the file back. Use the Edit tool or `jq` for the merge.

## Step 4: Report

```
✓ ux permissions applied to $SETTINGS_FILE. /ux style-synthesize can now run without interruption.
```
