# allow

Pre-approve spec plugin permissions so background agents run without prompts.

## Variables

- `GLOBAL` — true if `--global` present (write to `~/.claude/settings.json` instead of project-level `.claude/settings.json`)

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

Scan the spec skill's workflow files (`skills/spec/references/workflows/*.md` and `skills/spec/agents/*.md`) for bash commands used during execution. Map each to a Claude Code allow entry using the narrowest command prefix that covers actual usage. Typical spec entries include:

- `Bash(git worktree add:*)`, `Bash(git rev-parse:*)`, `Bash(git status:*)`, `Bash(git log:*)`, `Bash(git diff:*)`
- `Bash(grep:*)`, `Bash(sed:*)`, `Bash(printf:*)`
- `Bash(mise run:*)` and any task runner recipes detected in the project (e.g. `Bash(just test:*)`, `Bash(make build:*)`)
- `WebFetch`, `WebSearch`

Do NOT include the standard baseline (Write, Edit, Read, Glob, Grep, Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(find:*), Bash(echo:*), Bash(date:*), Bash(jq:*), Bash(bash:*), Bash(cp:*), Bash(mv:*)).

Store the resulting list as `SPEC_ALLOW`.

## Step 3: Merge into settings.json

Read the existing settings (or start from `{}` if absent):

```bash
if [ -f "$SETTINGS_FILE" ]; then
  CURRENT=$(cat "$SETTINGS_FILE")
else
  CURRENT="{}"
fi
```

Using the Edit tool (or jq), union `SPEC_ALLOW` into `.permissions.allow` (deduplicate, sort), then write the file back.

## Step 4: Report

```
✓ spec permissions applied to $SETTINGS_FILE. /spec bg and /spec go can now run without interruption.
```
