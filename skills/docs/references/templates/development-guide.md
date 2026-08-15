---
# @agent: This top-level doc owns the dev-tooling + task-runner config (one owner per path). Do NOT claim CI/infra config (ci owns that).
globs:
  - "mise.toml"
  - ".mise.toml"
  - "package.json"
  - "justfile"
  - "Taskfile.yml"
  - "tsconfig*.json"
  - "eslint.config.*"
  - ".prettierrc*"
  - ".editorconfig"
---
# {name}

## Prerequisites

<!-- @agent: Tools you must install before anything else, each with an install link. Include the version manager (e.g. mise) that installs the rest. -->

| Tool | Purpose |
|------|---------|
| {tool} | {what it manages} |

## Getting Started

<!-- @agent: Copy-paste install/setup using the project's own task runner. Use its real task names — do not invent commands. -->

```bash
git clone {repo-url}
cd {project-name}
{install-tools command}    # e.g. mise install
{install-deps command}     # e.g. mise run install
```

## Common Tasks

<!-- @agent: Build/test/lint/run. Use the project's task runner names verbatim; never invent commands. -->

| Task | Command |
|------|---------|
| Build | `{build task}` |
| Test | `{test task}` |
| Lint | `{lint task}` |
| Format | `{format task}` |
| Run | `{run task}` |

## Project Structure

<!-- @agent: Tree of the top-level source dirs and key config files, one-line note per entry. The code tree, not the docs tree. -->

```
{project-root}/
├── {dir}/    # {what lives here}
└── {config}  # {what it configures}
```

## Development Workflow

<!-- @agent: The edit → check → test → build loop as numbered steps. Each step names the real task command. -->

1. {edit code in `{dir}`}
2. {run `{lint task}`}
3. {run `{test task}`}
4. {run `{build task}`}

## References

<!-- @agent: Technical/external references actually used — the task runner's docs, tool docs, config file sources. NOT sibling doc links. Real verified sources. -->

- `mise.toml` — task definitions and tool versions
- [{Task runner docs}]({url}) — {why referenced}
