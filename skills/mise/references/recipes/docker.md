# Docker with mise

Patterns for Docker tasks that work correctly on macOS, Linux, and WSL2. Based on nv-gcp-template (mise-app-template).

## Cross-Platform Docker Compose

The key issue with Docker Compose across Mac/Linux/WSL is socket paths and host networking.

### docker-compose.yml pattern

```yaml
services:
  app:
    build:
      context: .
      dockerfile: dockerfiles/app.Dockerfile
    image: ${GCP_REGISTRY_REGION}-docker.pkg.dev/${GCP_REGISTRY_PROJECT_ID}/${GCP_REGISTRY_NAME}/${PROJECT}:${VERSION}
    environment:
      - NODE_ENV=production
    # Use host.docker.internal for Mac; on Linux/WSL use the gateway IP
    # Set via DOCKER_HOST_GATEWAY in .mise.local.toml
    extra_hosts:
      - "host.docker.internal:${DOCKER_HOST_GATEWAY:-host-gateway}"
```

### mise.toml environment for cross-platform

```toml
[env]
PROJECT = "my-project"
VERSION = "{{ exec(command='cat version.txt 2>/dev/null | tr -d [:space:] || echo 0.1.0') }}"

# Docker host gateway: auto-detect platform
# Mac: host.docker.internal resolves automatically
# Linux/WSL: must be set to the docker bridge IP (usually 172.17.0.1)
# Override in .mise.local.toml for developer machines:
#   DOCKER_HOST_GATEWAY = "172.17.0.1"
DOCKER_HOST_GATEWAY = "host-gateway"
```

### .mise.local.toml (gitignored, per-developer)

```toml
# Linux / WSL2 developers: set this to your docker bridge gateway
[env]
DOCKER_HOST_GATEWAY = "172.17.0.1"
```

Add `.mise.local.toml` to `.gitignore`.

## Standard Docker Tasks

```toml
[tasks.docker-build]
description = "Build Docker image(s)"
run         = "COMPOSE_BAKE=true docker compose build"

[tasks.docker-run]
description = "Run the app in Docker"
depends     = ["docker-build"]
run         = "docker compose up"

[tasks.docker-stop]
description = "Stop running containers"
run         = "docker compose down"

[tasks.docker-test]
description = "Run tests inside Docker"
depends     = ["docker-build"]
run         = "docker compose run --rm app mise run test"

[tasks."docker-build:prod"]
description = "Build production image (no dev deps)"
run         = "docker build --target prod -t $PROJECT:$VERSION ."
```

## Dev Container Pattern

For VS Code Dev Containers and GitHub Codespaces:

```toml
[tasks."devcontainer:build"]
description = "Build the dev container image"
run         = "docker build -f .devcontainer/Dockerfile -t $PROJECT-devcontainer:latest ."

[tasks."devcontainer:run"]
description = "Start dev container with workspace mounted"
run         = """
docker run --rm -it \
  -v "$PWD:/workspace" \
  -w /workspace \
  -p 3000:3000 \
  -p 5173:5173 \
  $PROJECT-devcontainer:latest \
  bash
"""
```

### .devcontainer/Dockerfile pattern

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install mise
RUN curl https://mise.run | sh
ENV PATH="/root/.local/bin:$PATH"

# Install project tools via mise
COPY mise.toml .
RUN mise install

# Set working directory
WORKDIR /workspace
```

## WSL2-Specific Considerations

1. **Docker Desktop for Windows** with WSL2 backend — Docker socket is shared automatically; no extra config needed
2. **Docker CE in WSL2 directly** — socket is at `/var/run/docker.sock` inside WSL; set `DOCKER_HOST=unix:///var/run/docker.sock`
3. **Host networking** — `--network host` works on Linux/WSL but NOT on macOS (Docker runs in a Linux VM on Mac); use `extra_hosts` + `host-gateway` instead
4. **File paths** — use `$(pwd)` or `$PWD` in volume mounts, not Windows-style paths

```toml
# WSL2-safe volume mount pattern
[tasks.docker-run]
run = """
docker run --rm -it \
  -v "$(pwd):/workspace" \
  -w /workspace \
  $PROJECT:latest
"""
```

## GCP Artifact Registry Push

```toml
[tasks.docker-push]
description = "Tag and push image to GCP Artifact Registry"
depends     = ["docker-build"]
run         = """
IMAGE="${GCP_REGISTRY_REGION}-docker.pkg.dev/${GCP_REGISTRY_PROJECT_ID}/${GCP_REGISTRY_NAME}/${PROJECT}:${VERSION}"
docker tag $PROJECT:$VERSION "$IMAGE"
docker push "$IMAGE"
echo "✓ Pushed: $IMAGE"
"""

[tasks.gcp-login]
description = "Authenticate Docker with GCP Artifact Registry"
run         = """
gcloud auth configure-docker ${GCP_REGISTRY_REGION}-docker.pkg.dev --quiet
echo "✓ Docker configured for ${GCP_REGISTRY_REGION}-docker.pkg.dev"
"""
```

## Multi-Stage Dockerfile Pattern

```dockerfile
# Stage 1: build
FROM node:lts-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: production (no dev deps, smaller image)
FROM node:lts-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

Build a specific stage:
```bash
docker build --target prod -t myapp:latest .
```

## COMPOSE_BAKE

Always set `COMPOSE_BAKE=true` for multi-service builds. In our base→web→tester Compose setup, it cuts build time significantly by parallelizing and sharing BuildKit cache. Requires Docker Compose v2.17+. See [Docker BuildKit Bake](https://docs.docker.com/build/bake/) for the underlying mechanism.

```toml
[tasks.docker-build]
run = "COMPOSE_BAKE=true docker compose build"
```
