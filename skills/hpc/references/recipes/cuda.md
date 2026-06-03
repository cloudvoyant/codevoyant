# GPU Compute with CUDA

## Why GPU Compute

A modern GPU has 5,000 to 20,000 CUDA cores. A CPU has 8 to 64. GPU cores are simpler and slower individually, but the aggregate throughput for data-parallel workloads (matrix multiply, convolution, voxel processing, particle simulation) exceeds any CPU by 10-100x. The catch: data must reside on the GPU, branching is expensive, and thread divergence within a warp destroys performance. GPU compute pays off when you have thousands of identical operations over large data and can tolerate the cost of moving that data across PCIe.

## The CUDA Programming Model

CUDA organizes parallelism into a three-level hierarchy:

**Grid** — the entire launch. One grid per kernel invocation. A grid contains blocks.

**Block** — a group of threads that can cooperate via shared memory and synchronization (`__syncthreads()`). Blocks are independently scheduled on streaming multiprocessors (SMs). Block size is typically 128 or 256 threads. Too small wastes SM resources; too large limits occupancy.

**Thread** — the smallest unit. Each thread has its own registers and a unique position identified by `threadIdx` and `blockIdx`.

You think in blocks, not individual threads. The block is the unit of scheduling, shared memory allocation, and synchronization.

### Warps

Every block is divided into warps of 32 threads. Threads within a warp execute the same instruction in lockstep (SIMT). If threads in a warp diverge on a branch (`if/else`), both paths execute serially — the warp masks off inactive threads. This is thread divergence, and it's the single most common performance pitfall in CUDA code.

### The Memory Hierarchy

| Level | Scope | Size | Latency | Notes |
|-------|-------|------|---------|-------|
| Registers | Per-thread | ~255 32-bit | 0 cycles | Fastest; spill to local memory if you use too many |
| Shared memory | Per-block | 48-164 KB | ~5 cycles | Explicitly managed; the key to high-performance kernels |
| L1/L2 cache | Per-SM / chip | 128 KB / 4-6 MB | 30-200 cycles | Automatic; L1 shares physical memory with shared |
| Global memory | All threads | 8-80 GB (HBM) | 400-600 cycles | High bandwidth (1-3 TB/s) but high latency |

The performance gap between shared memory and global memory is 20-100x. Kernels that repeatedly read from global memory leave most of the GPU idle.

## Writing a Kernel

A CUDA kernel is a `__global__` function launched from the host with grid/block dimensions:

```cpp
__global__ void multiply(const float* a, const float* b, float* c, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        c[idx] = a[idx] * b[idx];
    }
}

int main() {
    int n = 1 << 20; // ~1 million elements
    int blockSize = 256;
    int gridSize = (n + blockSize - 1) / blockSize;

    float *d_a, *d_b, *d_c;
    cudaMalloc(&d_a, n * sizeof(float));
    cudaMalloc(&d_b, n * sizeof(float));
    cudaMalloc(&d_c, n * sizeof(float));

    // ... copy data to device ...

    multiply<<<gridSize, blockSize>>>(d_a, d_b, d_c, n);
    cudaDeviceSynchronize();

    // ... copy results back ...

    cudaFree(d_a);
    cudaFree(d_b);
    cudaFree(d_c);
}
```

The `<<<gridSize, blockSize>>>` syntax is CUDA-specific. `gridSize` is the number of blocks; `blockSize` is threads per block. The `if (idx < n)` guard handles the case where the total thread count exceeds the array size.

## Memory Management

### The C API

```cpp
float* d_ptr;
cudaMalloc(&d_ptr, size);                           // allocate on device
cudaMemcpy(d_ptr, h_ptr, size, cudaMemcpyHostToDevice); // host -> device
cudaMemcpy(h_ptr, d_ptr, size, cudaMemcpyDeviceToHost); // device -> host
cudaFree(d_ptr);
```

Every `cudaMalloc` must have a matching `cudaFree`. Forgetting `cudaFree` leaks GPU memory, and unlike CPU memory, the OS doesn't reclaim it when the process exits on all platforms.

