# GPU Compute with SYCL/oneAPI

## Why SYCL

CUDA only targets NVIDIA GPUs. SYCL is an open standard (Khronos Group) that targets Intel GPUs, NVIDIA GPUs (via CUDA backend), AMD GPUs (via ROCm/HIP backend), and even FPGAs — all from a single C++ codebase. Intel's oneAPI implementation (DPC++) is the most mature SYCL compiler, but AdaptiveCpp (formerly hipSYCL) and ComputeCpp also exist.

The tradeoff: SYCL is marginally more verbose than CUDA, and the multi-backend story works better for standard operations than for advanced features like warp-level primitives. NVIDIA-specific optimizations (tensor cores, cooperative groups) are easier to reach through CUDA. But if your organization targets multiple GPU vendors — or may need to in the future — SYCL avoids vendor lock-in.

## SYCL Concepts

### Queue

A `sycl::queue` is the connection between your code and a device. Every kernel submission and memory operation goes through a queue:

```cpp
#include <sycl/sycl.hpp>

// select the default device (usually a GPU if available)
sycl::queue q;

// explicitly select a GPU
sycl::queue q_gpu{sycl::gpu_selector_v};

// select CPU (useful for debugging)
sycl::queue q_cpu{sycl::cpu_selector_v};

std::cout << "Running on: "
          << q.get_device().get_info<sycl::info::device::name>() << "\n";
```

### Buffers and Accessors

SYCL's buffer/accessor model manages data dependencies automatically. A `sycl::buffer` owns data; a `sycl::accessor` provides typed access within a kernel and declares the access mode (read, write, read_write):

```cpp
std::vector<float> host_data(1024, 1.0f);

{
    sycl::buffer<float, 1> buf(host_data.data(), sycl::range<1>(1024));

    q.submit([&](sycl::handler& h) {
        auto acc = buf.get_access<sycl::access::mode::read_write>(h);
        h.parallel_for(sycl::range<1>(1024), [=](sycl::id<1> idx) {
            acc[idx] *= 2.0f;
        });
    });
} // buffer destructor blocks until kernel completes and copies data back

// host_data is now updated
```

Buffers are safer than raw pointers because the runtime tracks data dependencies between kernels. If kernel B reads a buffer that kernel A writes, the runtime automatically inserts a dependency. No manual synchronization needed.

### Events

`sycl::event` provides explicit synchronization when you need it:

```cpp
sycl::event e = q.submit([&](sycl::handler& h) {
    // kernel work
});

e.wait(); // block until this specific submission completes

// or chain dependencies
q.submit([&](sycl::handler& h) {
    h.depends_on(e); // wait for previous kernel
    // next kernel
});
```

## Writing a SYCL Kernel

Element-wise multiply — the same operation as the CUDA recipe for comparison:

```cpp
#include <sycl/sycl.hpp>
#include <vector>

int main() {
    const int n = 1 << 20;
    std::vector<float> a(n, 2.0f), b(n, 3.0f), c(n);

    sycl::queue q{sycl::gpu_selector_v};

    {
        sycl::buffer buf_a(a.data(), sycl::range<1>(n));
        sycl::buffer buf_b(b.data(), sycl::range<1>(n));
        sycl::buffer buf_c(c.data(), sycl::range<1>(n));

        q.submit([&](sycl::handler& h) {
            auto acc_a = buf_a.get_access<sycl::access::mode::read>(h);
            auto acc_b = buf_b.get_access<sycl::access::mode::read>(h);
            auto acc_c = buf_c.get_access<sycl::access::mode::write>(h);

            h.parallel_for(sycl::range<1>(n), [=](sycl::id<1> idx) {
                acc_c[idx] = acc_a[idx] * acc_b[idx];
            });
        });
    } // buffers sync back to host here

    // c now contains element-wise products
}
```

Compared to the CUDA version: no `cudaMalloc`/`cudaMemcpy`, no manual grid/block calculation. The SYCL runtime chooses the work-group size. You can override it with `sycl::nd_range` when you need explicit control:

```cpp
h.parallel_for(
    sycl::nd_range<1>(sycl::range<1>(n), sycl::range<1>(256)),
    [=](sycl::nd_item<1> item) {
        int idx = item.get_global_id(0);
        if (idx < n) acc_c[idx] = acc_a[idx] * acc_b[idx];
    });
```

## Unified Shared Memory (USM)

USM provides pointer-based programming closer to CUDA's memory model. Three allocation types:

