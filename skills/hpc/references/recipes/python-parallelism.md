# Python Parallelism

## The GIL and What It Means

The Global Interpreter Lock (GIL) ensures only one Python thread executes Python bytecode at a time. This is a design choice in CPython — it simplifies memory management and makes C extensions safe, but it means `threading` does not give you CPU parallelism.

Threads in Python are only truly parallel for:
- I/O operations (network calls, disk reads, database queries)
- C-extension code that releases the GIL (numpy, scipy, pandas operations on arrays)

CPU-bound pure-Python work running on multiple threads will be **slower** than a single thread due to GIL contention and context-switching overhead. If your workload is CPU-bound, you need processes, not threads.

CPython 3.13 introduced an experimental free-threaded build (`--disable-gil`). It is not production-ready as of 3.13. Plan for it, but do not depend on it yet.

## Decision Tree

Pick the right tool before writing code. The wrong choice wastes days:

**I/O-bound with many small tasks** (HTTP requests, file reads, database queries)
Use `asyncio`. One event loop handles thousands of concurrent I/O operations with no thread overhead.

**CPU-bound with simple embarrassingly parallel tasks** (process each file, compute each row)
Use `concurrent.futures.ProcessPoolExecutor`. The standard library path. Works well when each task is independent and takes more than ~10ms.

**CPU-bound with large data arrays** (matrix operations, image processing, signal processing)
Use `multiprocessing` with shared memory, or offload to numpy/scipy (which release the GIL). For cluster scale, use Ray.

**CPU-bound with complex task graphs or cluster scale** (ML training, pipeline DAGs, distributed processing)
Use Ray. It handles task scheduling, fault tolerance, and cluster management.

**Numerical loops over arrays where numpy is too coarse**
Use Numba for JIT-compiled parallel loops.

**When nothing in Python is fast enough**
Write the hot path in C++ with pybind11, or use GPU compute (CuPy, CUDA).

## `concurrent.futures.ProcessPoolExecutor`

The standard library path for CPU-bound parallelism. It spawns worker processes, each with its own GIL, so CPU work actually runs in parallel.

```python
from concurrent.futures import ProcessPoolExecutor, as_completed

def expensive(x):
    return sum(i * i for i in range(x))

with ProcessPoolExecutor(max_workers=4) as executor:
    futures = {executor.submit(expensive, n): n for n in range(10_000, 10_010)}
    for future in as_completed(futures):
        n = futures[future]
        result = future.result()  # raises if the worker raised
        print(f"{n} -> {result}")
```

**`executor.map` vs `executor.submit`**: Use `map` when you have a simple function applied to an iterable and want results in order. Use `submit` when you need `as_completed` ordering or per-task exception handling.

**`max_workers` tuning**: Start with the number of physical cores (`os.cpu_count()`). Memory-heavy tasks may need fewer workers. Profile before tuning.

**When to use `multiprocessing.Pool` instead**: `ProcessPoolExecutor` is built on top of `multiprocessing` and is almost always the better API. Use `multiprocessing.Pool` directly only if you need `maxtasksperchild` (to control memory leaks in long-running pools) or `initializer` functions for per-worker setup.

**Exception propagation**: Exceptions in worker processes are re-raised in the parent when you call `future.result()`. Unhandled exceptions in `executor.map` surface on iteration. Always wrap `.result()` calls.

## `asyncio`

Asyncio is for concurrency, not parallelism. One thread, one event loop, thousands of concurrent I/O operations.

```python
import asyncio
import aiohttp

async def fetch(session, url):
    async with session.get(url) as resp:
        return await resp.text()

async def main():
    urls = ["https://example.com/api/1", "https://example.com/api/2"]
    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(*(fetch(session, u) for u in urls))
    return results

asyncio.run(main())
```

**CPU-bound work in async code**: Use `loop.run_in_executor` to offload to a `ProcessPoolExecutor`:

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

def cpu_work(n):
    return sum(i * i for i in range(n))

async def main():
    loop = asyncio.get_event_loop()
    with ProcessPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, cpu_work, 10_000_000)
    print(result)

asyncio.run(main())
```

**Common mistake**: Running CPU-bound work directly in an `async def` function. This blocks the event loop and starves all other coroutines. If a function takes more than ~1ms of CPU time, offload it.

## `multiprocessing` Shared Memory

Passing large arrays between processes via pickle serialization is slow and doubles memory usage. `multiprocessing.shared_memory` lets processes share a memory buffer directly.

```python
import numpy as np
from multiprocessing import shared_memory, Process

