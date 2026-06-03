# OpenMP

## Why OpenMP

OpenMP is the fastest path from sequential loop to parallel loop. Add one pragma, recompile, and your loop runs on all cores. No thread management, no synchronization code, no restructuring. The compiler does the work.

It's the right tool when:
- Your hot path is a `for` loop over an array
- The loop body has no side effects between iterations (no loop-carried dependencies)
- You don't need fine-grained task scheduling or DAG execution (use TBB for that)

## Enabling OpenMP

CMake setup:

```cmake
find_package(OpenMP REQUIRED)
target_link_libraries(myapp PRIVATE OpenMP::OpenMP_CXX)
```

This adds `-fopenmp` (GCC/Clang) or `/openmp` (MSVC) automatically. On macOS with Apple Clang, OpenMP support requires `libomp` via Homebrew — `brew install libomp` — and additional CMake hints:

```cmake
# macOS with Homebrew libomp
set(OpenMP_C_FLAGS "-Xpreprocessor -fopenmp")
set(OpenMP_CXX_FLAGS "-Xpreprocessor -fopenmp")
set(OpenMP_C_LIB_NAMES "omp")
set(OpenMP_CXX_LIB_NAMES "omp")
set(OpenMP_omp_LIBRARY "/opt/homebrew/opt/libomp/lib/libomp.dylib")
```

Alternatively, use GCC from Homebrew (`brew install gcc`) which has OpenMP built in.

## `#pragma omp parallel for`

The workhorse. Parallelizes a counted for loop across available threads:

```cpp
#include <omp.h>
#include <vector>

void scale(std::vector<float>& v, float factor) {
    #pragma omp parallel for
    for (int i = 0; i < static_cast<int>(v.size()); ++i) {
        v[i] *= factor;
    }
}
```

**When it's safe:** each iteration writes only to `v[i]` and reads only from `v[i]` and `factor`. No iteration depends on another. If iteration `j` reads what iteration `i` wrote, you have a loop-carried dependency and the pragma silently produces wrong results.

**Schedule clauses** control how iterations are distributed:

| Clause | Behavior | Best for |
|---|---|---|
| `static` | Equal chunks, round-robin | Uniform work per iteration |
| `dynamic` | Threads grab chunks on demand | Unequal work per iteration |
| `guided` | Like dynamic but chunk sizes shrink | Large loops with decreasing cost |
| `auto` | Compiler decides | When you're not sure |

```cpp
#pragma omp parallel for schedule(dynamic, 64)
for (int i = 0; i < n; ++i) {
    // variable-cost work
}
```

## Reductions

Accumulating into a shared variable without synchronization is a data race:

```cpp
// WRONG — data race on sum
float sum = 0.0f;
#pragma omp parallel for
for (int i = 0; i < n; ++i) {
    sum += data[i]; // multiple threads write to sum
}
```

The fix is a reduction clause. Each thread gets a private copy; results are combined after the loop:

```cpp
float sum = 0.0f;
#pragma omp parallel for reduction(+:sum)
for (int i = 0; i < n; ++i) {
    sum += data[i]; // each thread accumulates into a private sum
}
// sum now holds the total
```

Supported operators: `+`, `-`, `*`, `&`, `|`, `^`, `&&`, `||`, `min`, `max`.

## Sections and Tasks

**Sections** — for a fixed number of unequal-work blocks:

```cpp
#pragma omp parallel sections
{
    #pragma omp section
    { compute_physics(); }

    #pragma omp section
    { compute_ai(); }

    #pragma omp section
    { compute_rendering(); }
}
// all three run in parallel, barrier at the closing brace
```

**Tasks** — for recursive or irregular parallelism (tree traversal, quicksort):

```cpp
void parallel_quicksort(int* arr, int lo, int hi) {
    if (hi - lo < 1000) {
        std::sort(arr + lo, arr + hi);
        return;
    }
    int pivot = partition(arr, lo, hi);

    #pragma omp task shared(arr)
    parallel_quicksort(arr, lo, pivot);

    #pragma omp task shared(arr)
    parallel_quicksort(arr, pivot + 1, hi);

    #pragma omp taskwait // wait for both subtasks
}

// Launch from a parallel region:
#pragma omp parallel
{
    #pragma omp single
    parallel_quicksort(arr, 0, n);
}
```

## Nested Parallelism

By default, a nested `parallel for` inside a `parallel` region runs sequentially. Enable nesting:

```cpp
omp_set_nested(1);          // deprecated in 5.0
omp_set_max_active_levels(2); // preferred in OpenMP 5.0+
```

Nesting is useful when you have parallelism at two levels (e.g., parallel over images, parallel over pixels within each image). But it multiplies thread count — 8 outer threads x 8 inner threads = 64 threads on an 8-core machine, which thrashes. Use `omp_set_num_threads()` on the inner region or consider TBB's nested `task_arena` instead.

## Shared vs Private Variables

| Clause | Meaning |
|---|---|
| `shared(x)` | All threads see the same `x` (default for variables declared outside the parallel region) |
| `private(x)` | Each thread gets an uninitialized copy |
| `firstprivate(x)` | Each thread gets a copy initialized to the value before the region |
| `lastprivate(x)` | The value from the last iteration is copied back to the original |

```cpp
int total = 0;
int temp;
#pragma omp parallel for firstprivate(temp) reduction(+:total)
for (int i = 0; i < n; ++i) {
    temp = compute(i);
    total += temp;
}
```

A common bug: forgetting that loop variables in `parallel for` are `private` by default, but other variables declared outside are `shared`. When in doubt, be explicit with `default(none)` and declare every variable:

```cpp
#pragma omp parallel for default(none) shared(data, n) reduction(+:sum)
```

## SIMD Hint

Combine threading and vectorization:

```cpp
#pragma omp parallel for simd
for (int i = 0; i < n; ++i) {
    out[i] = a[i] * b[i] + c[i];
}
```

`#pragma omp simd` alone (without `parallel for`) requests vectorization without threading — useful inside an already-parallelized outer loop. See simd.md for intrinsics-level control.

## When NOT to Use OpenMP

- **I/O-bound work** — threads block on syscalls; use async I/O or a thread pool instead
- **Shared mutable state** — if most iterations need a lock, the parallelism overhead exceeds the gain
- **Irregular task graphs** — OpenMP tasks work but TBB's flow graph is more expressive (see tbb.md)
- **Long-lived worker threads** — OpenMP regions are fork-join; for persistent workers, use `std::jthread` or a thread pool

## Measuring

Use `omp_get_wtime()` for wall-clock timing:

```cpp
double start = omp_get_wtime();
#pragma omp parallel for
for (int i = 0; i < n; ++i) {
    work(i);
}
double elapsed = omp_get_wtime() - start;
printf("Elapsed: %.3f s\n", elapsed);
```

**Amdahl's law reminder:** if 20% of your code is serial, the maximum speedup from parallelizing the rest is 5x, regardless of how many cores you have. Profile first (`perf`, VTune) to find the serial bottleneck before adding pragmas everywhere.

Set thread count: `OMP_NUM_THREADS=4 ./myapp` or `omp_set_num_threads(4)`. Default is the number of hardware threads.
