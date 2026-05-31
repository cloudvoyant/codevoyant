# mise in Docker

How to install and use mise inside a Dockerfile. Based on nv-gcp-template base.dockerfile.

## Base Image Pattern (mise-app-template)

```dockerfile
# syntax=docker/dockerfile:1
FROM ubuntu:22.04

# Install mise prerequisites
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates curl git sudo && \
    rm -rf /var/lib/apt/lists/*

# Install mise into a stable, system-wide location
ENV MISE_DATA_DIR=/usr/local/mise
ENV MISE_CONFIG_DIR=/usr/local/mise-config
ENV PATH="/usr/local/mise/shims:/usr/local/mise/bin:${PATH}"
RUN curl -fsSL https://mise.run | MISE_INSTALL_PATH=/usr/local/mise/bin/mise sh && mise --version

WORKDIR /app
COPY . .

# Trust the mise.toml and install all declared tools (node, pnpm, terraform, etc.)
RUN mise trust --yes && mise install

# Install project dependencies via mise task
RUN mise run install
```

## Why system-wide install

Setting `MISE_DATA_DIR=/usr/local/mise` and `MISE_CONFIG_DIR=/usr/local/mise-config` installs mise tools globally, making them available to all users in the container without needing to source a shell profile. The shims directory is prepended to `PATH` so all mise-managed binaries are immediately available.

## Minimal variant (without project install)

For CI or base images that just need tool versions:

```dockerfile
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl git && \
    rm -rf /var/lib/apt/lists/*

ENV MISE_DATA_DIR=/usr/local/mise
ENV PATH="/usr/local/mise/shims:/usr/local/mise/bin:${PATH}"
RUN curl -fsSL https://mise.run | MISE_INSTALL_PATH=/usr/local/mise/bin/mise sh

COPY mise.toml .
RUN mise trust --yes && mise install
```

## Running mise tasks in Docker Compose

```yaml
# docker-compose.yml
services:
  tester:
    image: ${PROJECT}-base:local
    command: ["mise", "run", "test"]

  app:
    image: ${PROJECT}-base:local
    command: ["mise", "run", "run"]
```

## mise trust

Always run `mise trust --yes` before `mise install` in Docker — without it, mise will refuse to run tasks from an untrusted config file.

## Layer caching

Copy `mise.toml` before the full source to leverage Docker layer caching for tool installation:

```dockerfile
# Copy mise config first for better cache hits
COPY mise.toml .
RUN mise trust --yes && mise install

# Then copy source (changes invalidate layers below here, not above)
COPY . .
RUN mise run install
```
