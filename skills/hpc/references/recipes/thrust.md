# Thrust: GPU Parallel Algorithms

Thrust is to CUDA what the C++ STL is to CPU code. If you need parallel sort, reduce, scan, or transform on GPU data and don't want to write kernels, reach for Thrust first.

## Setup

Thrust ships with CUDA toolkit (10.0+). Header-only, no separate install.

```cpp
#include <thrust/device_vector.h>
#include <thrust/host_vector.h>
#include <thrust/sort.h>
#include <thrust/transform.h>
#include <thrust/reduce.h>
#include <thrust/scan.h>
```

## Host and Device Vectors

```cpp
// Data lives on host
thrust::host_vector<float> h_vec(1000, 1.0f);

// Copy to GPU — single line
thrust::device_vector<float> d_vec = h_vec;

// Back to host
thrust::host_vector<float> result = d_vec;
```

## Sort

```cpp
thrust::device_vector<int> d_keys = {5, 2, 8, 1, 9, 3};
thrust::sort(d_keys.begin(), d_keys.end());
// stable_sort, sort_by_key (co-sort values with keys)

thrust::device_vector<float> d_values = {0.1f, 0.2f, 0.3f, 0.4f, 0.5f, 0.6f};
thrust::sort_by_key(d_keys.begin(), d_keys.end(), d_values.begin());
```

## Reduce and Transform

```cpp
// Sum
float total = thrust::reduce(d_vec.begin(), d_vec.end(), 0.0f, thrust::plus<float>());

// Max element
float max_val = thrust::reduce(d_vec.begin(), d_vec.end(),
                               -FLT_MAX, thrust::maximum<float>());

// Transform: square each element in-place
thrust::transform(d_vec.begin(), d_vec.end(), d_vec.begin(),
                  [] __device__ (float x) { return x * x; });

// Transform two vectors element-wise
thrust::transform(d_a.begin(), d_a.end(), d_b.begin(), d_out.begin(),
                  thrust::plus<float>());
```

## Prefix Scan

```cpp
// Exclusive scan: out[i] = sum(in[0..i-1])
thrust::exclusive_scan(d_vec.begin(), d_vec.end(), d_out.begin());

// Inclusive scan: out[i] = sum(in[0..i])
thrust::inclusive_scan(d_vec.begin(), d_vec.end(), d_out.begin());
```

## Counting and Fancy Iterators

```cpp
// counting_iterator: generate 0,1,2,...N without allocating
thrust::counting_iterator<int> first(0);
thrust::counting_iterator<int> last = first + 1000;

// constant_iterator: broadcast a single value
thrust::constant_iterator<float> const_iter(3.14f);

// zip_iterator: iterate over two vectors in lockstep
auto zip = thrust::make_zip_iterator(thrust::make_tuple(d_x.begin(), d_y.begin()));
```

## Custom Functors

```cpp
struct AbsoluteDifference {
    __host__ __device__
    float operator()(float a, float b) const { return fabsf(a - b); }
};

thrust::transform(d_a.begin(), d_a.end(), d_b.begin(), d_out.begin(),
                  AbsoluteDifference());
```

## Interop with Raw CUDA

```cpp
// Get raw pointer from device_vector for kernel calls
float* raw_ptr = thrust::raw_pointer_cast(d_vec.data());
my_kernel<<<grid, block>>>(raw_ptr, d_vec.size());
```

## When to Use Thrust vs Raw CUDA

- **Thrust:** sort, reduce, scan, filter (copy_if), unique, binary search on GPU data
- **Raw CUDA:** custom memory access patterns, tiling, warp-level primitives, anything Thrust doesn't have

## Performance: Async Execution with Streams

Thrust calls synchronize by default. For asynchronous execution, use `thrust::cuda::par.on(stream)`:

```cpp
cudaStream_t stream;
cudaStreamCreate(&stream);
thrust::sort(thrust::cuda::par.on(stream), d_vec.begin(), d_vec.end());
```
