<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/mem.png')" width="64" height="64" style="margin-bottom: 1rem" />

# Memory Plugin

Team knowledge capture and recall -- structured markdown docs with frontmatter, indexed for fast lookup.

The memory plugin lets you capture team conventions, decisions, and how-to guides as markdown files with structured frontmatter. Knowledge is indexed into `.codevoyant/mem.json` and can be loaded into AI context at session start, searched by type or tag, or recalled conversationally.

All functionality also works **without the plugin** via `npx @codevoyant/agent-kit mem <command>`.

## Installation

**Claude Code:**
```bash
/plugin marketplace add cloudvoyant/codevoyant
/plugin install mem
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflows

### First-time setup

```bash
/mem:init                    # Writes CLAUDE.md session-start section
                             # Optionally adds Claude Code hook for auto-loading
```

This is a one-time bootstrap. After running `mem:init`, team knowledge loads automatically at the start of every session.

### Capture knowledge as you go

```bash
/mem:learn always use pnpm, never npm     # Captures as a styleguide doc
/mem:learn how to deploy to staging       # Captures as a recipe doc
```

The agent infers the type (`styleguide` or `recipe`) and tags from your message, writes a `.md` file with frontmatter, and re-indexes automatically.

### Load knowledge at session start

```bash
/mem:remember               # Prints terse table of all indexed knowledge
```

This is meant to run at the start of every session (automatically if you used `mem:init`). It loads all indexed knowledge into the AI's context so it can reference team conventions throughout the session.

### Search for specific knowledge

```bash
/mem:find --tag deployment         # Find docs tagged "deployment"
/mem:find --type recipe            # Find all recipes
/mem:find --tag api --type recipe  # AND logic: recipes tagged "api"
/mem:find --json                   # Full JSON output
```

### Re-index after manual edits

```bash
/mem:index                  # Scan all .md files, rebuild mem.json
```

Run this after editing knowledge docs outside of `/mem:learn`.

## How It Works

Knowledge docs are regular markdown files with YAML frontmatter:

```yaml
---
type: styleguide
tags: [tooling, package-manager]
description: Always use pnpm, never npm or yarn
status: active
---
```

The `type` field categorizes the knowledge:
- **`styleguide`** -- conventions, rules, and standards the team follows
- **`recipe`** -- how-to guides and procedures

The `status` field controls indexing:
- **`active`** (default) -- included in the index
- **`draft`** -- included in the index
- **`archived`** -- excluded from the index

Files can live anywhere in the project root. The indexer scans all `.md` files (excluding `node_modules/`, `.codevoyant/`, `docs/`, and `.git/`) and writes `.codevoyant/mem.json`.

## Skills

| Skill | Description |
|---|---|
| `mem:init` | One-time project bootstrap: writes CLAUDE.md session-start section, optionally adds Claude Code hook |
| `mem:learn` | Capture team knowledge (learn mode) or recall existing knowledge (recall mode) |
| `mem:remember` | Session-start bulk dump: loads all indexed team knowledge into context |
| `mem:index` | Re-index project knowledge docs after manual edits |
| `mem:find` | Search indexed project knowledge docs by type and/or tag |
| `mem:help` | List all mem commands |

## CLI Equivalents

All commands work without the plugin installed:

```bash
npx @codevoyant/agent-kit mem index                     # Index all .md files
npx @codevoyant/agent-kit mem find --tag <tag>          # Search by tag
npx @codevoyant/agent-kit mem find --type <type>        # Search by type
npx @codevoyant/agent-kit mem find --tag <t> --json     # Full JSON output
npx @codevoyant/agent-kit mem remember                  # Terse table for LLM context
```
