# GPU Kernels with Nvidia Warp

## Why this matters

Writing GPU kernels usually requires CUDA C++ and a separate compilation step. Nvidia Warp lets you write GPU kernels in Python with a decorator (`@wp.kernel`) and JIT-compiles them on first use. The result: GPU-speed parallelism with Python-developer ergonomics.

The critical gotcha for Python codebases: **`import warp` will fail on any machine without CUDA installed** — including your CI runners, your teammates' MacBooks, and any CPU-only deployment host. If you put `import warp` at the top of a module, that entire module becomes unimportable everywhere without a GPU. The solution is deferred imports: every Warp import goes inside a function body, never at module level.


## Install

```bash
uv add 'warp-lang>=1.8' numpy
```

Declare Warp as an **optional extra** in any library that ships a CPU fallback:

```toml
[project.optional-dependencies]
cuda = ["warp-lang>=1.8"]
```

```bash
pip install 'acme-voxel[cuda]'   # opt-in GPU install
pip install 'acme-voxel'         # plain install stays CPU-only
```


## Module Skeleton — Lazy `import warp`

The whole point: a module that defines GPU kernels must still **import** on a non-CUDA host. Never `import warp` at module top — every Warp import goes inside a function body.

`warp_backend.py`:

```python
"""GPU voxel kernels using NVIDIA Warp. All warp imports are deferred."""
from __future__ import annotations

import numpy as np


def _define_kernels() -> None:
    """Import warp and JIT-define every kernel once. Called lazily on first GPU use."""
    import warp as wp  # type: ignore[import]

    global _kernel_boolean, _kernel_subtract_capsule, _kernel_voxelize
    global _kernels_defined

    if _kernels_defined:
        return

    # --- kernel definitions go here (see Kernel Patterns below) ---

    _kernel_boolean = _boolean
    _kernel_subtract_capsule = _subtract_capsule
    _kernel_voxelize = _voxelize
    _kernels_defined = True


# Module-level sentinel + placeholders (one per kernel).
_kernels_defined: bool = False
_kernel_boolean = None             # type: ignore[assignment]
_kernel_subtract_capsule = None    # type: ignore[assignment]
_kernel_voxelize = None            # type: ignore[assignment]
```

Why this shape:
- Nested kernel functions inside `_define_kernels()` keep `import warp` deferred while still being addressable as module-level globals.
- `_kernels_defined` guard makes JIT compilation happen exactly once.


## Kernel Patterns

### Flat 1-D elementwise

```python
    @wp.kernel  # type: ignore[misc]
    def _boolean(
        a: wp.array(dtype=wp.bool),    # type: ignore[valid-type]
        b: wp.array(dtype=wp.bool),    # type: ignore[valid-type]
        out: wp.array(dtype=wp.bool),  # type: ignore[valid-type]
        op: int,
    ) -> None:
        i = wp.tid()
        va = a[i]
        vb = b[i]
        if op == 0:   out[i] = va or vb        # union
        elif op == 1: out[i] = va and vb       # intersect
        else:         out[i] = va and not vb   # subtract
```

Pass `op` as a plain `int` from the host: `{"union": 0, "intersect": 1, "subtract": 2}[op]`.

### Flat-index decode for a 3-D grid (Z, Y, X), with atomic counter

```python
    @wp.kernel  # type: ignore[misc]
    def _subtract_capsule(
        data: wp.array(dtype=wp.bool),    # type: ignore[valid-type]
        count: wp.array(dtype=wp.int32),  # type: ignore[valid-type]
        nz: int, ny: int, nx: int,
        ox: float, oy: float, oz: float, vs: float,
        ax: float, ay: float, az: float,
        bx: float, by: float, bz: float,
        radius: float,
    ) -> None:
        idx = wp.tid()
        iz = idx // (ny * nx)
        rem = idx - iz * ny * nx
        iy = rem // nx
        ix = rem - iy * nx
        # World-space voxel centre
        px = ox + (float(ix) + 0.5) * vs
        py = oy + (float(iy) + 0.5) * vs
        pz = oz + (float(iz) + 0.5) * vs
        # Distance from voxel centre to segment a->b
        seg_x = bx - ax; seg_y = by - ay; seg_z = bz - az
        diff_x = px - ax; diff_y = py - ay; diff_z = pz - az
        dot_seg = seg_x * seg_x + seg_y * seg_y + seg_z * seg_z
        t = 0.0
        if dot_seg > 1e-12:
            t = (diff_x * seg_x + diff_y * seg_y + diff_z * seg_z) / dot_seg
            t = wp.clamp(t, 0.0, 1.0)
        dx = px - (ax + t * seg_x)
        dy = py - (ay + t * seg_y)
        dz = pz - (az + t * seg_z)
        if dx * dx + dy * dy + dz * dz <= radius * radius and data[idx]:
            data[idx] = wp.bool(False)
            wp.atomic_add(count, 0, 1)
```

