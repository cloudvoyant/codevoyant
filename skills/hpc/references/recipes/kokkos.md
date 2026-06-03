# Kokkos: Performance Portability

Kokkos lets you write a single C++ implementation that compiles and runs efficiently on CUDA GPUs, AMD ROCm/HIP, Intel GPUs (SYCL), and multicore CPUs (OpenMP/pthreads). It is the most widely used performance portability layer in scientific HPC.

## Installation (CMake FetchContent)

```cmake
# CMakeLists.txt
include(FetchContent)
FetchContent_Declare(
  Kokkos
  GIT_REPOSITORY https://github.com/kokkos/kokkos.git
  GIT_TAG        4.3.01
)
FetchContent_MakeAvailable(Kokkos)
target_link_libraries(my_app Kokkos::kokkos)
```

Build with CUDA backend:

```bash
cmake -DKokkos_ENABLE_CUDA=ON -DKokkos_ARCH_AMPERE86=ON ..
```

Build with OpenMP backend (CPU):

```bash
cmake -DKokkos_ENABLE_OPENMP=ON ..
```

Same source code compiles for both -- only the CMake flags change.

## Core Concepts

**Execution Spaces** -- where code runs: `Kokkos::DefaultExecutionSpace` (auto-selects GPU if available), `Kokkos::OpenMP`, `Kokkos::Cuda`, `Kokkos::HIP`.

**Memory Spaces** -- where data lives: `Kokkos::DefaultMemorySpace` (device), `Kokkos::HostSpace`, `Kokkos::CudaUVMSpace` (unified memory).

## Views: The Portable Array

```cpp
#include <Kokkos_Core.hpp>

// 2D array, layout auto-chosen for the execution space
Kokkos::View<double**> A("A", N, M);

// Host mirror for initialization
auto A_host = Kokkos::create_mirror_view(A);
for (int i = 0; i < N; ++i)
    for (int j = 0; j < M; ++j)
        A_host(i, j) = static_cast<double>(i * M + j);

// Copy to device
Kokkos::deep_copy(A, A_host);
```

## parallel_for

```cpp
Kokkos::parallel_for("my_kernel", N, KOKKOS_LAMBDA(int i) {
    A(i) = 2.0 * A(i);  // runs on GPU or CPU depending on build
});
Kokkos::fence();  // wait for completion
```

## parallel_reduce

```cpp
double sum = 0.0;
Kokkos::parallel_reduce("sum", N,
    KOKKOS_LAMBDA(int i, double& local_sum) {
        local_sum += A(i);
    }, sum);
// sum now holds the total
```

## parallel_scan (Prefix Sum)

```cpp
Kokkos::parallel_scan("scan", N,
    KOKKOS_LAMBDA(int i, double& partial, bool is_final) {
        double val = A(i);
        if (is_final) B(i) = partial;
        partial += val;
    });
```

## Thread Teams (Hierarchical Parallelism)

```cpp
using team_policy = Kokkos::TeamPolicy<>;
using member_type = team_policy::member_type;

Kokkos::parallel_for(team_policy(league_size, team_size),
    KOKKOS_LAMBDA(member_type member) {
        int league_rank = member.league_rank();

        Kokkos::parallel_for(
            Kokkos::TeamThreadRange(member, M),
            [&](int j) {
                B(league_rank, j) = A(league_rank, j) * 2.0;
            });
    });
```

## Scratch Memory (Shared Memory on GPU)

```cpp
size_t scratch_size = Kokkos::View<double*, Kokkos::DefaultExecutionSpace::scratch_memory_space>
    ::shmem_size(tile_size);

Kokkos::parallel_for(team_policy(N/tile_size, team_size).set_scratch_size(0, Kokkos::PerTeam(scratch_size)),
    KOKKOS_LAMBDA(member_type member) {
        Kokkos::View<double*, Kokkos::DefaultExecutionSpace::scratch_memory_space>
            tile(member.team_scratch(0), tile_size);
        // ... use tile as shared memory
    });
```

## Initialization and Finalization

```cpp
int main(int argc, char* argv[]) {
    Kokkos::initialize(argc, argv);
    {
        // all Kokkos code in this scope
    }
    Kokkos::finalize();
}
```

## When to Use Kokkos vs Alternatives

- **Kokkos:** multi-target codebase, scientific applications that need to run on NVIDIA + AMD + CPU
- **Raw CUDA:** NVIDIA-only, need maximum control over memory hierarchy
- **OpenMP:** CPU-only, simpler requirements
- **SYCL:** Intel-centric, or if you already have oneAPI toolchain

## CMake + Kokkos + MPI (Common HPC Pattern)

```cmake
find_package(MPI REQUIRED)
target_link_libraries(my_app Kokkos::kokkos MPI::MPI_CXX)
```
