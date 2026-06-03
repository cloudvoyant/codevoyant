---
name: hpc
description: "High-performance computing — threading, SIMD, GPU compute with CUDA/SYCL, MPI clustering, Python parallelism, and distributed Ray. Load when working with parallel algorithms, GPU kernels, multi-node clusters, or performance-critical Python/C++ code."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# hpc · experimental

Context skill for high-performance and distributed computing in Python and C++.

## Philosophy

Performance work is measurement-driven. Every recipe follows the same pattern: establish a baseline, apply the technique, measure the improvement. Techniques that can't be measured shouldn't be applied. Recipes cover threading, SIMD, GPU compute, MPI clustering, and distributed Python with Ray — from laptop to multi-node cluster.

## Recipes

- [C++ Threading Primitives](./hpc/recipes/cpp-threading) — std::thread, std::async, std::jthread; thread-safe patterns
- [OpenMP](./hpc/recipes/openmp) — pragma-based loop/section parallelism; reduction patterns
- [Intel TBB](./hpc/recipes/tbb) — task graphs, parallel_for, pipeline, flow graph
- [SIMD with AVX2/NEON](./hpc/recipes/simd) — intrinsics, auto-vectorization, measurement
- [GPU Compute with CUDA](./hpc/recipes/cuda) — kernels, memory hierarchy, streams, Nsight
- [GPU Compute with SYCL/oneAPI](./hpc/recipes/sycl) — write-once GPU code for Intel/NVIDIA/AMD
- [MPI Fundamentals](./hpc/recipes/mpi) — point-to-point, collectives, MPI+OpenMP hybrid
- [Python Parallelism](./hpc/recipes/python-parallelism) — multiprocessing, threading, asyncio; GIL
- [Distributed Compute with Ray](./hpc/recipes/ray-distributed) — tasks, actors, placement groups, clusters
- [HPC Project Conventions](./hpc/recipes/hpc-conventions) — CMake setup, profiling tools, benchmarking
- [Thrust: GPU Parallel Algorithms](./hpc/recipes/thrust) — STL-style sort/reduce/scan/transform on GPU, device_vector, fancy iterators, stream-async
- [Kokkos: Performance Portability](./hpc/recipes/kokkos) — write-once C++ for CUDA/HIP/OpenMP/SYCL, Views, parallel_for/reduce/scan, thread teams
- [NVIDIA Warp (Python GPU)](./hpc/recipes/warp-gpu) — Python kernels compiled to PTX, tiles, streams, autodiff, simulation loops

## References

- [OpenMP specification](https://www.openmp.org/specifications/)
- [Intel TBB documentation](https://uxlfoundation.github.io/oneTBB/)
- [CUDA Programming Guide](https://docs.nvidia.com/cuda/cuda-c-programming-guide/)
- [Ray documentation](https://docs.ray.io/en/latest/)
- [MPI Forum](https://www.mpi-forum.org/docs/)
