# HPC Project Conventions

## Why Conventions Matter More in HPC

HPC code is often written under deadline pressure and then maintained for years. Performance regressions are silent — there is no compilation error when a loop runs 5x slower than it should. Without conventions, benchmarks accumulate tech debt, profiles become uninterpretable, and no one can tell whether a change made things faster or slower.

Conventions in HPC serve three purposes: making builds reproducible, making performance measurable, and making regressions detectable.

## CMake Setup for HPC Projects

### Finding Dependencies

The standard sequence for an HPC CMake project:

```cmake
cmake_minimum_required(VERSION 3.20)
project(my_hpc_project LANGUAGES CXX)

find_package(OpenMP REQUIRED)
find_package(TBB REQUIRED)
find_package(MPI REQUIRED)

# For CUDA
enable_language(CUDA)
# or: find_package(CUDAToolkit REQUIRED)
```

### Separate Targets Per Backend

Each parallelism backend should be a separate CMake target. Do not pile `-fopenmp`, TBB includes, and MPI flags onto one target — it makes builds fragile and makes it impossible to test backends in isolation.

```cmake
# Serial baseline
add_library(solver_serial solver.cpp)
target_compile_features(solver_serial PUBLIC cxx_std_17)

# OpenMP variant
add_library(solver_omp solver_omp.cpp)
target_link_libraries(solver_omp PRIVATE OpenMP::OpenMP_CXX)

# TBB variant
add_library(solver_tbb solver_tbb.cpp)
target_link_libraries(solver_tbb PRIVATE TBB::tbb)

# MPI variant
add_library(solver_mpi solver_mpi.cpp)
target_link_libraries(solver_mpi PRIVATE MPI::MPI_CXX)

# CUDA variant
add_library(solver_cuda solver.cu)
set_target_properties(solver_cuda PROPERTIES CUDA_ARCHITECTURES "70;80;90")
```

This structure lets you benchmark each variant independently and catch regressions per backend.

### Compiler Flags

**Development builds**: Use `-march=native` to enable all CPU features available on the development machine. This gives the compiler access to AVX2, AVX-512, or NEON and produces the fastest code for that specific CPU.

**Release builds**: Use `-march=x86-64-v3` for portable binaries that run on any x86-64 CPU with AVX2 (which is everything from ~2013 onwards). This avoids the "works on my machine" problem where a binary compiled with `-march=native` on an AVX-512 machine crashes on an older node.

```cmake
if(CMAKE_BUILD_TYPE STREQUAL "Debug" OR CMAKE_BUILD_TYPE STREQUAL "RelWithDebInfo")
    target_compile_options(my_target PRIVATE -march=native)
else()
    target_compile_options(my_target PRIVATE -march=x86-64-v3)
endif()
```

### Sanitizers

**AddressSanitizer** for memory errors (buffer overflows, use-after-free, memory leaks). Run on serial code — ASan does not understand OpenMP or MPI:

```cmake
target_compile_options(my_target PRIVATE -fsanitize=address -fno-omit-frame-pointer)
target_link_options(my_target PRIVATE -fsanitize=address)
```

**ThreadSanitizer** for race conditions in threaded code. Works with `std::thread` and OpenMP:

```cmake
target_compile_options(my_target PRIVATE -fsanitize=thread)
target_link_options(my_target PRIVATE -fsanitize=thread)
```

Do not combine ASan and TSan in the same build — they conflict. Use separate CMake presets or build directories.

## Profiling Tools

### C++ Profiling

**`perf stat`** (Linux): Hardware counters in one command. Shows instructions per cycle (IPC), cache misses, branch mispredictions:

```bash
perf stat ./my_benchmark
```

An IPC below 1.0 usually means memory-bound. Above 2.0 is compute-bound. Between 1.0 and 2.0 is mixed.

**`perf record` + `perf report`**: Sampling profiler that produces flame graphs. Low overhead (~2-5%), works on optimized binaries, no recompilation needed:

```bash
perf record -g ./my_benchmark
perf report
# or generate a flame graph:
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg
```

**Intel VTune**: The most detailed microarchitecture profiler. Use it when `perf` tells you "memory-bound" but you need to know whether it's L1 misses, L2 misses, or TLB misses. VTune's "Microarchitecture Exploration" analysis gives per-instruction pipeline stall breakdowns.

**`valgrind --tool=callgrind`**: Cache simulation and call graph analysis. Much slower than sampling (10-100x), but deterministic — useful when you need reproducible results across runs:

```bash
valgrind --tool=callgrind ./my_benchmark
kcachegrind callgrind.out.*
```

### Python Profiling

**`py-spy`**: Sampling profiler that attaches to a running Python process with no code changes and near-zero overhead. The best first tool:

```bash
py-spy top --pid 12345
py-spy record -o profile.svg -- python my_script.py
```

**`cProfile` + `snakeviz`**: Built-in deterministic profiler. Higher overhead than sampling, but gives exact call counts:

```bash
python -m cProfile -o profile.pstats my_script.py
snakeviz profile.pstats  # opens interactive visualization in browser
```

**`line_profiler`**: Line-by-line timing for specific functions. Decorate functions with `@profile` and run with `kernprof`:

```bash
kernprof -l -v my_script.py
```

Use `line_profiler` after you have identified the hot function with `py-spy` or `cProfile`. Do not profile entire programs line-by-line — the overhead is too high.

### GPU Profiling

**`nsys profile`** (Nsight Systems): Timeline view of CPU and GPU activity. Shows kernel launches, memory transfers, and idle gaps:

```bash
nsys profile --stats=true ./my_cuda_app
nsys-ui report.nsys-rep  # open the GUI
```

