# Installation

```bash
npx skills add cloudvoyant/codevoyant
```

Works with Claude Code, OpenCode, VS Code Copilot, and any other agent that supports the [Agent Skills](https://github.com/vercel-labs/skills) format.

## Compatibility

Skills are designed to work across agents. Where platform-specific features aren't available, they degrade gracefully:

- **Subagents** (`Task` tool) — used for background execution and parallel work. Falls back to sequential inline execution on agents that don't support spawning subagents.
- **`AskUserQuestion`** — interactive prompts fall back to numbered lists.
- **`context: fork`** — Claude Code-specific agent forking; ignored on other platforms, skill runs inline.

### Command arguments (OpenCode vs Claude Code)

Claude Code passes the text after a slash command inline into the skill invocation, so `/spec new my-feature` reaches the `spec` dispatcher as `new my-feature`. OpenCode is different: its `skill` tool accepts only a name, so arguments typed after the command are dropped. Dispatcher skills follow the cross-agent contract in `skills/shared/arg-handling.md`: when no verb is parseable, the skill asks the user what they want instead of silently running help. If args are dropped on your opencode build, upgrade opencode — the skill will still prompt you rather than ignore the command.

## Updating

Re-run the install command to get the latest version:

```bash
npx skills add cloudvoyant/codevoyant
```

To pin a specific version:

```bash
npx skills add cloudvoyant/codevoyant@v1.31.0
```

## Local development

```bash
npx skills add /path/to/codevoyant
```

## Permissions

Skills load reference files (recipes, workflow guides) at runtime. To avoid being prompted on every read, add the skills directory to your allowed paths.

**User-wide** (`~/.claude/settings.json`):

```json
{
  "permissions": {
    "allow": ["Read(~/.claude/skills/**)"]
  }
}
```

**Project-only** (`.claude/settings.json` in your project root) — same format.

## Troubleshooting

If commands aren't showing up or updates aren't applying, reinstall:

```bash
npx skills add cloudvoyant/codevoyant
```

For anything else: [open an issue](https://github.com/cloudvoyant/codevoyant/issues).
