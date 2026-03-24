# allow

Pre-approve spec plugin permissions so background agents run without prompts.

## Variables

- `GLOBAL` — true if `--global` present (write to `~/.claude/settings.json` instead of project-level)

## Step 1: Apply

```bash
npx @codevoyant/agent-kit perms add --plugins spec [--global]
```

Agent-kit detects the running agent (Claude Code, OpenCode, VS Code Copilot) and writes the right config automatically.

## Step 2: Report

Show the JSON output, then:

```
✓ spec permissions applied. /spec bg and /spec go can now run without interruption.
```
