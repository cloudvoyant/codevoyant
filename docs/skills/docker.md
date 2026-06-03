---
title: docker
---

# docker

Context skill for Docker best practices — activates automatically when Dockerfiles or Docker Compose config are detected, no slash command needed.

## Requirements

- `docker` — [Docker installation](https://docs.docker.com/get-docker/)

## Commands

This is a context skill. It activates automatically when a `Dockerfile`, `docker-compose.yml`, or `dockerfiles/` directory is detected. No slash command is needed.

### Trigger conditions

The skill loads when any of the following are present:

- A `Dockerfile` or `dockerfiles/` directory in the project
- `docker-compose.yml` or `compose.yml` in the project
- User mentions Docker, `docker build`, `docker compose`, COMPOSE_BAKE, or dev containers

### Recipes available

| Situation | Recipe loaded |
|---|---|
| Running mise inside Docker (base images, tool installation) | `mise-in-docker` |
| Multi-stage builds (base and production image) | `multi-stage` |
| Docker Compose service composition | `compose` |
| Cross-platform compatibility (Mac, Linux, WSL2) | `cross-platform` |
| Pushing to GCP Artifact Registry or deploying to Cloud Run | `gcp-registry` |

Each recipe loads on demand — only what is relevant to the current task.

## References

- [Docker documentation](https://docs.docker.com/)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
