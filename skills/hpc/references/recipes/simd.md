# SIMD with AVX2/NEON

## What SIMD Is

Single Instruction, Multiple Data. One CPU instruction operates on multiple data elements simultaneously:

- **SSE** (x86) — 128-bit registers, 4 floats at once
- **AVX2** (x86) — 256-bit registers, 8 floats at once
- **AVX-512** (x86, select CPUs) — 512-bit registers, 16 floats at once
- **NEON** (ARM/Apple Silicon) — 128-bit registers, 4 floats at once

SIMD is not threading. Threading runs code on multiple cores. SIMD runs a wider instruction on a single core, exploiting instruction-level parallelism within one execution unit. They compose: use threading across cores and SIMD within each core for maximum throughput.

## When SIMD Matters

SIMD pays off when:
- Data is tightly packed numeric arrays (`float`, `int32_t`, `uint8_t`)
- The hot loop has no branching (or branching can be converted to blending/masking)
- Data is aligned to 32 bytes (AVX2) or 16 bytes (SSE/NEON)
- The loop body is arithmetic — add, multiply, fused multiply-add

Expect 2-8x throughput improvement on qualifying workloads. Dot products, matrix multiply, image convolution, audio processing, and physics simulations are classic SIMD targets.

SIMD does not help when:
- The loop body is memory-bound (cache misses dominate, not arithmetic)
- There are complex conditionals per element
- Data is sparse or has irregular access patterns

## Auto-Vectorization

The compiler often vectorizes for you. The key flags:

```bash
# GCC / Clang
-O2 -march=native       # enables all SIMD for the local CPU
-O2 -march=x86-64-v3    # portable AVX2 (no AVX-512)
-ftree-vectorize         # on by default at -O2
-ffast-math              # allows reordering of float ops (enables more vectorization, changes results slightly)
```

