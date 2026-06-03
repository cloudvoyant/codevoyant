---
name: python
description: "Python project patterns: uv package/workspace management, MLflow experiment tracking, Ray distributed computing, Nvidia Warp GPU kernels, Pydantic validation, Click CLIs, and service architecture. Load when writing Python with pyproject.toml or uv.lock."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# python

Patterns for structuring Python projects managed by `uv`, with recipes for ML tracking, distributed compute, GPU kernels, and service architecture. Conventions apply to standalone packages and multi-package workspaces.

## When to load recipes

| You are working on… | Load recipe |
|---|---|
| uv project setup, deps, or monorepo workspace | `references/recipes/uv-workspace.md` |
| Publishing a package to PyPI or private registry | `references/recipes/uv-publishing.md` |
| MLflow experiment tracking or model registry | `references/recipes/mlflow.md` |
| Ray distributed training or remote tasks | `references/recipes/ray-training.md` |
| GPU kernels with Nvidia Warp | `references/recipes/warp-hpc.md` |
| Pydantic models or dataclasses | `references/recipes/pydantic.md` |
| Click CLI commands | `references/recipes/click-cli.md` |
| Module architecture, error handling, typing | `references/recipes/service-patterns.md` |

Load `uv-workspace` for any new Python project — every other recipe assumes a uv-managed source tree.

## Core Conventions

- `uv` is the only package manager — never `pip`, never `python` directly; always `uv run …`
- Commit `pyproject.toml`, `uv.lock`, and `.python-version` together
- One `uv.lock` per workspace, shared across every member
- `src/<package>/` layout for every package; tests as a sibling `tests/` dir
- `from __future__ import annotations` at the top of every module
- Heavy/optional imports (GPU backends, Ray, Warp) go **inside the function body**, never at module top
- Domain types that cross JSON/IPC boundaries → Pydantic v2 `BaseModel`; internal arg bundles → `@dataclass`
- CLIs use Click; commands receive services via `ctx.obj`, never globals
- Tests use `pytest --import-mode=importlib` so same-named test modules can coexist across libs

## Directory Structure

A multi-package workspace:

```
acme/                         ← workspace root (NOT a package)
  pyproject.toml              ← [tool.uv.workspace] members = ["libs/*", "apps/*"]
  uv.lock                     ← one lockfile for the whole workspace
  .python-version             ← "3.12"
  libs/
    voxel-sdk/
      pyproject.toml
      src/voxel_sdk/__init__.py
      tests/
    mesh-sdk/                 ← depends on voxel-sdk via { workspace = true }
      pyproject.toml
      src/mesh_sdk/__init__.py
  apps/
    acme-cli/
      pyproject.toml          ← [project.scripts] acme = "acme_cli.cli:cli"
      src/acme_cli/cli.py
```

A standalone package collapses to one `pyproject.toml` + `src/<pkg>/` + `tests/`.

## Common Pitfalls

- Mutable default args — use `Field(default_factory=list)` (Pydantic) or `field(default_factory=list)` (dataclass), never `= []`
- Module-level `import warp` / `import ray` breaks the non-GPU/non-cluster host — defer to function bodies and lock with an AST discipline test
- `runtime_env.pip` for Ray remote tasks builds a fresh per-task venv and times out the gRPC channel — bake heavy deps into the worker image, ship source via `working_dir`
- `working_dir` is capped at 100 MB — stage a trimmed tree, not the repo root (excludes `.venv`, `.git`, `dist`, `build`)
- Apple Silicon + Ray ≥ 2.55 driver hang — set `RAY_ENABLE_UV_RUN_RUNTIME_ENV=0` **before** `import ray`
- `frozen=True` on Pydantic models makes instances hashable but assignment raises — use only for genuinely immutable value objects
- `Field(..., ge=0, le=1)` marks the field required AND bounded; a bare type annotation with no `Field` works for unconstrained fields