### 3-D indexed kernel for a Z-slab (`wp.array3d` + 3-tuple `wp.tid()`)

```python
    @wp.kernel  # type: ignore[misc]
    def _subtract_capsule_offset(
        grid: wp.array3d(dtype=wp.bool),  # type: ignore[valid-type]
        ax: float, ay: float, az: float,
        bx: float, by: float, bz: float,
        radius: float,
        ox: float, oy: float, oz: float, vs: float,
        z_offset: int,
    ) -> None:
        iz, iy, ix = wp.tid()
        px = ox + (float(ix) + 0.5) * vs
        py = oy + (float(iy) + 0.5) * vs
        pz = oz + (float(iz + z_offset) + 0.5) * vs   # GLOBAL Z
        # ... same SDF math as above
```

### Mesh voxelization with a BVH (`wp.Mesh`)

```python
    @wp.kernel  # type: ignore[misc]
    def _voxelize(
        mesh_id: wp.uint64,                # type: ignore[valid-type]
        out: wp.array(dtype=wp.bool),      # type: ignore[valid-type]
        min_x: float, min_y: float, min_z: float,
        pitch: float,
        nz: int, ny: int, nx: int,
    ) -> None:
        idx = wp.tid()
        iz = idx // (ny * nx)
        rem = idx - iz * ny * nx
        iy = rem // nx
        ix = rem - iy * nx
        cx = min_x + (float(ix) + 0.5) * pitch
        cy = min_y + (float(iy) + 0.5) * pitch
        cz = min_z + (float(iz) + 0.5) * pitch
        pt = wp.vec3(cx, cy, cz)
        query = wp.mesh_query_point_sign_normal(mesh_id, pt, 1e6)
        if query.sign < 0.0:
            out[idx] = wp.bool(True)
```

Sign-query voxelization can leave hollow shells for non-watertight meshes — post-process the downloaded numpy result with `scipy.ndimage.binary_fill_holes(out)`.


## Backend Class — Launch + Memory

`import warp` only inside the constructor and launching methods. Resolve device once in `__init__`, warm the JIT, then every method follows the same shape: numpy in → `wp.array` on device → `wp.launch` → `.numpy()` back.

```python
class WarpBackend:
    name: str = "cuda"

    def __init__(self) -> None:
        import warp as wp  # type: ignore[import]

        devices = wp.get_cuda_devices()
        if not devices:
            raise RuntimeError("WarpBackend: no CUDA devices found.")
        self._device = devices[0]
        wp.init()
        _define_kernels()       # JIT now so first method call is warm

    def boolean(self, op, a, b=None):
        import warp as wp  # type: ignore[import]

        arr_a = a.astype(bool)
        arr_b = b.astype(bool)
        n = arr_a.size

        d_a = wp.array(arr_a.ravel(), dtype=wp.bool, device=self._device)
        d_b = wp.array(arr_b.ravel(), dtype=wp.bool, device=self._device)
        d_out = wp.zeros(n, dtype=wp.bool, device=self._device)

        op_code = {"union": 0, "intersect": 1, "subtract": 2}[op]
        wp.launch(_kernel_boolean,
                  dim=n,
                  inputs=[d_a, d_b, d_out, op_code],
                  device=self._device)
        return d_out.numpy().reshape(arr_a.shape)

    def subtract_swept_capsule(self, data, p0, p1, radius_mm, origin, vs):
        import warp as wp  # type: ignore[import]

        nz, ny, nx = data.shape
        d_data = wp.array(data.ravel(), dtype=wp.bool, device=self._device)
        d_count = wp.zeros(1, dtype=wp.int32, device=self._device)

        ax, ay, az = p0; bx, by, bz = p1; ox, oy, oz = origin
        wp.launch(_kernel_subtract_capsule,
                  dim=nz * ny * nx,
                  inputs=[d_data, d_count, nz, ny, nx, ox, oy, oz, vs,
                          ax, ay, az, bx, by, bz, radius_mm],
                  device=self._device)
        new_data = d_data.numpy().reshape(data.shape)
        removed = int(d_count.numpy()[0])
        return new_data, removed
```

Launch shape:
- `dim` is total thread count for flat kernels (`arr.size` or `nz*ny*nx`), or `(nz, ny, nx)` tuple for 3-D `wp.array3d` kernels.
- `inputs=[...]` is positional, must match the kernel signature exactly. Cast scalars: `float(x0)`, `int(z_lo)`.
- `.numpy()` does the device→host copy (implicit sync). Treat it as the **one** round-trip point per op.


## Slabbed Work — When Grid > VRAM

For a 14 GB grid on a 16 GB card, process in Z-slabs sized to a fixed VRAM budget. One bool voxel is 1 byte on the GPU.