**`ncu`** (Nsight Compute): Kernel-level metrics. Shows occupancy, memory throughput, compute throughput, and warp stall reasons. Use after `nsys` identifies the slow kernel:

```bash
ncu --set full ./my_cuda_app
```

## Benchmarking Discipline

### Google Benchmark (C++)

The standard micro-benchmarking library for C++:

```cpp
#include <benchmark/benchmark.h>

static void BM_VectorSum(benchmark::State& state) {
    std::vector<double> v(state.range(0));
    std::iota(v.begin(), v.end(), 0.0);
    for (auto _ : state) {
        double sum = std::accumulate(v.begin(), v.end(), 0.0);
        benchmark::DoNotOptimize(sum);
    }
    state.SetBytesProcessed(
        state.iterations() * state.range(0) * sizeof(double)
    );
}
BENCHMARK(BM_VectorSum)->Range(1 << 10, 1 << 20);

BENCHMARK_MAIN();
```

**`benchmark::DoNotOptimize`**: Prevents the compiler from eliminating dead code. Without it, the compiler may realize `sum` is unused and remove the entire loop.

**`state.SetBytesProcessed`**: Reports throughput in bytes/s alongside wall time. Throughput is more informative than wall time for data-processing benchmarks.

### pytest-benchmark (Python)

Integrates benchmarking into pytest:

```python
def test_sort_performance(benchmark):
    data = list(range(10_000, 0, -1))
    result = benchmark(sorted, data)
    assert result == sorted(data)
```

Compare across runs:

```bash
pytest --benchmark-enable --benchmark-save=baseline
# make changes
pytest --benchmark-enable --benchmark-compare=0001_baseline
```

### The Rules

These rules prevent the most common benchmarking mistakes:

1. **Warm up the cache before timing.** Run the workload once (or a few times) before the timed loop. Cold-cache results are not representative of steady-state performance.

2. **Run 3+ times and take the median.** Arithmetic mean is skewed by outliers (GC pauses, OS interrupts). Median is robust.

3. **Disable CPU frequency scaling.** Dynamic frequency scaling introduces variance. On Linux:

```bash
sudo cpupower frequency-set -g performance
```

4. **Report throughput, not wall time alone.** "2.3 seconds" is meaningless without knowing how much data was processed. Report bytes/s, ops/s, or items/s.

5. **Pin the input size.** Do not let benchmarks use "whatever data is lying around." Fix the input and version-control it or generate it deterministically.

## Memory Access Patterns

Cache line size on modern CPUs is 64 bytes. Every memory access loads an entire cache line. This has consequences:

**Row-major vs column-major**: Accessing a 2D array column-by-column in a row-major language (C, C++) means each access loads a new cache line and uses only one element from it. Row-by-row access uses every element in each cache line. The difference is 10-100x for large arrays.

```cpp
// Fast: sequential access (row-major)
for (int i = 0; i < rows; i++)
    for (int j = 0; j < cols; j++)
        sum += matrix[i][j];

// Slow: strided access (column-major pattern in row-major storage)
for (int j = 0; j < cols; j++)
    for (int i = 0; i < rows; i++)
        sum += matrix[i][j];
```

**AoS vs SoA**: Array of Structures (AoS) stores each object's fields together. Structure of Arrays (SoA) stores each field in a separate array. SoA is better for SIMD and cache efficiency when you process one field at a time:

```cpp
// AoS: bad for SIMD, wastes cache when you only need x
struct Particle { float x, y, z, mass; };
std::vector<Particle> particles;

// SoA: good for SIMD, cache-friendly for per-field operations
struct Particles {
    std::vector<float> x, y, z, mass;
};
```

## Reproducibility

HPC results are meaningless if they cannot be reproduced. Record these with every benchmark run:

- **Hardware**: `lscpu` (CPU model, cache sizes, core count), `nvidia-smi` (GPU model, memory, driver version), `free -h` (available memory)
- **Compiler**: `g++ --version` or `nvcc --version`, and the exact flags used
- **Software**: Pin library versions in `CMakeLists.txt` (use `FetchContent` with specific tags) or `requirements.txt`
- **Configuration**: Number of threads (`OMP_NUM_THREADS`), MPI ranks, GPU count
- **Random seeds**: Pin them. Different seeds produce different results in stochastic workloads, making comparisons invalid.

Use `cmake --build . --config RelWithDebInfo` for benchmarks, not `Debug`. Debug builds disable optimizations and are not representative. `RelWithDebInfo` gives optimized code with debug symbols for profiling.

## uv and Python Project Conventions for HPC

For Python HPC projects, follow the patterns in `python/recipes/uv-workspace.md` with these additions:

**Pin numerical library versions tightly.** Minor version bumps in numpy, scipy, and numba can change performance characteristics (different BLAS backends, different vectorization strategies). Pin to exact versions in production:

```toml
[project]
dependencies = [
    "numpy==1.26.4",
    "scipy==1.12.0",
    "numba==0.59.1",
]
```

**Constraint files for consistency across environments.** Use `[tool.uv]` in `pyproject.toml` to point to a constraint file that locks transitive dependencies:

```toml
[tool.uv]
constraint-dependencies = [
    "numpy==1.26.4",
    "mkl==2024.1.0",
]
```

**Separate benchmark dependencies.** Keep benchmarking tools (`pytest-benchmark`, `py-spy`, `memory-profiler`) in a dev dependency group so they don't bloat production images:

```toml
[dependency-groups]
bench = [
    "pytest-benchmark>=4.0",
    "py-spy>=0.3",
    "memory-profiler>=0.61",
]
```
