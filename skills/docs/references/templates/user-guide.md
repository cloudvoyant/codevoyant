---
# @agent: This top-level doc owns the user-facing entry points (one owner per path). List the CLI/binary entry and public config it covers (e.g. "bin/**", "src/cli/**"). Do NOT claim dev-tooling config (development-guide owns that) or CI/infra (ci owns that).
globs:
  - "{e.g. src/cli/**}"
---
# {name}

## Overview

<!-- @human: 3 sentences max. What the project does for the user, what problem it solves, who uses it. -->

## Install

<!-- @agent: Prerequisites (tools + versions, with install links), then the copy-paste install command(s) an end user runs. -->

**Prerequisites:** {tools with versions and install links}

```bash
{install command}
```

## Quick Start

<!-- @agent: The shortest path from zero to a working result — numbered copy-paste steps. Show the command and its expected output. -->

```bash
{first command}    # {what it does}
{next command}     # {result}
```

## Common Usage

<!-- @agent: The primary use cases, one subsection each. Show the real command/API call and its result. Lead with the most common. -->

### {Most common task}

```bash
{command}    # {result}
```

## Command Reference

<!-- @agent: (optional) One entry per public command/API: signature, what it does, key options. Delete for a project with no command surface (e.g. a library — point at its API doc). -->

### `{command} [options]`

| Option | Description |
|--------|-------------|
| `{--flag}` | {what it controls} |

## Configuration

<!-- @agent: User-facing configuration only — config file locations, keys, env vars the user sets. Never include secret values. -->

| Setting | Purpose | Default |
|---------|---------|---------|
| `{KEY}` | {what it controls} | {default} |

## Troubleshooting

<!-- @agent: (optional) Common failure → cause → fix, as a short table. Delete if none. -->

| Symptom | Cause | Fix |
|---------|-------|-----|
| {error} | {why} | {resolution} |

## References

<!-- @agent: Technical/external references actually used — upstream tool/platform docs the user needs, and the user-facing source files (CLI entry, config schema). NOT sibling doc links. Real verified sources. -->

- `{path/to/cli-entry}` — command entry point
- [{Upstream tool docs}]({url}) — {why referenced}
