# Python Project Conventions and Architecture

## Why this matters

This is the conventions document for all Python projects in this codebase. The patterns here are not optional style preferences — they are architectural rules that make the codebase predictable and safe.

The most common junior-dev mistakes this document prevents:
- Module-level imports of GPU/Ray dependencies that break CI and CPU-only hosts
- Relative imports that silently fail across process boundaries
- Missing `from __future__ import annotations` causing forward-reference errors
- Raw tracebacks reaching users instead of actionable error messages
- Tests that only work with a `sys.path` hack instead of a proper `src/` layout

Read this once when you join the project. Return to it when something breaks mysteriously.


## Project Structure — `src/<package>/` Layout

Every package in this codebase uses the `src/` layout. This is not an accident. Without `src/`, running `pytest` from the repo root can import the local directory instead of the installed package, leading to subtle differences between local and CI behavior.

Structure for a workspace library:

```
libs/pipeline/
  pyproject.toml
  src/pipeline/
    __init__.py
    environment.py
    executor.py
    stages/
      __init__.py
      sim.py
  tests/
    test_executor.py
```

`pyproject.toml` for a library in the workspace:

```toml
[project]
name = "pipeline"
version = "0.1.0"
requires-python = ">=3.12"

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]
```

For a namespaced package (everything under one `acme.*` root):

```toml
[tool.setuptools.packages.find]
where = ["src"]
include = ["acme*"]
namespaces = true
```

**Rule:** stage and worker module paths must be importable from any process (in-process, subprocess, distributed worker). Never rely on relative imports or local state for cross-process dispatch. A worker only receives a dotted module path string — it cannot resolve `from .stages import sim`.


## Deferred Imports for Heavy/Optional Dependencies

The rule: **import expensive or optional dependencies (GPU backend, visualization libs, distributed runtime) inside the function body, never at module top.**

Why: if `import warp` or `import ray` is at module top, that module becomes unimportable on any machine without those libraries — including CI runners, teammates' laptops, and CPU-only production hosts. Deferred imports keep `import pipeline.stages.sim` cheap and side-effect-free everywhere.

```python
# src/pipeline/stages/sim.py
from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pipeline.environment import PipelineEnvironment


def _dispatch_gpu(env: PipelineEnvironment, segments: list) -> list:
    """GPU dispatch + microstep generation.

    This is the ONLY function that imports the GPU backend. The import is lazy
    (inside the function body) so that importing this module never pulls in the
    backend. Do not move it to module level — the isolation test in
    tests/test_gpu_isolation.py asserts there is no module-level GPU import.
    """
    import gpu_backend  # noqa: F401, PLC0415 — side effect: registers GPU kernels
    from pipeline.environment import PipelineEnvironment  # noqa: PLC0415

    ...
    return []
```