### Unified Memory

`cudaMallocManaged` allocates memory accessible from both CPU and GPU. The driver migrates pages on demand:

```cpp
float* data;
cudaMallocManaged(&data, n * sizeof(float));

// initialize on CPU
for (int i = 0; i < n; i++) data[i] = i;

// use on GPU
kernel<<<grid, block>>>(data, n);
cudaDeviceSynchronize();

// read back on CPU — no explicit copy
printf("%f\n", data[0]);

cudaMallocManaged is simpler for prototyping. The caveat: page migration overhead can be significant for large allocations with irregular access patterns. Profile before committing to it in production.
```

### Pinned Memory

`cudaMallocHost` allocates page-locked (pinned) host memory. PCIe transfers from pinned memory are 2-3x faster than from pageable memory because the driver skips the staging copy:

```cpp
float* h_pinned;
cudaMallocHost(&h_pinned, size);
// use cudaMemcpyAsync with pinned memory for overlap
cudaFreeHost(h_pinned);
```

Pinned memory reduces available system RAM for other processes. Allocate only what you need for active transfers.

## CUDA Streams

By default, all CUDA operations go into the default stream and execute sequentially. Streams enable overlapping computation with data transfer:

```cpp
cudaStream_t stream1, stream2;
cudaStreamCreate(&stream1);
cudaStreamCreate(&stream2);

// Stream 1: copy first half, compute first half
cudaMemcpyAsync(d_a, h_a, half_size, cudaMemcpyHostToDevice, stream1);
kernel<<<grid, block, 0, stream1>>>(d_a, d_out, half_n);

// Stream 2: copy second half, compute second half (overlaps with stream1)
cudaMemcpyAsync(d_a + half_n, h_a + half_n, half_size, cudaMemcpyHostToDevice, stream2);
kernel<<<grid, block, 0, stream2>>>(d_a + half_n, d_out + half_n, half_n);

cudaStreamSynchronize(stream1);
cudaStreamSynchronize(stream2);
cudaStreamDestroy(stream1);
cudaStreamDestroy(stream2);
```

Streams require pinned host memory (`cudaMallocHost`) to overlap transfers with computation. With pageable memory, `cudaMemcpyAsync` falls back to synchronous behavior.

## Shared Memory Pattern

The classic tiling technique for matrix multiply loads sub-blocks of the input matrices into shared memory, reducing global memory accesses from O(N) per element to O(N/tile_size):

```cpp
__global__ void matmul_tiled(const float* A, const float* B, float* C, int N) {
    const int TILE = 16;
    __shared__ float tileA[TILE][TILE];
    __shared__ float tileB[TILE][TILE];

    int row = blockIdx.y * TILE + threadIdx.y;
    int col = blockIdx.x * TILE + threadIdx.x;
    float sum = 0.0f;

    for (int t = 0; t < N / TILE; t++) {
        tileA[threadIdx.y][threadIdx.x] = A[row * N + t * TILE + threadIdx.x];
        tileB[threadIdx.y][threadIdx.x] = B[(t * TILE + threadIdx.y) * N + col];
        __syncthreads();

        for (int k = 0; k < TILE; k++) {
            sum += tileA[threadIdx.y][k] * tileB[k][threadIdx.x];
        }
        __syncthreads();
    }

    C[row * N + col] = sum;
}
```

This is 5-10x faster than naive global memory access for large matrices. The `__syncthreads()` calls ensure all threads have loaded their tile elements before any thread starts computing, and that computation is complete before the next tile is loaded.

## CMake Setup

Two approaches for building CUDA with CMake:

**Native CUDA language support (preferred for CUDA-only projects):**

```cmake
cmake_minimum_required(VERSION 3.18)
project(myproject LANGUAGES CXX CUDA)

add_executable(myapp main.cu kernels.cu)
set_target_properties(myapp PROPERTIES CUDA_ARCHITECTURES "86;89")
target_compile_options(myapp PRIVATE $<$<COMPILE_LANGUAGE:CUDA>:--expt-relaxed-constexpr>)
```

