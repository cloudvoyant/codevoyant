---
name: docker
description: "Docker best practices for containerization, dev containers, and Docker Compose. Load when writing Dockerfiles, docker-compose.yml, or mise Docker tasks. Triggers on: Dockerfile, docker-compose.yml, docker build, docker compose, devcontainer, COMPOSE_BAKE, GCP Artifact Registry, Cloud Run."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# docker

Best practices for Docker and Docker Compose based on nv-gcp-template (mise-app-template) conventions. Covers multi-stage builds with mise, cross-platform Docker Compose (Mac / Linux / WSL2), dev containers, and GCP Artifact Registry.

## When to load recipes

| You are working on... | Load recipe |
|---|---|
| Running mise inside Docker (base images, tool installation) | `references/recipes/mise-in-docker.md` |
| Multi-stage builds (base + production image) | `references/recipes/multi-stage.md` |
| Docker Compose service composition | `references/recipes/compose.md` |
| Cross-platform compatibility (Mac / Linux / WSL2) | `references/recipes/cross-platform.md` |
| Pushing to GCP Artifact Registry or deploying to Cloud Run | `references/recipes/gcp-registry.md` |

## Core Conventions

- Always use `# syntax=docker/dockerfile:1` as the first line (enables BuildKit features)
- Use `COMPOSE_BAKE=true docker compose build` for faster parallel builds
- Base images use `ubuntu:22.04` with mise for tool installation; runtime images use minimal `node:lts-alpine` or `alpine`
- Never run as root in production images — create a non-root user in the final stage
- Use `--no-install-recommends` with `apt-get` and clean `rm -rf /var/lib/apt/lists/*` in the same layer