```python
from dataclasses import dataclass, field

_SLAB_BYTES: int = 2 * 1024**3   # 2 GB slab budget


@dataclass
class SimSession:
    """GPU-resident batch session — queue sweeps, apply on flush() / __exit__."""

    arr: "np.ndarray"
    origin: tuple[float, float, float]
    voxel_size: float
    device: str = "cuda:0"
    _pending: list = field(default_factory=list, init=False, repr=False)

    def __enter__(self):                 return self
    def __exit__(self, *_):              self.flush()

    def subtract_swept_capsule(self, path, radius_mm) -> None:
        self._pending.append((path, radius_mm))     # queue, do not run yet

    def flush(self) -> None:
        if not self._pending:
            return
        _define_kernels()
        nz, ny, nx = self.arr.shape
        nz_slab = max(1, _SLAB_BYTES // (ny * nx))

        for z_lo in range(0, nz, nz_slab):
            z_hi = min(nz, z_lo + nz_slab)
            slab = self.arr[z_lo:z_hi].astype(bool, copy=False)
            _subtract_capsules_in_slab(slab, self._pending, z_lo,
                                       self.voxel_size, self.origin, self.device)
            self.arr[z_lo:z_hi] = slab

        self._pending.clear()           # second flush() is a no-op
```

Per-slab launch loop:

```python
snz, sny, snx = slab_np.shape
wp_slab = wp.array(slab_np, dtype=wp.bool, device=device)
wp.launch(kernel=_kernel_subtract_capsule_offset,
          dim=(snz, sny, snx),
          inputs=[wp_slab,
                  float(x0), float(y0), float(z0),
                  float(x1), float(y1), float(z1),
                  float(radius_mm),
                  float(ox), float(oy), float(oz), float(voxel_size),
                  int(z_lo)],
          device=device)
slab_np[:] = wp_slab.numpy()           # download in place
del wp_slab                            # free VRAM before next slab
```


## Backend Selector — `auto` / `cuda` / `cpu`

Pair the Warp backend with a scipy CPU fallback behind a common `Backend` Protocol. `"auto"` tries Warp, falls back silently; `"cuda"` raises on no GPU; `"cpu"` always returns scipy.

```python
# backend.py
from __future__ import annotations
from typing import Protocol, runtime_checkable
import numpy as np


@runtime_checkable
class Backend(Protocol):
    name: str

    def boolean(self, op: str, a, b=None): ...
    def dilate(self, grid, kernel: np.ndarray): ...
    def voxelize_mesh(self, mesh, bbox, pitch_mm: float): ...
    def subtract_swept_capsule(self, grid, p0, p1, radius_mm: float) -> int: ...
```

```python
# backend_select.py
from __future__ import annotations
import os
from typing import Literal

from backend import Backend

BackendName = Literal["auto", "cuda", "cpu"]


def get_backend(name: BackendName | None = None) -> Backend:
    if name is None:
        name = os.environ.get("ACME_BACKEND", "auto")  # type: ignore[assignment]

    if name == "cpu":
        from scipy_backend import ScipyBackend
        return ScipyBackend()

    if name == "cuda":
        return _load_warp_backend(require_cuda=True)

    if name == "auto":
        try:
            return _load_warp_backend(require_cuda=False)
        except (RuntimeError, ImportError):
            from scipy_backend import ScipyBackend
            return ScipyBackend()

    raise ValueError(f"Unknown backend: {name!r}. Choose 'auto', 'cuda', or 'cpu'.")


def _load_warp_backend(*, require_cuda: bool) -> Backend:
    try:
        import warp as wp  # type: ignore[import]
    except ImportError as e:
        raise RuntimeError(
            "warp-lang is not installed. Install the CUDA extra:\n"
            "  pip install 'acme-voxel[cuda]'"
        ) from e

    devices = wp.get_cuda_devices()
    if not devices:
        raise RuntimeError(
            "No CUDA devices found. Cannot use WarpBackend.\n"
            "Set ACME_BACKEND=cpu to use the scipy fallback."
        )

    from warp_backend import WarpBackend
    return WarpBackend()
```

Per-op CPU fallback inside the GPU backend is fine while you're writing kernels:

```python
    def dilate(self, grid, kernel):
        import scipy.ndimage as ndi  # type: ignore[import]
        return ndi.binary_dilation(grid.astype(bool), structure=kernel.astype(bool))
```


## Testing

### Register the `cuda` marker

```toml
[tool.pytest.ini_options]
markers = ["cuda: tests that require a CUDA GPU (skipped on non-CUDA hosts)"]
```

### Module-level skip for non-CUDA hosts

`tests/test_warp_backend.py` — collects everywhere, skips on machines without a GPU:

