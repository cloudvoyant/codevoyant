---
# @agent: The README is an INDEX doc — a navigational overview of the whole repo. It spans `**` and carries `index: true` so review treats it as an index doc (exempt from one-owner-per-path). Leave both keys as-is.
index: true
globs:
  - "**"
---
# {name}

## Overview

<!-- @agent: 3 sentences max. What it is, what problem it solves, who uses it. -->

## Quick Start

<!-- @agent: Prerequisites, then clone/install/run commands a new engineer can copy-paste. -->

**Prerequisites:** {tools with install links}

```bash
git clone {repo-url}
cd {project-name}
{install command}
{run command}
```

## Documentation

- [Architecture](docs/architecture/index.md) — how the system is put together
- [User Guide](docs/user-guide.md) — install, usage, configuration
- [Development Guide](docs/development-guide.md) — build, test, and contribute
- [CI/CD](docs/ci.md) — pipelines, release, infrastructure