Tag every in-function import `# noqa: PLC0415` (ruff's import-outside-top-level). Document the invariant in `__init__.py`:

```python
# src/pipeline/stages/__init__.py
"""Stage callables for the executor registry.

GPU dispatch is confined to stages/sim.py::_dispatch_gpu.
New stages: if a stage needs the GPU, follow the _dispatch_gpu pattern — import
the backend lazily inside the function, never at module level (enforced by
tests/test_gpu_isolation.py).
"""
from __future__ import annotations
```


## Type Boundaries — Pydantic vs `@dataclass`

The rule: **domain types that cross JSON/IPC boundaries use Pydantic v2 `BaseModel`; internal argument bundles use `@dataclass`.**

- Data arriving from JSON, YAML, an API, or IPC → `BaseModel`. You get validation, coercion, and `model_dump_json()` / `model_validate_json()` for free.
- A bundle of arguments one caller builds and passes in-process once → `@dataclass`. No validation overhead needed.

See `pydantic.md` for detailed patterns (frozen models, PrivateAttr, field validators, default_factory).


## Module Architecture — String-Keyed Registry

A module-level dict maps a name to a `(module_path, attr)` pair. Resolution imports lazily so registering a stage never forces its dependencies to load. This is the pattern for any extensible dispatch system.

```python
# src/pipeline/executor.py
from __future__ import annotations

import importlib

_STAGE_REGISTRY: dict[str, tuple[str, str]] = {}


def register_stage(name: str, module: str, attr: str = "run") -> None:
    """Register a stage implementation by module path."""
    _STAGE_REGISTRY[name] = (module, attr)


def resolve_stage(name: str):
    if name not in _STAGE_REGISTRY:
        raise KeyError(f"unknown stage '{name}' (registered: {sorted(_STAGE_REGISTRY)})")
    module_path, attr = _STAGE_REGISTRY[name]
    module = importlib.import_module(module_path)
    return getattr(module, attr)
```

Populate the registry **at import time** in the app so it's ready before any `resolve_stage` call:

```python
# apps/pipeline-cli/src/pipeline_cli/stages.py
from __future__ import annotations

from pipeline.executor import register_stage


def register_all() -> None:
    register_stage("analyze", "pipeline.stages.analyze", "run")
    register_stage("sim",     "pipeline.stages", "sim")
    register_stage("post",    "pipeline.stages", "post")


register_all()         # at import time
```


## Contracts — `Protocol`, Not Base Classes

Define contracts as `Protocol`. Concrete types satisfy by shape, not by subclassing. Mark `@runtime_checkable` only when you actually call `isinstance(obj, Proto)`.

```python
from typing import Protocol, runtime_checkable


@runtime_checkable
class StageExecutor(Protocol):
    """Contract every executor satisfies."""

    def run_stage(self, name: str, inputs: dict[str, Path], output: Path) -> dict: ...


class InProcessExecutor:
    def run_stage(self, name: str, inputs: dict[str, Path], output: Path) -> dict:
        fn = resolve_stage(name)
        return fn(inputs=inputs, output=output)


class SubprocessExecutor:
    """The parity gate: if it produces byte-identical artifacts to in-process,
    the pipeline is already distribution-ready."""

    def run_stage(self, name: str, inputs: dict[str, Path], output: Path) -> dict:
        ...   # encode inputs as JSON, subprocess.run a runner, read back stats


def make_executor(name: str) -> StageExecutor:
    if name == "inprocess":  return InProcessExecutor()
    if name == "subprocess": return SubprocessExecutor()
    raise ValueError(f"unknown executor '{name}' (choose: inprocess, subprocess)")
```

Reserve `ABC` + `@abstractmethod` only when subclasses share a real default implementation or the framework wires them by inheritance.

When the pluggable thing is a single function, use a `Callable` alias instead of a protocol:

```python
from collections.abc import Callable

ToolSelectorFn = Callable[[list[ToolSpec], SelectionContext], ToolSpec]
```


## Error Handling — Right Exception in the Right Place

### Library code: most specific built-in, with the bad value AND valid options

```python
def resolve_stage(name: str):
    if name not in _STAGE_REGISTRY:
        raise KeyError(f"unknown stage '{name}' (registered: {sorted(_STAGE_REGISTRY)})")


def make_executor(name: str) -> StageExecutor:
    if name == "inprocess":  return InProcessExecutor()
    if name == "subprocess": return SubprocessExecutor()
    raise ValueError(f"unknown executor '{name}' (choose: inprocess, subprocess)")


def _estimate_scrap_stub(env: PipelineEnvironment) -> VoxelGrid:  # noqa: ARG001
    raise NotImplementedError("estimate_scrap wired in Phase 8")
```

`KeyError` vs `ValueError`: lookup that misses → `KeyError(name)`; factory dispatch over a fixed enum → `ValueError(f"unknown ... (choose: ...)")`.

### Service object: one `require_*` / `get_*` guard per requirement

A "not loaded" state is a **programmer** error → `RuntimeError`; a "missing user config" state is a **user** error → friendly message + exit. Note the dual exit path (`ctx.exit` when available, `sys.exit` as fallback):

```python
import sys
from pathlib import Path

import click

from pipeline_cli.config import load_config
from pipeline_cli.models import AcmeConfig


class ConfigService:
    def __init__(self, config_path: Path | None = None) -> None:
        self.config_path = config_path or Path.cwd() / "acme.yaml"
        self._config: AcmeConfig | None = None

    def load(self) -> bool:
        self._config = load_config(self.config_path)
        return self._config is not None

    @property
    def is_loaded(self) -> bool:
        return self._config is not None

    @property
    def config(self) -> AcmeConfig:
        if self._config is None:
            raise RuntimeError("Config not loaded. Call load() first.")   # programmer error
        return self._config

    def require_config(self, ctx: click.Context | None = None) -> AcmeConfig:
        if self.is_loaded:
            return self.config
        click.secho("Error: acme.yaml not found", fg="red")
        click.echo("Run 'acme init' to create configuration")
        if ctx is not None:
            ctx.exit(1)
        sys.exit(1)
```

**Boundary:** libraries raise precise exceptions; the CLI translates them into human guidance. Never put colored output deep in a library; never let a raw traceback reach the user.

### Tolerant `except` only where genuinely optional — tag it

```python
def detect_features(self, model: Any) -> list[Feature]:  # noqa: ANN401
    try:
        from feature_detect_sdk.features import detect_features  # noqa: PLC0415
        features = detect_features(model)
    except Exception:  # noqa: BLE001 — optional dependency / best-effort
        features = []
    self.detected_features = features
    return features
```

If the path isn't genuinely optional, catch a specific exception instead.


## Typing Discipline

### `from __future__ import annotations` at the top of every module

Makes all annotations lazy strings — enables forward references and lets you import types for checking only. This is mandatory for every `.py` file.

```python
from __future__ import annotations

from typing import TYPE_CHECKING, Protocol, runtime_checkable

import numpy as np
from cutting_tool_sdk.models import CuttingTool

if TYPE_CHECKING:
    from grid_sdk.grid import VoxelGrid
    from pipeline.environment import PipelineEnvironment
    from pipeline.models.moves import ToolpathSegment
```

Everything in the `TYPE_CHECKING` block can be referenced in annotations without importing at runtime.

### Name repeated shapes — `TypeAlias` and `Literal` / `StrEnum`

```python
Vec3 = tuple[float, float, float]
Quat = tuple[float, float, float, float]

OpKind = Literal["face", "rough", "finish", "drill"]
```

For a vocabulary that travels through the system and needs named members, use `StrEnum`:

```python
from enum import StrEnum


class OperationType(StrEnum):
    FACING_ROUGHING = "FACING_ROUGHING"
    DRILLING        = "DRILLING"
    FINISHING       = "FINISHING"
    CHAMFER         = "CHAMFER"
```

A `StrEnum` member *is* a `str`, so it serializes and compares like the literal while staying a typed, discoverable name. Use `Literal` for closed vocabularies that only appear in annotations; use `StrEnum` when the vocabulary travels through dispatch logic.

### Type every signature, including `-> None`

```python
def _estimate_scrap_stub(env: PipelineEnvironment) -> VoxelGrid:  # noqa: ARG001
    raise NotImplementedError("estimate_scrap wired in Phase 8")
```

Tag deliberately-unused parameters with `# noqa: ARG001` / `ARG002` rather than renaming. Use `# noqa: ANN401` where an `Any` parameter is genuinely required.


## Testing

### Pytest config for a multi-lib `src` layout

`--import-mode=importlib` lets same-named test modules coexist across libraries. Without it, same-named test modules collide.

```toml
[tool.pytest.ini_options]
testpaths = ["apps", "libs", "benchmarks"]
addopts = "-v --import-mode=importlib"
timeout = 300
markers = [
    "cuda: marks tests that require a CUDA GPU (skip on non-CUDA hosts)",
    "eval: marks tests that require a heavy demo fixture (slow)",
    "e2e: marks end-to-end tests against the full CLI (slow)",
]
```

### Discipline test — grep + allowlist

Inspects source code in CI to enforce an architectural rule. Single-mutator rule: only allowlisted files may call `write_data(`:

```python
from __future__ import annotations
from pathlib import Path
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SRC_ROOT = _REPO_ROOT / "libs" / "pipeline" / "src" / "pipeline"

_WRITE_DATA_ALLOWLIST: frozenset[str] = frozenset({
    "environment.py",   # PipelineEnvironment — the sole legitimate mutator
    "approx.py",        # documented mutator exception
    "sim.py",           # stages/sim.py — packed grid conversion
})


def test_write_data_only_in_allowlisted_files() -> None:
    violations: list[str] = []
    for py in sorted(_SRC_ROOT.rglob("*.py")):
        for lineno, line in enumerate(py.read_text(encoding="utf-8").splitlines(), start=1):
            if "write_data(" in line and py.name not in _WRITE_DATA_ALLOWLIST:
                violations.append(f"{py.relative_to(_REPO_ROOT)}:{lineno}: {line.strip()}")
    if violations:
        pytest.fail(
            "write_data( found outside the mutation allowlist.\n"
            "Offending locations:\n  " + "\n  ".join(violations) + "\n\n"
            "If this is an intentional new mutator, add the file to "
            "_WRITE_DATA_ALLOWLIST and document the exception."
        )
```

### Import-isolation test — AST parse

A grep can't tell a module-level import from a lazy one inside a function. Parse the AST and inspect only top-level body, then assert the lazy import still exists:

```python
from __future__ import annotations
import ast, importlib, re
from pathlib import Path


def test_only_dispatch_gpu_imports_gpu_backend() -> None:
    sim = importlib.import_module("pipeline.stages.sim")
    src_path = Path(sim.__file__)
    src = src_path.read_text(encoding="utf-8")

    occurrences = re.findall(r"gpu_backend", src)
    tree = ast.parse(src)
    violations: list[str] = []

    for node in ast.iter_child_nodes(tree):       # top-level body only
        if isinstance(node, ast.Import):
            for alias in node.names:
                if "gpu_backend" in (alias.name or ""):
                    violations.append(f"line {node.lineno}: import {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if "gpu_backend" in (node.module or ""):
                violations.append(f"line {node.lineno}: from {node.module} import ...")

    assert not violations, (
        f"Module-level gpu_backend import found in {src_path}.\n"
        "Only _dispatch_gpu() may import gpu_backend."
    )
    assert len(occurrences) >= 1, "GPU dispatch path appears to have been removed."
```

### Hypothesis property test for numeric code

```python
from __future__ import annotations
import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st
from hypothesis.extra.numpy import array_shapes, arrays

_grid_shape_st = array_shapes(min_dims=3, max_dims=3, min_side=16, max_side=32)
_bool_grid_st = arrays(bool, _grid_shape_st)
_nonempty_grid_st = _bool_grid_st.filter(lambda a: np.any(a))


@given(target=_nonempty_grid_st, radius=st.integers(min_value=1, max_value=6))
@settings(max_examples=20, deadline=None)
def test_csg_only_removes(target: np.ndarray, radius: int) -> None:
    from pipeline.setups.csg import csg_setup_end  # noqa: PLC0415

    stock = np.ones_like(target)
    result = csg_setup_end(stock, target)
    assert result.shape == stock.shape
    assert int((result & ~stock).sum()) == 0   # CSG may only remove, never add
```

### Hermetic autouse fixtures + root conftest env defaults

```python
# libs/pipeline/tests/conftest.py
from __future__ import annotations
from unittest.mock import MagicMock
import pytest


@pytest.fixture(autouse=True)
def _mock_cloud_session(monkeypatch):
    def session_factory(*args, **kwargs):
        sess = MagicMock()
        sts = MagicMock()
        sts.get_caller_identity.return_value = {"Account": "123456789012"}
        sess.client.return_value = sts
        return sess
    monkeypatch.setattr("pipeline_cli.commands.cloud.boto3.Session", session_factory)


@pytest.fixture(autouse=True)
def _set_api_token(monkeypatch):
    monkeypatch.setenv("ACME_API_TOKEN", "test-token-for-unit-tests")
```

```python
# repo-root conftest.py — runs BEFORE any heavy import
from __future__ import annotations
import os

os.environ.setdefault("RAY_ENABLE_UV_RUN_RUNTIME_ENV", "0")
os.environ.setdefault("RAY_USAGE_STATS_ENABLED", "0")
```


## Common Pitfalls

- Relative imports (`from .stages import sim`) break across-process dispatch — always use absolute module paths
- Importing a heavy/optional dep at module top forces every importer (including tests, IDEs) to install it — defer with the lazy import + AST isolation test
- `# noqa: PLC0415` is **required** on every in-function import, or ruff fails the file
- `KeyError` vs `ValueError`: lookup that misses → `KeyError(name)`; factory dispatch over a fixed enum → `ValueError(f"unknown ... (choose: ...)")`
- Discipline tests should **no-op** when the guarded subdirectory doesn't exist yet — that way they can ship before the code they guard
- Pytest `--import-mode=importlib` is mandatory for src-layout multi-lib repos; without it same-named test modules collide
- A `Protocol` doesn't need `@runtime_checkable` unless you actually call `isinstance(obj, Proto)` — adding it costs nothing at static analysis time but does add a small `__instancecheck__` cost
