# Docker Compose

Service composition patterns based on nv-gcp-template.

## Standard Service Structure

```yaml
# docker-compose.yml
services:
  # Base: full build environment — built first, referenced by other services
  base:
    build:
      context: .
      dockerfile: dockerfiles/base.dockerfile
    image: ${PROJECT}-base:local

  # Web: production image for Cloud Run deployment
  web:
    build:
      context: .
      dockerfile: dockerfiles/web.dockerfile
      args:
        - PROJECT
    image: ${REGISTRY_REGION}-docker.pkg.dev/${REGISTRY_PROJECT}/${REGISTRY_NAME}/${PROJECT}-web:${VERSION:-latest}
    depends_on:
      - base
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production

  # Tester: reuses base image, runs test suite
  tester:
    image: ${PROJECT}-base:local
    depends_on:
      - base
    command: ["mise", "run", "test"]
```

## Environment Variables

Load from `.env` or inherit from shell (mise sets them automatically):

```yaml
services:
  app:
    env_file:
      - .env.local        # local secrets (gitignored)
    environment:
      - NODE_ENV=production
      - PORT=8080
      # Explicit vars override env_file
      - DATABASE_URL=${DATABASE_URL}
```

## Volume Mounts for Dev

```yaml
services:
  dev:
    image: ${PROJECT}-base:local
    volumes:
      - .:/app              # live source mount
      - /app/node_modules   # prevent host node_modules from shadowing container's
    command: ["mise", "run", "dev"]
    ports:
      - "5173:5173"
      - "3000:3000"
```

## Depends-on with health checks

```yaml
services:
  app:
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
```

## mise tasks for Compose

```toml
[tasks.docker-build]
description = "Build all Docker images"
run         = "COMPOSE_BAKE=true docker compose build"

[tasks.docker-run]
description = "Run the web service"
depends     = ["docker-build"]
run         = "docker compose up web"

[tasks.docker-test]
description = "Run tests in Docker"
depends     = ["docker-build"]
run         = "docker compose run --rm tester"

[tasks.docker-stop]
description = "Stop all containers"
run         = "docker compose down"

[tasks."docker-run:web"]
description = "Run just the web service (no rebuild)"
run         = "docker compose run --rm --service-ports web"
```

## COMPOSE_BAKE

See [Docker BuildKit Bake docs](https://docs.docker.com/build/bake/). The short version: always set it. The base→web→tester pattern in this codebase builds in parallel with shared layer cache, cutting build time by ~60% on a cold CI runner.

```toml
[tasks.docker-build]
run = "COMPOSE_BAKE=true docker compose build"
```

## .dockerignore

Always include a `.dockerignore` to keep images small:

```
node_modules
.git
.codevoyant
*.md
!README.md
dist
build
.svelte-kit
zig-out
zig-cache
.zig-cache
.env*
!.env.example
```
