---
title: python
---

# python

Context skill for Python projects managed with uv, covering workspaces, ML tracking, distributed compute, GPU kernels, and service architecture.

## Requirements

- `uv` — Python package and project manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)

## Philosophy

`uv` is the only package manager — `pip` and bare `python` invocations are never used; all commands go through `uv run`. Every project commits `pyproject.toml`, `uv.lock`, and `.python-version` together, and multi-package workspaces share a single `uv.lock`. All packages use a `src/<package>/` layout. Heavy or optional imports (GPU backends, Ray, Warp) are deferred to function bodies to avoid breaking hosts that lack those backends. Domain types crossing JSON or IPC boundaries use Pydantic v2 `BaseModel`; internal argument bundles use `@dataclass`.

## Recipes

- [Python Project Setup with uv](./python/recipes/uv-workspace) — standalone packages, workspaces, ruff, commitizen
- [Publishing Python Packages with uv](./python/recipes/uv-publishing) — PyPI, GitLab, and GCP Artifact Registry
- [Experiment Tracking with MLflow](./python/recipes/mlflow) — runs, metrics, model registry, Ray integration
- [Distributed Computing with Ray](./python/recipes/ray-training) — tasks, actors, three-executor pattern, AWS cluster
- [GPU Kernels with Nvidia Warp](./python/recipes/warp-hpc) — deferred imports, kernel patterns, slabbed VRAM, backend selector
- [Data Validation with Pydantic](./python/recipes/pydantic) — BaseModel, frozen models, PrivateAttr, dataclasses
- [CLI Commands with Click](./python/recipes/click-cli) — groups, ctx.obj, lazy services, error handling
- [Python Project Conventions and Architecture](./python/recipes/service-patterns) — src/ layout, deferred imports, Protocols, typing, testing discipline

## References

- [uv documentation](https://docs.astral.sh/uv/)
- [Pydantic v2 documentation](https://docs.pydantic.dev/latest/)