```cpp
// Device allocation — accessible only on the device
float* d_ptr = sycl::malloc_device<float>(n, q);

// Shared allocation — accessible from both host and device, migrated automatically
float* s_ptr = sycl::malloc_shared<float>(n, q);

// Host allocation — on host but accessible from device (slow device access)
float* h_ptr = sycl::malloc_host<float>(n, q);
```

With USM, kernels use raw pointers instead of accessors:

```cpp
float* a = sycl::malloc_shared<float>(n, q);
float* b = sycl::malloc_shared<float>(n, q);
float* c = sycl::malloc_shared<float>(n, q);

// initialize on host
for (int i = 0; i < n; i++) { a[i] = 2.0f; b[i] = 3.0f; }

q.parallel_for(sycl::range<1>(n), [=](sycl::id<1> idx) {
    c[idx] = a[idx] * b[idx];
}).wait();

sycl::free(a, q);
sycl::free(b, q);
sycl::free(c, q);
```

When to use USM vs buffers:
- **USM** when porting CUDA code (similar pointer semantics), when you need fine-grained control over data placement, or when the buffer/accessor verbosity is a barrier.
- **Buffers** when you want the runtime to manage dependencies automatically, when correctness is more important than squeezing out the last bit of control.

## oneAPI DPC++ and icpx

Intel's oneAPI DPC++ compiler (`icpx`) is the primary SYCL implementation. Install via the oneAPI Base Toolkit:

```bash
# Intel APT repository (Ubuntu)
sudo apt install intel-oneapi-compiler-dpcpp-cpp

# set up environment
source /opt/intel/oneapi/setvars.sh

# compile
icpx -fsycl main.cpp -o main
```

CMake integration:

```cmake
cmake_minimum_required(VERSION 3.20)
project(myproject LANGUAGES CXX)

find_package(IntelSYCL REQUIRED)
# or use the compiler directly:
# set(CMAKE_CXX_COMPILER icpx)
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsycl")

add_executable(myapp main.cpp)
add_sycl_to_target(TARGET myapp SOURCES main.cpp)
```

## Backend Portability

The promise of SYCL: one source, multiple backends.

**Intel GPUs (default):**

```bash
icpx -fsycl main.cpp -o main
```

**NVIDIA GPUs:**

```bash
icpx -fsycl -fsycl-targets=nvptx64-nvidia-cuda main.cpp -o main
```

**AMD GPUs (via AdaptiveCpp):**

```bash
acpp --acpp-targets="hip:gfx90a" main.cpp -o main
```

In practice, basic operations (parallel_for, reductions, memory management) work across all backends. Advanced features (sub-groups, specific memory hierarchies) may behave differently or have performance variations across backends. Always profile on the target hardware.

## oneMKL

Intel's oneAPI Math Kernel Library provides SYCL interfaces for BLAS, LAPACK, FFT, RNG, and sparse linear algebra. It works across backends:

```cpp
#include <oneapi/mkl.hpp>

sycl::queue q{sycl::gpu_selector_v};

// GEMM: C = alpha * A * B + beta * C
oneapi::mkl::blas::column_major::gemm(
    q,
    oneapi::mkl::transpose::nontrans,
    oneapi::mkl::transpose::nontrans,
    m, n, k,
    1.0f,      // alpha
    d_A, lda,
    d_B, ldb,
    0.0f,      // beta
    d_C, ldc
).wait();
```

oneMKL dispatches to the optimal backend library automatically — MKL on Intel CPUs, cuBLAS on NVIDIA GPUs, rocBLAS on AMD GPUs. This is the strongest argument for SYCL in scientific computing: write the linear algebra once, and it runs optimally everywhere.

## When to Choose SYCL Over CUDA

**Choose SYCL when:**
- Your deployment targets multiple GPU vendors (Intel + NVIDIA, or NVIDIA + AMD)
- Your organization is standardizing on Intel's oneAPI ecosystem
- Long-term portability matters more than squeezing the last 5% of NVIDIA-specific performance
- You want a single C++ codebase without `#ifdef` blocks for each GPU vendor

**Choose CUDA when:**
- You only target NVIDIA GPUs and always will
- You need NVIDIA-specific features (tensor cores, NCCL, cuDNN)
- Your team already has deep CUDA expertise
- You need the richest ecosystem of third-party libraries and community examples

**The pragmatic middle ground:** write performance-critical kernels in CUDA if you need them, and use SYCL for the rest of the application. Or use vendor math libraries (oneMKL, cuBLAS) through SYCL's dispatch layer and avoid writing kernels at all.
