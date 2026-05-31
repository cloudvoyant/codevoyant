---
title: docker
---

# docker

Context skill for Docker best practices. Activates automatically when a `Dockerfile`, `docker-compose.yml`, or `dockerfiles/` directory is detected — no slash command needed.

## Installation

```bash
npx skills add cloudvoyant/codevoyant
```

## What It Does

When you're writing Dockerfiles or Docker Compose config the agent loads patterns for multi-stage builds, mise tool installation inside containers, cross-platform compatibility, and GCP Artifact Registry integration — based on patterns from nv-gcp-template (mise-app-template).

## Recipes

| Working on… | Recipe loaded |
|---|---|
| Running mise inside Docker (base images, CI) | `mise-in-docker` |
| Multi-stage builds (base + production image) | `multi-stage` |
| Docker Compose service composition | `compose` |
| Cross-platform compatibility (Mac / Linux / WSL2) | `cross-platform` |
| Pushing to GCP Artifact Registry or deploying to Cloud Run | `gcp-registry` |

## Multi-Stage Pattern

The standard pattern uses two stages: a `base` image with the full mise environment for building and testing, and a minimal `runtime` image for production.

```dockerfile
# syntax=docker/dockerfile:1
ARG PROJECT=my-project

# Stage 1: full mise environment
FROM ${PROJECT}-base:local AS builder
ARG PROJECT=my-project
WORKDIR /app
RUN pnpm --filter "@${PROJECT}/web" build

# Stage 2: minimal runtime
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/apps/web/build ./build
COPY --from=builder /app/runtime.json ./package.json
RUN npm install --omit=dev --ignore-scripts
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0
EXPOSE 8080
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs
CMD ["node", "build"]
```

## mise in Docker

Install mise system-wide so all container users can access it:

```dockerfile
ENV MISE_DATA_DIR=/usr/local/mise
ENV PATH="/usr/local/mise/shims:/usr/local/mise/bin:${PATH}"
RUN curl -fsSL https://mise.run | MISE_INSTALL_PATH=/usr/local/mise/bin/mise sh

COPY mise.toml .
RUN mise trust --yes && mise install  # trust required — mise refuses untrusted configs

COPY . .
RUN mise run install
```

Copy `mise.toml` before the full source to get better Docker layer cache hits on tool installation.

## Docker Compose

```yaml
services:
  base:
    build:
      context: .
      dockerfile: dockerfiles/base.dockerfile
    image: ${PROJECT}-base:local

  web:
    build:
      context: .
      dockerfile: dockerfiles/web.dockerfile
      args: [PROJECT]
    image: ${GCP_REGISTRY_REGION}-docker.pkg.dev/${GCP_REGISTRY_PROJECT_ID}/${GCP_REGISTRY_NAME}/${PROJECT}-web:${VERSION:-latest}
    depends_on: [base]
    ports: ["8080:8080"]

  tester:
    image: ${PROJECT}-base:local
    depends_on: [base]
    command: ["mise", "run", "test"]
```

Always build with `COMPOSE_BAKE=true` for parallel multi-service builds:

```bash
COMPOSE_BAKE=true docker compose build
```

## Cross-Platform (Mac / Linux / WSL2)

`--network host` only works on Linux. Use `host.docker.internal` with `extra_hosts` for Mac and WSL2:

```yaml
services:
  app:
    extra_hosts:
      - "host.docker.internal:${DOCKER_HOST_GATEWAY:-host-gateway}"
```

Override in `.mise.local.toml` (gitignored) for Linux bare-metal:

```toml
[env]
DOCKER_HOST_GATEWAY = "172.17.0.1"
```

## Core Conventions

- Always start Dockerfiles with `# syntax=docker/dockerfile:1`
- Use `--no-install-recommends` with `apt-get` and clean `rm -rf /var/lib/apt/lists/*` in the same layer
- Never run as root in production — add a non-root user in the final stage
- Use `.dockerignore` to exclude `node_modules`, `.git`, `dist`, `.env*`, `.svelte-kit`