def worker(shm_name, shape, dtype):
    existing = shared_memory.SharedMemory(name=shm_name)
    arr = np.ndarray(shape, dtype=dtype, buffer=existing.buf)
    arr *= 2  # modify in-place; visible to all processes
    existing.close()

# Create shared memory and put data in it
data = np.arange(1_000_000, dtype=np.float64)
shm = shared_memory.SharedMemory(create=True, size=data.nbytes)
shared_arr = np.ndarray(data.shape, dtype=data.dtype, buffer=shm.buf)
shared_arr[:] = data  # copy data into shared buffer

p = Process(target=worker, args=(shm.name, data.shape, data.dtype))
p.start()
p.join()

print(shared_arr[:5])  # [0. 2. 4. 6. 8.]
shm.close()
shm.unlink()  # free the shared memory block
```

Always call `shm.close()` in every process and `shm.unlink()` in exactly one process. Leaked shared memory persists until reboot.

## `joblib`

The scientific Python standard for parallelism. Used internally by scikit-learn.

```python
from joblib import Parallel, delayed

results = Parallel(n_jobs=-1)(
    delayed(expensive_function)(x) for x in items
)
```

**Backend selection**: `joblib` defaults to `loky` (a robust process pool). For numpy-heavy code that releases the GIL, `threading` backend avoids process-spawn overhead:

```python
results = Parallel(n_jobs=-1, backend="threading")(
    delayed(numpy_heavy_fn)(x) for x in items
)
```

**Memoization**: `joblib.Memory` caches function results to disk, keyed by input arguments. Useful for expensive preprocessing that shouldn't repeat across runs:

```python
from joblib import Memory

memory = Memory("/tmp/joblib_cache", verbose=0)

@memory.cache
def slow_transform(data):
    # expensive computation
    return result
```

**When to use joblib vs ProcessPoolExecutor**: Joblib handles numpy arrays efficiently (it memory-maps them instead of pickling), automatically tunes batch sizes, and integrates with scikit-learn's `n_jobs` parameter. Use it for scientific Python. Use `ProcessPoolExecutor` for general-purpose Python without scientific dependencies.

## Numba

JIT compilation for numerical Python. Numba compiles Python functions to machine code at first call, producing performance close to C.

```python
import numba
import numpy as np

@numba.jit(nopython=True)
def fast_sum_of_squares(arr):
    total = 0.0
    for x in arr:
        total += x * x
    return total

data = np.random.randn(10_000_000)
result = fast_sum_of_squares(data)  # first call compiles; subsequent calls are fast
```

**`@numba.prange` for parallel loops**: Numba can parallelize loops across cores:

```python
@numba.jit(nopython=True, parallel=True)
def parallel_sum_of_squares(arr):
    total = 0.0
    for i in numba.prange(len(arr)):
        total += arr[i] * arr[i]
    return total
```

**When Numba beats numpy**: Numba wins when you have fused loops (multiple operations per element that numpy would need multiple passes for), in-place mutations, or complex branching that numpy can't vectorize. If your code is a single numpy call (like `np.sum(arr**2)`), numpy is already fast and Numba adds compilation overhead for no gain.

**Limitations**: Numba supports a subset of Python and numpy. No dicts, no classes (use `@numba.jitclass` for limited support), no string operations, no I/O. It's a tool for numerical inner loops, not general Python.

## When to Stop Trying in Python

Python's overhead per operation is 10-100x higher than C++. For some workloads, no amount of multiprocessing or Numba will close the gap.

Consider moving to C++ with Python bindings when:
- You need fine-grained parallelism on data structures (not just arrays)
- Latency per operation matters (sub-microsecond)
- The inner loop has complex branching, pointer chasing, or custom data structures
- You need SIMD control beyond what Numba provides

The path: write the hot path in C++, expose it via pybind11, call from Python. This is how numpy, scipy, PyTorch, and most performance-critical Python libraries work.

For GPU workloads: CuPy gives you numpy-like syntax on CUDA. For custom GPU kernels, use CUDA directly or Numba's CUDA target (`@numba.cuda.jit`).
