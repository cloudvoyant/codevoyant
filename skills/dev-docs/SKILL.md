---
description: "Use when generating or updating architecture documentation from codebase. Triggers on: \"dev docs\", \"generate architecture docs\", \"document architecture\", \"codebase documentation\", \"architecture diagram\". Produces component map, data flow diagrams, API inventory, and dependency graph in docs/architecture/."
name: dev:docs
license: MIT
compatibility: "Designed for Claude Code. On OpenCode and VS Code Copilot, context: fork runs inline using the current model. Core functionality preserved on all platforms."
argument-hint: "[--bg] [--silent]"
disable-model-invocation: true
model: claude-sonnet-4-6
---

> **Compatibility**: The `context: fork` frontmatter field is Claude Code-specific — on OpenCode and VS Code Copilot it is ignored and the skill runs inline using the current model. Core functionality is preserved on all platforms.

Generate architecture documentation from a codebase scan. Writes to `docs/architecture/`.

## Step 0: Parse Flags

Extract flags from the argument string:

```
BG      = true if --bg present
SILENT  = true if --silent present
OUT_DIR = docs/architecture/
```

Create the output directory if it does not exist:

```bash
mkdir -p docs/architecture/
```

## Step 1: Parallel Codebase Scan

Launch four background agents to scan the codebase in parallel.

### Agent A -- Component Map

```yaml
model: claude-haiku-4-5-20251001
run_in_background: true
```

**Instructions for Agent A:**

Glob the repo for top-level directories, key entry points, plugin/package boundaries. Identify major subsystems and what each owns. For each component, note:
- Directory path
- Purpose (1 sentence)
- Key files / entry points
- What it exports or exposes to other components

Use `Glob` and `Read` to inspect the codebase structure. Focus on directories like `plugins/`, `docs/`, `scripts/`, `src/`, `lib/`, and any package/module boundaries. Return a structured list of components.

### Agent B -- Data Flows

```yaml
model: claude-haiku-4-5-20251001
run_in_background: true
```

**Instructions for Agent B:**

Trace how data moves between components -- API calls, file writes, event emissions. Focus on boundaries (what crosses from one component to another). Look for:
- Inter-plugin invocations (one skill calling another)
- File I/O patterns (which components read/write which directories)
- Script invocations across plugin boundaries
- Any HTTP/API calls between components

Use `Grep` and `Read` to find cross-boundary references. Return a list of data flows with source, destination, and mechanism.

### Agent C -- API Inventory

```yaml
model: claude-haiku-4-5-20251001
run_in_background: true
```

**Instructions for Agent C:**

Find all public interfaces -- HTTP routes, exported functions, CLI commands, skill invocation points. List with signatures. Specifically:
- All skill SKILL.md files (these are the primary public interface)
- Any exported scripts in `scripts/` directories
- CLI entry points
- Configuration schemas (plugin.json files)

Use `Glob` to find all SKILL.md and plugin.json files, then `Read` key ones. Return a table of interfaces with name, type, location, and brief description.

### Agent D -- Dependency Graph

```yaml
model: claude-haiku-4-5-20251001
run_in_background: true
```

**Instructions for Agent D:**

Parse package.json, pyproject.toml, go.mod, or similar files for external dependencies. Also map inter-plugin dependencies in this repo:
- Which plugins reference scripts from other plugins
- Which skills invoke other skills
- Shared utilities and who uses them

Use `Glob` to find dependency manifests and `Grep` to find cross-references between plugins. Return external dependencies and an internal dependency map.

---

Wait for all four agents to complete. Collect their results.

## Step 2: Generate Documentation Files

Using the combined results from all four agents, generate the following files:

### `docs/architecture/README.md`

Overview document:
- What the system is (1-2 paragraphs)
- Major components at a glance (bulleted list)
- How to navigate these docs (links to other files)

### `docs/architecture/components.md`

Component map:
- ASCII diagram showing subsystem boundaries and ownership
- For each component: path, purpose, key files, what it owns
- Group by layer (plugins, docs, config, scripts)

### `docs/architecture/data-flows.md`

Data flow documentation:
- Key data flows as ASCII sequence or flow diagrams
- Cross-boundary interactions
- File I/O patterns
- Focus on the most important 5-10 flows

### `docs/architecture/api-inventory.md`

API inventory table:
- All public interfaces (skills, scripts, CLI commands)
- Columns: Name, Type, Location, Description
- Grouped by plugin

### `docs/architecture/dependencies.md`

Dependency documentation:
- External dependencies (from package manifests)
- Internal dependency graph (inter-plugin references)
- ASCII diagram of internal dependencies

## Step 3: Write Files

Write all five documentation files using the `Write` tool.

If `BG` is true and `SILENT` is not true, send a completion notification:

```bash
npx @codevoyant/agent-kit notify --title "dev:docs complete" --message "Architecture docs written to docs/architecture/"
```

Report the files written and their sizes.