**Check what the compiler did** — paste your function into [godbolt.org](https://godbolt.org/) and look for `vmulps`, `vaddps`, `vfmadd213ps` (AVX2) or `fmul v0.4s` (NEON). If you see scalar instructions (`mulss`, `addss`), the compiler failed to vectorize.

**Help the compiler:**

- **No aliasing:** use `__restrict__` on pointer parameters so the compiler knows arrays don't overlap:
  ```cpp
  void add(float* __restrict__ out,
           const float* __restrict__ a,
           const float* __restrict__ b, int n) {
      for (int i = 0; i < n; ++i) out[i] = a[i] + b[i];
  }
  ```
- **No side effects** in the loop body (no function calls the compiler can't inline)
- **Prefer `float` over `double`** — doubles halve the SIMD width
- **Use counted loops** with simple bounds (`for (int i = 0; i < n; ++i)`)
- **Align data:** `alignas(32) float data[1024];`

If auto-vectorization is sufficient for your workload, stop here. Intrinsics are harder to maintain and only worth writing when you need the last 20% of performance or when the compiler fails to vectorize a critical loop.

## AVX2 Intrinsics (x86)

Include:

```cpp
#include <immintrin.h>
```

### Load and Store

```cpp
// Aligned load (data must be 32-byte aligned)
__m256 v = _mm256_load_ps(ptr);

// Unaligned load (works on any address, slightly slower on older CPUs)
__m256 v = _mm256_loadu_ps(ptr);

// Aligned store
_mm256_store_ps(out_ptr, v);

// Ensure alignment
alignas(32) float data[8];
```

### Arithmetic

```cpp
__m256 a = _mm256_load_ps(src_a);
__m256 b = _mm256_load_ps(src_b);

__m256 sum  = _mm256_add_ps(a, b);      // a + b, 8 floats
__m256 prod = _mm256_mul_ps(a, b);      // a * b, 8 floats
__m256 fma  = _mm256_fmadd_ps(a, b, c); // a * b + c in one instruction (FMA3)
```

### Horizontal Reduction

Summing a `__m256` back to a scalar (e.g., for dot products):

```cpp
float hsum_avx(__m256 v) {
    __m128 lo = _mm256_castps256_ps128(v);       // lower 128 bits
    __m128 hi = _mm256_extractf128_ps(v, 1);     // upper 128 bits
    lo = _mm_add_ps(lo, hi);                      // 4 partial sums
    __m128 shuf = _mm_movehdup_ps(lo);            // [1,1,3,3]
    lo = _mm_add_ps(lo, shuf);                    // [0+1, -, 2+3, -]
    shuf = _mm_movehl_ps(shuf, lo);               // [2+3, -, -, -]
    lo = _mm_add_ss(lo, shuf);                    // final sum in element 0
    return _mm_cvtss_f32(lo);
}
```

### Worked Example: Dot Product with AVX2

```cpp
float dot_avx2(const float* __restrict__ a,
               const float* __restrict__ b, int n) {
    __m256 acc = _mm256_setzero_ps();

    int i = 0;
    for (; i + 8 <= n; i += 8) {
        __m256 va = _mm256_loadu_ps(a + i);
        __m256 vb = _mm256_loadu_ps(b + i);
        acc = _mm256_fmadd_ps(va, vb, acc); // acc += va * vb
    }

    float result = hsum_avx(acc);

    // Handle remaining elements (scalar tail)
    for (; i < n; ++i) {
        result += a[i] * b[i];
    }
    return result;
}
```

Key pattern: process 8 floats per iteration in the main loop, then handle the remainder with a scalar tail. The tail is typically negligible for large arrays.

## NEON Intrinsics (ARM/Apple Silicon)

Include:

```cpp
#include <arm_neon.h>
```

NEON has 128-bit registers (4 floats). The naming convention differs from x86:

| Operation | NEON | AVX2 equivalent |
|---|---|---|
| Load 4 floats | `vld1q_f32(ptr)` | `_mm_load_ps(ptr)` |
| Store 4 floats | `vst1q_f32(ptr, v)` | `_mm_store_ps(ptr, v)` |
| Add | `vaddq_f32(a, b)` | `_mm_add_ps(a, b)` |
| Multiply | `vmulq_f32(a, b)` | `_mm_mul_ps(a, b)` |
| FMA | `vfmaq_f32(c, a, b)` | `_mm_fmadd_ps(a, b, c)` |

Note the argument order difference: NEON FMA is `c + a*b` with accumulator first; x86 FMA is `a*b + c`.

### Horizontal Reduction (NEON)

```cpp
float hsum_neon(float32x4_t v) {
    float32x2_t sum = vadd_f32(vget_low_f32(v), vget_high_f32(v));
    sum = vpadd_f32(sum, sum);
    return vget_lane_f32(sum, 0);
}
```

### Worked Example: Dot Product with NEON

```cpp
float dot_neon(const float* __restrict__ a,
               const float* __restrict__ b, int n) {
    float32x4_t acc = vdupq_n_f32(0.0f);

    int i = 0;
    for (; i + 4 <= n; i += 4) {
        float32x4_t va = vld1q_f32(a + i);
        float32x4_t vb = vld1q_f32(b + i);
        acc = vfmaq_f32(acc, va, vb);
    }

    float result = hsum_neon(acc);

    for (; i < n; ++i) {
        result += a[i] * b[i];
    }
    return result;
}
```

Same pattern as AVX2: vectorized main loop, scalar tail. Process 4 floats at a time instead of 8.

## Portable SIMD

Writing separate AVX2 and NEON code is a maintenance burden. Alternatives:

**`std::experimental::simd` (C++26, formerly Parallelism TS v2):** Write-once, compiles to the best SIMD for the target. GCC has partial support via `<experimental/simd>`. Clang support is in progress.

```cpp
#include <experimental/simd>
namespace stdx = std::experimental;

using floatv = stdx::native_simd<float>;

void add(float* out, const float* a, const float* b, int n) {
    int i = 0;
    for (; i + floatv::size() <= n; i += floatv::size()) {
        floatv va(a + i, stdx::element_aligned);
        floatv vb(b + i, stdx::element_aligned);
        (va + vb).copy_to(out + i, stdx::element_aligned);
    }
    for (; i < n; ++i) out[i] = a[i] + b[i];
}
```

**Highway (Google):** Production-ready, single-source SIMD for x86/ARM/WASM/RISC-V. Used in JPEG XL.

**xsimd:** Header-only C++ SIMD wrapper with a similar API. Popular in the Xtensor ecosystem.

If you need portability today, Highway or xsimd are the practical choices. `std::experimental::simd` is the future but not yet widely available.

## Profiling

**`perf stat`** — check the instruction mix on Linux:

```bash
perf stat -e instructions,cycles,fp_arith_inst_retired.256b_packed_single ./myapp
```

If `256b_packed_single` is zero, AVX2 is not being used. Look for `128b_packed_single` (SSE) or scalar counters.

**Intel IACA** (deprecated but still useful) analyzes throughput and bottlenecks for a marked code region. Successor tools: **llvm-mca** (LLVM Machine Code Analyzer) and **uiCA** (online).

```bash
llvm-mca -mcpu=skylake < assembly.s
```

**Godbolt compiler output** — the fastest way to check if a loop vectorized. Look for `ymm` registers (AVX2) or `xmm` (SSE) in the output.

Recognizing vectorized loops in assembly:
- `vmulps ymm0, ymm1, ymm2` — AVX2 multiply of 8 packed singles
- `vfmadd231ps ymm0, ymm1, ymm2` — AVX2 fused multiply-add
- `fmul v0.4s, v1.4s, v2.4s` — NEON multiply of 4 packed singles

If you see `mulss` (scalar single) in a loop you expected to vectorize, the compiler failed. Check for aliasing, non-trivial control flow, or function calls in the loop body.

## CMake Flags

For local development — use whatever the CPU supports:

```cmake
target_compile_options(myapp PRIVATE -march=native)
```

For deployment — target a specific ISA level:

```cmake
# AVX2 (covers most x86 CPUs from 2013+)
target_compile_options(myapp PRIVATE -march=x86-64-v3)

# SSE4.2 only (maximum compatibility)
target_compile_options(myapp PRIVATE -march=x86-64-v2)
```

For ARM cross-compilation:

```cmake
target_compile_options(myapp PRIVATE -march=armv8-a+simd)
```

Use CMake feature detection if you need runtime dispatch between AVX2 and SSE fallback — check `CMAKE_CXX_COMPILER_ID` and use `__builtin_cpu_supports("avx2")` for runtime checks.