**CUDAToolkit package (when mixing CUDA libraries with a C++ project):**

```cmake
project(myproject LANGUAGES CXX)
find_package(CUDAToolkit REQUIRED)
target_link_libraries(myapp PRIVATE CUDA::cudart CUDA::cublas)
```

Set `CUDA_ARCHITECTURES` to match your target GPUs. Common values: `75` (Turing/T4), `80` (Ampere/A100), `86` (RTX 3000), `89` (Ada/RTX 4000), `90` (Hopper/H100).

## Conan Setup

CUDA is a system dependency, not a Conan package. Your `conanfile.py` doesn't need to declare it. Use CMake's `find_package(CUDAToolkit)` and ensure the CUDA toolkit is installed on the build machine. If your project depends on Conan packages that use CUDA (e.g., some builds of OpenCV), pass `--settings compiler.cuda_version=12.x` to Conan.

## Profiling with Nsight

**Nsight Systems** (`nsys`) gives a timeline view of the entire application — CPU, GPU, memory transfers, API calls:

```bash
nsys profile --stats=true ./my_cuda_app
# produces a .nsys-rep file; open in Nsight Systems GUI
```

**Nsight Compute** (`ncu`) profiles individual kernels in detail — occupancy, memory throughput, instruction mix:

```bash
ncu --set full -o profile_report ./my_cuda_app
# produces a .ncu-rep file; open in Nsight Compute GUI
```

Key metrics to check:
- **Achieved occupancy** — percentage of maximum warps active. Below 50% usually means the block size or register usage needs tuning.
- **Memory throughput** — how close to peak bandwidth. Memory-bound kernels should be near the roofline.
- **Compute throughput** — how close to peak FLOPS. Compute-bound kernels benefit from algorithm changes, not memory optimizations.

The roofline model plots achievable FLOPS against arithmetic intensity (FLOPS/byte). If your kernel is below the roofline, it's either memory-bound (optimize memory access) or compute-bound (optimize arithmetic).

## cuBLAS, cuFFT, and Thrust

Before writing a custom kernel, check if NVIDIA already ships a library for your operation:

**cuBLAS** — GPU-accelerated BLAS (matrix multiply, dot product, etc.). `cublasSgemm` for single-precision matrix multiply is heavily optimized and almost impossible to beat with hand-written code.

**cuFFT** — GPU-accelerated FFT. `cufftPlanMany` for batched transforms; 10-50x faster than FFTW on large batches.

**Thrust** — STL-like algorithms for the GPU. Sort, scan, reduce, transform without writing kernels:

```cpp
#include <thrust/device_vector.h>
#include <thrust/sort.h>

thrust::device_vector<int> d_vec(h_vec.begin(), h_vec.end());
thrust::sort(d_vec.begin(), d_vec.end());
// copy back
thrust::copy(d_vec.begin(), d_vec.end(), h_vec.begin());
```

Thrust is the right choice when the operation maps to a standard algorithm. It handles memory management, kernel launches, and architecture-specific optimizations.

## Python: CuPy

CuPy is a drop-in NumPy replacement that runs on the GPU:

```python
import cupy as cp
import numpy as np

# create on GPU
a_gpu = cp.random.rand(10000, 10000, dtype=cp.float32)
b_gpu = cp.random.rand(10000, 10000, dtype=cp.float32)

# matrix multiply on GPU — uses cuBLAS internally
c_gpu = a_gpu @ b_gpu

# move to CPU when needed
c_cpu = cp.asnumpy(c_gpu)

# move existing numpy array to GPU
x_gpu = cp.asarray(np.array([1, 2, 3]))
```

CuPy supports most NumPy operations, scipy-compatible sparse matrices, and custom CUDA kernels via `cp.RawKernel`. For deep learning preprocessing, CuPy + GPU is often 10-50x faster than NumPy + CPU for the same operations.

When CuPy beats custom CUDA: prototyping, array operations that map to existing NumPy patterns, pipelines where you want to stay in Python. When custom kernels beat CuPy: fused operations that CuPy can't express in a single call, latency-critical paths where Python overhead matters.
