<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/mem.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# Mem

Team knowledge capture and recall — structured markdown docs with frontmatter, indexed for fast lookup.

> **Note:** The `/mem *` slash commands have been removed. All mem functionality is available via the `npx @codevoyant/agent-kit mem` CLI, which works without installation.

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
- **`styleguide`** — conventions, rules, and standards the team follows
- **`recipe`** — how-to guides and procedures

The `status` field controls indexing:
- **`active`** (default) — included in the index
- **`draft`** — included in the index
- **`archived`** — excluded from the index

Files can live anywhere in the project root. The indexer scans all `.md` files (excluding `node_modules/`, `.codevoyant/`, and `.git/`) and writes `.codevoyant/mem.json`.

## CLI Reference

All commands work without installing:

```bash
npx @codevoyant/agent-kit mem index                     # Scan all .md files, rebuild mem.json
npx @codevoyant/agent-kit mem list                      # Terse table for LLM context
npx @codevoyant/agent-kit mem find --tag <tag>          # Search by tag
npx @codevoyant/agent-kit mem find --type <type>        # Search by type
npx @codevoyant/agent-kit mem find --tag <t> --json     # Full JSON output
```

### Session start

Add this to your `CLAUDE.md` to load knowledge automatically at session start:

```bash
npx @codevoyant/agent-kit mem list
```
