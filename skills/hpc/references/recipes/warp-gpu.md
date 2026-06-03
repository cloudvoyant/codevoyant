# NVIDIA Warp (Python GPU)

Warp is NVIDIA's answer to "I want to write GPU kernels without learning CUDA C++". Python functions decorated with `@wp.kernel` compile to PTX just-in-time. The performance ceiling is close to hand-written CUDA for memory-bound workloads.

> **Cross-reference:** The Python skill has a `warp-hpc.md` recipe covering Warp's Python API basics. This recipe focuses on the HPC angle: writing high-performance GPU kernels, simulation loops, tile-based computation, and how Warp compares to CUDA/Thrust for HPC workloads.

## Install

```bash
pip install warp-lang
```

## Basic Kernel Structure

```python
import warp as wp
import numpy as np

wp.init()

@wp.kernel
def scale(x: wp.array(dtype=float), alpha: float, out: wp.array(dtype=float)):
    i = wp.tid()  # thread index
    out[i] = x[i] * alpha

# Allocate on GPU
n = 1_000_000
x = wp.array(np.random.randn(n).astype(np.float32), dtype=wp.float32, device="cuda")
out = wp.zeros(n, dtype=wp.float32, device="cuda")

wp.launch(scale, dim=n, inputs=[x, 1.5, out])
wp.synchronize()
```

## Supported Types and Math

```python
# Warp has built-in vec/mat types
@wp.kernel
def transform_points(
    pts: wp.array(dtype=wp.vec3),
    T: wp.mat44,
    out: wp.array(dtype=wp.vec3),
):
    i = wp.tid()
    p = pts[i]
    out[i] = wp.transform_point(T, p)

# Built-in: vec2/3/4, mat22/33/44, quat, spatial_vector
# Built-in math: dot, cross, normalize, length, sqrt, sin, cos, atan2, ...
```

## Tile-Based Computation (Warp 1.0+ Tiles API)

```python
TILE_SIZE = wp.constant(256)

@wp.kernel
def tile_reduce(data: wp.array(dtype=float), result: wp.array(dtype=float)):
    # Load a tile of data into shared memory
    tile = wp.tile_load(data, shape=(TILE_SIZE,))
    # Reduce within the tile
    s = wp.tile_sum(tile)
    # Store result from first thread in each tile
    wp.tile_store(result, wp.tile_broadcast(s, shape=(1,)))

wp.launch(tile_reduce, dim=(n,), inputs=[data, result],
          tile_dim=(TILE_SIZE,))
```

## Streams and Async Execution

```python
s1 = wp.Stream("cuda")
s2 = wp.Stream("cuda")

with wp.ScopedStream(s1):
    wp.launch(kernel_a, dim=n, inputs=[a])

with wp.ScopedStream(s2):
    wp.launch(kernel_b, dim=n, inputs=[b])

wp.synchronize_stream(s1)
wp.synchronize_stream(s2)
```

## Autodiff (Forward and Reverse Mode)

```python
@wp.kernel
def loss_kernel(x: wp.array(dtype=float), loss: wp.array(dtype=float)):
    i = wp.tid()
    wp.atomic_add(loss, 0, x[i] * x[i])  # L2 loss

x = wp.array(np.ones(n, dtype=np.float32), dtype=wp.float32, device="cuda", requires_grad=True)
loss = wp.zeros(1, dtype=wp.float32, device="cuda")

tape = wp.Tape()
with tape:
    wp.launch(loss_kernel, dim=n, inputs=[x, loss])

tape.backward(loss)
print(x.grad)  # gradient w.r.t. x
```

## Simulation Loop Pattern (Physics/Geometry)

```python
# Warp shines in simulation: rigid body, cloth, fluid
import warp.sim as wps

model = wps.ModelBuilder()
model.add_particle(pos=(0, 1, 0), vel=(0, 0, 0), mass=1.0)
# ... build scene ...

state_0 = model.state()
state_1 = model.state()
integrator = wps.SemiImplicitIntegrator()

for step in range(1000):
    integrator.simulate(model, state_0, state_1, dt=1.0/60.0)
    state_0, state_1 = state_1, state_0
```

## Interop with PyTorch and CuPy

```python
# Zero-copy to PyTorch tensor
import torch
t = wp.to_torch(warp_array)  # shares GPU memory
w = wp.from_torch(torch_tensor)

# CuPy
import cupy
c = cupy.from_dlpack(warp_array)
```

## When to Use Warp vs Alternatives

| Task | Best tool |
|---|---|
| GPU kernels from Python | Warp |
| Parallel algorithms (sort/reduce) | Thrust (C++) or CuPy |
| Simulation (rigid body, cloth, fluid) | Warp |
| Autodiff through GPU code | Warp (or JAX) |
| Multi-backend portability | Kokkos (C++) |
| Maximum CUDA control | Raw CUDA C++ |
