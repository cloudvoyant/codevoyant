# Cross-Platform Docker (Mac / Linux / WSL2)

Patterns for Docker setups that work on macOS, Linux, and Windows via WSL2.

## The Core Problem

Docker runs natively on Linux. On macOS and WSL2, it runs inside a VM, which affects:
- Host networking (`--network host` does not work on Mac)
- File paths in volume mounts
- Docker socket location

## Host Networking Workaround

`--network host` only works on Linux. For Mac and WSL2, use `host.docker.internal` with `extra_hosts`:

```yaml
# docker-compose.yml
services:
  app:
    extra_hosts:
      - "host.docker.internal:${DOCKER_HOST_GATEWAY:-host-gateway}"
```

| Platform | `DOCKER_HOST_GATEWAY` value |
|---|---|
| macOS (Docker Desktop) | Not needed — `host.docker.internal` resolves automatically |
| Linux (native Docker CE) | `172.17.0.1` (docker bridge) or `host-gateway` (Compose v2) |
| WSL2 + Docker Desktop | Not needed — handled by Docker Desktop |
| WSL2 + Docker CE in WSL | `172.17.0.1` or check `ip route show | grep default` |

### Per-developer override with .mise.local.toml

```toml
# mise.toml — default (works on Mac + WSL2 + Docker Desktop)
[env]
DOCKER_HOST_GATEWAY = "host-gateway"

# .mise.local.toml (gitignored) — Linux bare-metal override
[env]
DOCKER_HOST_GATEWAY = "172.17.0.1"
```

Add `.mise.local.toml` to `.gitignore`.

## Volume Mount Paths

Always use `$PWD` or `$(pwd)` — never hardcode paths:

```bash
# ✅ Portable
docker run --rm -v "$PWD:/workspace" -w /workspace myimage

# ❌ Breaks on other machines
docker run --rm -v "/Users/alice/myproject:/workspace" myimage
```

In `docker-compose.yml`, use `.` for relative paths:

```yaml
volumes:
  - .:/app              # Current directory — works everywhere
  - /app/node_modules   # Anonymous volume — prevents host override
```

## Docker Socket

| Platform | Socket path |
|---|---|
| Linux / WSL2 + Docker Desktop | `/var/run/docker.sock` |
| WSL2 + Docker CE in WSL | `/var/run/docker.sock` (inside WSL) |
| macOS Docker Desktop | `/var/run/docker.sock` (symlinked) |

For tools that need the Docker socket (e.g. Testcontainers):

```yaml
services:
  testrunner:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

## File Performance on macOS

macOS Docker has slow bind mounts for large directories. Mitigate with:

```yaml
volumes:
  - .:/app:delegated          # Mac: write operations batched
  - /app/node_modules         # Keep node_modules in container volume
```

Or use Docker's VirtioFS (Docker Desktop ≥ 4.6) which is much faster.

## WSL2-Specific

1. **Run Docker commands from within WSL** — don't use Docker from the Windows terminal for mounted WSL paths
2. **Store projects in the WSL filesystem** (`~/Projects/...`) not in `/mnt/c/...` — I/O performance is dramatically better
3. **Docker Desktop WSL integration** — enable in Docker Desktop → Settings → Resources → WSL Integration
4. **Memory limit** — WSL2 can consume too much RAM; add a `%USERPROFILE%/.wslconfig`:
   ```ini
   [wsl2]
   memory=8GB
   processors=4
   ```

## Dev Container Pattern (cross-platform)

`.devcontainer/Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install mise system-wide
RUN curl -fsSL https://mise.run | MISE_INSTALL_PATH=/usr/local/bin/mise sh
ENV MISE_DATA_DIR=/usr/local/mise
ENV PATH="/usr/local/mise/shims:${PATH}"

# Pre-install tools from mise.toml
WORKDIR /workspace
COPY mise.toml .
RUN mise trust --yes && mise install
```

`.devcontainer/devcontainer.json`:

```json
{
  "name": "My Project",
  "build": { "dockerfile": "Dockerfile" },
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspace,type=bind",
  "workspaceFolder": "/workspace",
  "forwardPorts": [3000, 5173, 8080],
  "postCreateCommand": "mise run install",
  "customizations": {
    "vscode": {
      "extensions": ["svelte.svelte-vscode", "dbaeumer.vscode-eslint"]
    }
  }
}
```

## Checking your platform in a mise task

```toml
[tasks."docker:info"]
description = "Print platform + docker info for debugging"
run = """
echo "Platform: $(uname -s) $(uname -m)"
echo "Docker: $(docker version --format '{{.Server.Version}}' 2>/dev/null)"
echo "Compose: $(docker compose version 2>/dev/null)"
echo "Socket: $(ls -la /var/run/docker.sock 2>/dev/null || echo 'not found')"
"""
```
