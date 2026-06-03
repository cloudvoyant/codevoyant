# Intel TBB (Threading Building Blocks)

## Why TBB over OpenMP

OpenMP is the right tool for parallel loops where the iteration count is known at compile time and the work per iteration is roughly uniform. TBB covers everything else:

- **Irregular parallelism** — tasks of different sizes, dynamic task creation
- **Task graphs** — DAGs of compute stages with dependencies
- **Producer-consumer pipelines** — back-pressure, bounded buffers
- **Concurrent containers** — thread-safe hash maps and queues without external locks

TBB uses work-stealing: idle threads steal tasks from busy threads' queues. This adapts automatically to unbalanced workloads without manual schedule tuning.

## CMake/Conan Setup

System-installed TBB:

```cmake
find_package(TBB REQUIRED)
target_link_libraries(myapp PRIVATE TBB::tbb)
```

Via Conan (`conanfile.txt`):

```ini
[requires]
onetbb/2021.12.0

[generators]
CMakeDeps
CMakeToolchain
```

Then in CMake:

```cmake
find_package(TBB REQUIRED)
target_link_libraries(myapp PRIVATE TBB::tbb)
```

On macOS: `brew install tbb`. On Ubuntu: `apt install libtbb-dev`.

## `tbb::parallel_for`

Range-based parallel loop with automatic grain-size tuning:

```cpp
#include <tbb/parallel_for.h>
#include <tbb/blocked_range.h>
#include <vector>

std::vector<float> data(1'000'000);

tbb::parallel_for(
    tbb::blocked_range<size_t>(0, data.size()),
    [&](const tbb::blocked_range<size_t>& r) {
        for (size_t i = r.begin(); i < r.end(); ++i) {
            data[i] = std::sin(data[i]);
        }
    }
);
```

`blocked_range` splits the iteration space recursively. TBB decides the grain size (the smallest chunk worth scheduling). Override with a third constructor argument if profiling shows the auto grain is wrong:

```cpp
tbb::blocked_range<size_t>(0, n, /*grainsize=*/4096)
```

For 2D ranges (image processing, matrix ops):

```cpp
#include <tbb/blocked_range2d.h>

tbb::parallel_for(
    tbb::blocked_range2d<int>(0, rows, 0, cols),
    [&](const tbb::blocked_range2d<int>& r) {
        for (int y = r.rows().begin(); y < r.rows().end(); ++y)
            for (int x = r.cols().begin(); x < r.cols().end(); ++x)
                process_pixel(y, x);
    }
);
```

## `tbb::parallel_pipeline`

Producer-consumer chains with bounded parallelism and back-pressure. Each filter is a stage in the pipeline:

```cpp
#include <tbb/parallel_pipeline.h>
#include <fstream>
#include <string>

std::ifstream input("frames.bin", std::ios::binary);

tbb::parallel_pipeline(
    /*max_tokens=*/8, // at most 8 items in flight
    tbb::make_filter<void, Frame>(
        tbb::filter_mode::serial_in_order,
        [&](tbb::flow_control& fc) -> Frame {
            Frame f;
            if (!read_frame(input, f)) { fc.stop(); return {}; }
            return f;
        }
    ) &
    tbb::make_filter<Frame, Frame>(
        tbb::filter_mode::parallel,
        [](Frame f) -> Frame {
            apply_filter(f);
            return f;
        }
    ) &
    tbb::make_filter<Frame, void>(
        tbb::filter_mode::serial_in_order,
        [](Frame f) {
            write_output(f);
        }
    )
);
```

Filter modes:
- `serial_in_order` — one token at a time, output order matches input order (I/O stages)
- `serial_out_of_order` — one token at a time, any order
- `parallel` — multiple tokens processed concurrently (compute stages)

The `max_tokens` parameter provides back-pressure: if the consumer is slow, the producer blocks rather than filling memory. Choose a value proportional to thread count (2x to 4x `std::thread::hardware_concurrency()`).

## `tbb::flow::graph`

Dependency-driven execution for DAGs of compute tasks:

```cpp
#include <tbb/flow_graph.h>

tbb::flow::graph g;

tbb::flow::function_node<int, float> preprocess(
    g, tbb::flow::unlimited,
    [](int input) -> float { return normalize(input); }
);

tbb::flow::function_node<float, Result> compute(
    g, tbb::flow::unlimited,
    [](float input) -> Result { return heavy_compute(input); }
);

tbb::flow::function_node<Result, void> output(
    g, tbb::flow::serial,
    [](Result r) { write_result(r); }
);

tbb::flow::make_edge(preprocess, compute);
tbb::flow::make_edge(compute, output);

for (int i = 0; i < num_items; ++i) {
    preprocess.try_put(i);
}

g.wait_for_all();
```

Key node types:
- `function_node` — transform input to output
- `join_node` — wait for multiple inputs before proceeding
- `broadcast_node` — fan out one input to many successors
- `buffer_node` — decouple producer and consumer speeds
- `limiter_node` — rate-limit tokens entering a subgraph

