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

## Troubleshooting

If commands aren't showing up or updates aren't applying, reinstall:

```bash
npx skills add cloudvoyant/codevoyant
```

For anything else: [open an issue](https://github.com/cloudvoyant/codevoyant/issues).