```python
from __future__ import annotations
import numpy as np
import pytest


def _has_cuda() -> bool:
    try:
        import warp as wp  # type: ignore[import]
        return len(wp.get_cuda_devices()) > 0
    except Exception:
        return False


pytestmark = pytest.mark.cuda


@pytest.fixture(scope="session", autouse=True)
def require_cuda() -> None:
    if not _has_cuda():
        pytest.skip("No CUDA devices found", allow_module_level=True)


@pytest.fixture(scope="module")
def warp_backend():
    from warp_backend import WarpBackend
    return WarpBackend()


@pytest.fixture(scope="module")
def scipy_backend():
    from scipy_backend import ScipyBackend
    return ScipyBackend()
```

### Cross-validate against the CPU reference

Cross-validate the GPU kernel against the scipy CPU implementation voxel-for-voxel. This catches a kernel that uses diameter where radius was intended (removes ~2x too much):

```python
@pytest.mark.cuda
@pytest.mark.parametrize("p0,p1,radius_mm,desc", [
    ((16.0, 16.0, 0.0), (16.0, 16.0, 32.0), 3.0, "z-axis radius=3"),
    ((0.0, 16.0, 16.0), (32.0, 16.0, 16.0), 4.0, "x-axis radius=4"),
    ((16.0, 16.0, 4.0), (16.0, 16.0, 28.0), 6.35, "cutter-sized radius=6.35"),
])
def test_subtract_swept_capsule_matches_scipy(warp_backend, scipy_backend, p0, p1, radius_mm, desc):
    arr_w = np.ones((32, 32, 32), dtype=bool)
    arr_s = arr_w.copy()
    warp_backend.subtract_swept_capsule(arr_w, p0, p1, radius_mm)
    scipy_backend.subtract_swept_capsule(arr_s, p0, p1, radius_mm)
    diff = int((arr_w != arr_s).sum())
    if diff != 0:
        ratio = (~arr_w).sum() / max(1, (~arr_s).sum())
        raise AssertionError(
            f"{desc}: {diff} voxels differ. ratio={ratio:.3f} "
            f"(~2 means kernel uses diameter where radius is intended)"
        )
```

### AST isolation test — lock down the lazy import

A grep can't tell a module-level import from a lazy one inside a function. Parse the AST and inspect only top-level body. The whole point of deferring `import warp` is defeated if anyone imports the GPU module at module scope.

```python
# tests/test_gpu_isolation.py
from __future__ import annotations
import ast, importlib, re
from pathlib import Path


def test_only_dispatch_imports_warp_backend() -> None:
    module = importlib.import_module("acme.stages.dispatch")
    src_path = Path(module.__file__)
    src = src_path.read_text(encoding="utf-8")

    occurrences = re.findall(r"warp_backend", src)
    tree = ast.parse(src)
    violations: list[str] = []

    for node in ast.iter_child_nodes(tree):       # TOP-LEVEL only
        if isinstance(node, ast.Import):
            for alias in node.names:
                if "warp_backend" in (alias.name or ""):
                    violations.append(f"line {node.lineno}: import {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            if "warp_backend" in mod:
                violations.append(f"line {node.lineno}: from {mod} import ...")

    assert not violations, (
        "Module-level warp_backend import found.\n"
        + "\n".join(f"  {v}" for v in violations)
    )
    assert len(occurrences) >= 1, "Expected the lazy import inside the dispatch fn."
```


## Rules to Keep

- `@wp.kernel` → `# type: ignore[misc]`; each `wp.array(...)` / `wp.array3d(...)` arg → `# type: ignore[valid-type]`
- Kernel return type is always `-> None` — kernels mutate array args in place
- Inside a kernel use only Warp builtins: `wp.bool(True)`, `wp.clamp`, `wp.vec3`, `wp.atomic_add`, `wp.round`. No Python imports, no Python `True`/`False`
- Grids are `(Z, Y, X)`. Flat decode is always:
  `iz = idx // (ny*nx); rem = idx - iz*ny*nx; iy = rem // nx; ix = rem - iy*nx`
- Cast scalars at launch sites — `float(x0)`, `int(z_lo)`, never bare Python ints/floats


## Common Pitfalls

- **`import warp` at module top** breaks every non-GPU host. Lock it down with the AST isolation test
- **Forgetting `del wp_slab` between slab launches** keeps VRAM allocated and OOMs on the next slab
- **Half-voxel GPU/CPU mismatch** — without snapping to nearest voxel centre, the GPU boundary can disagree with an index-rounded CPU disc by up to half a voxel. Use `wp.round((closest_x - ox) / vs - 0.5)` then re-multiply
- **Hollow shells for non-watertight meshes** — sign-query voxelization can leave holes; post-process with `scipy.ndimage.binary_fill_holes`
- **`device=` accepts either** a resolved device object or a string (`"cuda:0"` / `"cpu"`) — passing the wrong type silently picks a different device