The concurrency parameter (`unlimited` vs `serial` vs a number) controls how many copies of the node body run in parallel. Use `serial` for I/O and `unlimited` for stateless compute.

## Concurrent Containers

Thread-safe containers without external locks:

```cpp
#include <tbb/concurrent_hash_map.h>
#include <tbb/concurrent_queue.h>

// Hash map with fine-grained locking
tbb::concurrent_hash_map<std::string, int> word_counts;

{
    tbb::concurrent_hash_map<std::string, int>::accessor a;
    word_counts.insert(a, "hello"); // exclusive access to the element
    a->second += 1;
}
// accessor released — lock is freed

// Concurrent queue — multiple producers, multiple consumers
tbb::concurrent_bounded_queue<Task> work_queue;
work_queue.set_capacity(1024); // blocks push when full

work_queue.push(task);   // blocks if full
Task t;
work_queue.pop(t);       // blocks if empty
```

When to use concurrent containers vs mutex-protected `std::unordered_map`:
- **Concurrent container** — many threads doing independent insert/lookup with minimal contention
- **Mutex** — operations that need a consistent view of multiple elements, or when you need STL iterator semantics

## `tbb::task_arena`

Isolate thread pools for priority separation or limiting parallelism:

```cpp
#include <tbb/task_arena.h>

// High-priority arena with all cores
tbb::task_arena high_priority(tbb::task_arena::automatic);

// Background arena limited to 2 threads
tbb::task_arena background(2);

high_priority.execute([&] {
    tbb::parallel_for(/* ... critical work ... */);
});

background.execute([&] {
    tbb::parallel_for(/* ... background indexing ... */);
});
```

Arenas are the production-grade replacement for rolling your own thread pool. They integrate with TBB's work-stealing scheduler, so an arena with 2 threads still benefits from TBB's load balancing and grain-size tuning.

## `tbb::parallel_reduce` and `tbb::parallel_scan`

**Parallel reduce** — combines partial results from subranges:

```cpp
#include <tbb/parallel_reduce.h>

float total = tbb::parallel_reduce(
    tbb::blocked_range<size_t>(0, data.size()),
    0.0f,
    [&](const tbb::blocked_range<size_t>& r, float running_total) {
        for (size_t i = r.begin(); i < r.end(); ++i)
            running_total += data[i];
        return running_total;
    },
    std::plus<float>() // combine partial results
);
```

**Parallel scan** — prefix sums (cumulative operations):

```cpp
#include <tbb/parallel_scan.h>

std::vector<float> prefix(n);
tbb::parallel_scan(
    tbb::blocked_range<size_t>(0, n),
    0.0f,
    [&](const tbb::blocked_range<size_t>& r, float sum, bool is_final_scan) {
        for (size_t i = r.begin(); i < r.end(); ++i) {
            sum += data[i];
            if (is_final_scan)
                prefix[i] = sum;
        }
        return sum;
    },
    std::plus<float>()
);
```

These are better than rolling your own because TBB handles the two-pass algorithm (upward sweep + downward sweep) and the grain-size tuning automatically.

## Memory Allocation

Malloc contention is a hidden bottleneck in multithreaded code. When many threads allocate/free simultaneously, the global heap lock becomes a serial bottleneck.

**`tbb::scalable_allocator`** — per-thread memory pools that eliminate this contention:

```cpp
#include <tbb/scalable_allocator.h>

std::vector<float, tbb::scalable_allocator<float>> data(n);
```

**`tbb::cache_aligned_allocator`** — ensures allocations start on cache-line boundaries to prevent false sharing:

```cpp
#include <tbb/cache_aligned_allocator.h>

std::vector<std::atomic<int>, tbb::cache_aligned_allocator<std::atomic<int>>> counters(num_threads);
```

Use `scalable_allocator` as the default for containers accessed from parallel regions. Use `cache_aligned_allocator` specifically when elements are written by different threads.

## Gotchas

**Task granularity.** If individual tasks are too small (< 1 microsecond), scheduling overhead dominates. If too large, load imbalance wastes cores. Use `tbb::blocked_range` with auto-tuning and profile before overriding grain size.

**Nested `parallel_for`.** A naive nested `parallel_for` works but can over-subscribe the machine. TBB handles this better than OpenMP (work-stealing adapts), but measure: sometimes parallelizing only the outer loop is faster.

**Cancellation.** Use `tbb::task_group_context` to cancel in-flight tasks when an error is found:

```cpp
tbb::task_group_context ctx;
try {
    tbb::parallel_for(range, body, ctx);
} catch (...) {
    ctx.cancel_group_execution();
    throw;
}
```

**Mixing TBB and OpenMP.** Both create their own thread pools. Running them together can over-subscribe the machine. If you must mix them, limit one or both: `OMP_NUM_THREADS=4` + `tbb::task_arena(4)`.
