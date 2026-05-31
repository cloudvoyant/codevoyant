# Multi-Stage Builds

Two-stage pattern: a full `base` image for development/testing and a minimal `runtime` image for production. Based on nv-gcp-template web.dockerfile.

## Base + Runtime Pattern (SvelteKit / Node)

```dockerfile
# syntax=docker/dockerfile:1
ARG PROJECT=my-project

# ---- Stage 1: Builder (mise-based full environment) ----
FROM ${PROJECT}-base:local AS builder

ARG PROJECT=my-project
WORKDIR /app

# Build the SvelteKit app
RUN pnpm --filter "@${PROJECT}/web" build

# Generate a runtime package.json stripping workspace:* deps
# (workspace libs are bundled by Vite — not needed at runtime)
RUN node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf8'));
  const deps = Object.fromEntries(
    Object.entries(p.dependencies || {}).filter(([, v]) => !v.startsWith('workspace:'))
  );
  fs.writeFileSync('/app/runtime.json', JSON.stringify({ type: 'module', dependencies: deps }));
"

# ---- Stage 2: Runtime (minimal alpine) ----
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy only built output and real deps
COPY --from=builder /app/apps/web/build ./build
COPY --from=builder /app/runtime.json ./package.json

RUN npm install --omit=dev --ignore-scripts

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
EXPOSE 8080

# Run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs

CMD ["node", "build"]
```

## Base + Runtime Pattern (Go / Zig / compiled binary)

```dockerfile
# syntax=docker/dockerfile:1

# ---- Stage 1: Builder ----
FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git && rm -rf /var/lib/apt/lists/*

ENV MISE_DATA_DIR=/usr/local/mise
ENV PATH="/usr/local/mise/shims:/usr/local/mise/bin:${PATH}"
RUN curl -fsSL https://mise.run | MISE_INSTALL_PATH=/usr/local/mise/bin/mise sh

WORKDIR /app
COPY mise.toml .
RUN mise trust --yes && mise install

COPY . .
RUN mise run build-prod

# ---- Stage 2: Minimal runtime ----
FROM ubuntu:22.04 AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/zig-out/bin/myapp ./myapp

RUN useradd --system --no-create-home appuser
USER appuser

EXPOSE 8080
CMD ["./myapp"]
```

## Docker Compose with base + web services

```yaml
# docker-compose.yml
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
      args:
        - PROJECT
    image: ${GCP_DEVOPS_PROJECT_REGION}-docker.pkg.dev/${GCP_DEVOPS_PROJECT_ID}/${GCP_DEVOPS_DOCKER_REGISTRY_NAME}/${PROJECT}-web:${VERSION:-latest}
    depends_on:
      - base
    ports:
      - "8080:8080"

  tester:
    image: ${PROJECT}-base:local
    depends_on:
      - base
    command: ["mise", "run", "test"]
```

Build with `COMPOSE_BAKE=true` for parallel builds:

```bash
COMPOSE_BAKE=true docker compose build
```

## ARG re-declaration rule

After every `FROM`, `ARG` values reset. Re-declare any `ARG` you need in the new stage:

```dockerfile
ARG PROJECT=my-project          # declared before first FROM

FROM base AS builder
ARG PROJECT=my-project          # must re-declare to use $PROJECT here
RUN echo "Building $PROJECT"
```

## Non-root user pattern (Alpine)

```dockerfile
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser && \
    chown -R appuser:appgroup /app
USER appuser
```

## Non-root user pattern (Ubuntu/Debian)

```dockerfile
RUN useradd --system --no-create-home --uid 1001 appuser && \
    chown -R appuser /app
USER appuser
```
