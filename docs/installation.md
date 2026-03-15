# Installation

## Claude Code

Install from the marketplace:

```bash
/plugin marketplace add codevoyant/codevoyant

/plugin install spec
/plugin install dev
/plugin install style
```

For local development or testing:

```bash
/plugin marketplace add /path/to/codevoyant
/plugin install spec  # etc.
```

## OpenCode

Skills install globally to `~/.config/opencode/skills/`:

```bash
curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-opencode.sh | bash
```

Single plugin:

```bash
curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-opencode.sh | bash -s spec
```

Uninstall:

```bash
curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-opencode.sh | bash -s -- --uninstall
```

> **Note:** If codevoyant is already installed for Claude Code, OpenCode picks up skills from `.claude/skills/` automatically.

## VS Code Copilot

Skills install globally to `~/.copilot/skills/`:

```bash
curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-vscode.sh | bash
```

Single plugin:

```bash
curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-vscode.sh | bash -s spec
```

Uninstall:

```bash
curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-vscode.sh | bash -s -- --uninstall
```

Restart VS Code or reload the Copilot extension after installing.

## Versions

Plugins follow semantic versioning. To check what's installed:

```bash
/plugin list
```

To update:

```bash
/plugin marketplace update codevoyant/codevoyant
```

To install a specific version:

```bash
/plugin marketplace add codevoyant/codevoyant@v1.0.3
/plugin install spec
```

## Troubleshooting

**Commands not showing up:**

```bash
/plugin list                  # verify installation
/plugin marketplace list      # check marketplace
/plugin uninstall spec
/plugin install spec          # reinstall
```

**Updates not applying:**

```bash
/plugin marketplace update codevoyant/codevoyant
/plugin uninstall spec
/plugin install spec
```

For anything else: [open an issue](https://github.com/codevoyant/codevoyant/issues).
