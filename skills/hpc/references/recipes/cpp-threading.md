# C++ Threading Primitives

## Why This Matters

Threading is for I/O-bound tasks and coarse-grained parallelism where you need explicit control over thread lifetime. For loop-heavy numeric work, OpenMP or TBB are almost always better choices — they handle scheduling, load balancing, and grain-size tuning automatically. Reach for `std::thread` when you need persistent worker threads, I/O multiplexing, or when the work doesn't decompose into parallel loops.

## std::thread Basics

Create a thread, pass arguments by value (they're copied), and join:

```cpp
#include <thread>
#include <iostream>

void work(int id, const std::string& label) {
    std::cout << "Thread " << id << ": " << label << "\n";
}

int main() {
    std::thread t1(work, 1, "alpha");
    std::thread t2(work, 2, "beta");
    t1.join();
    t2.join();
}
```

Pass by reference with `std::ref()` — without it the argument is copied:

```cpp
void accumulate(std::vector<int>& results, int value) {
    results.push_back(value);
}

std::vector<int> results;
std::mutex mtx;
std::thread t(accumulate, std::ref(results), 42);
```

**Prefer `std::jthread` (C++20).** It joins automatically in its destructor, so you can't accidentally leak a running thread. It also supports cooperative cancellation via `std::stop_token`:

```cpp
#include <thread>

std::jthread worker([](std::stop_token st) {
    while (!st.stop_requested()) {
        // do work
    }
});
// worker joins automatically when it goes out of scope
```

## std::async and std::future

Use `std::async` when you want a result back. It returns a `std::future<T>` that propagates exceptions:

```cpp
#include <future>

auto fut = std::async(std::launch::async, [] {
    return expensive_compute();
});

try {
    auto result = fut.get(); // blocks until ready, rethrows exceptions
} catch (const std::exception& e) {
    // handle failure from the async task
}
```

`std::launch::async` forces a new thread. `std::launch::deferred` runs lazily on `.get()` — useful for optional computations. The default (`std::launch::async | std::launch::deferred`) lets the implementation choose, which is rarely what you want.

When futures beat raw threads: when you need return values, exception propagation, or fire-and-forget with deferred execution. When raw threads beat futures: when you need persistent workers, custom scheduling, or thread affinity.

## Thread-Safe Data Structures

**Mutex + lock guard** — the default choice for protecting shared state:

```cpp
#include <mutex>

std::mutex mtx;
std::vector<int> shared_data;

void safe_push(int val) {
    std::lock_guard<std::mutex> lock(mtx);
    shared_data.push_back(val);
}
```

**`std::scoped_lock`** (C++17) locks multiple mutexes without deadlock:

```cpp
std::mutex mtx_a, mtx_b;

void transfer() {
    std::scoped_lock lock(mtx_a, mtx_b); // deadlock-free
    // modify both protected resources
}
```

**`std::atomic<T>`** for counters and flags — faster than mutex when the operation is a single read-modify-write:

```cpp
#include <atomic>

std::atomic<int> counter{0};

void increment() {
    counter.fetch_add(1, std::memory_order_relaxed);
    // relaxed is fine for a simple counter — no ordering needed
}
```

Use `std::atomic` when: the shared state is a single scalar and operations are individual loads/stores/RMW. Use mutex when: you need to protect a multi-step operation or a complex data structure.

## Avoiding Data Races

A data race occurs when two threads access the same memory location, at least one writes, and there's no synchronization. The C++ memory model makes this undefined behavior.

**The one-writer/many-readers rule:** either one thread writes (exclusive access) or many threads read (shared access), never both simultaneously.

**`std::shared_mutex`** implements this directly — ideal for read-heavy workloads:

```cpp
#include <shared_mutex>

std::shared_mutex rw_mtx;
std::map<std::string, int> cache;

int read_cache(const std::string& key) {
    std::shared_lock lock(rw_mtx); // multiple readers OK
    return cache.at(key);
}

void write_cache(const std::string& key, int val) {
    std::unique_lock lock(rw_mtx); // exclusive writer
    cache[key] = val;
}
```

## Thread Pools

Creating a `std::thread` per task doesn't scale — thread creation has overhead (~50-100 us), and thousands of threads cause context-switch thrashing. A thread pool reuses a fixed set of threads.

A minimal pool pattern: a queue of `std::function<void()>`, a fixed number of worker threads, and a condition variable to wake workers when work arrives. Consider:

- **Rolling your own** — educational, ~100 lines, but tricky to get shutdown and exception handling right.
- **TBB's `task_arena`** — production-grade, handles grain-size tuning and work stealing (see tbb.md).
- **`std::execution` (C++17/23)** — parallel algorithms with execution policies (`std::execution::par`) let the stdlib manage the pool.
- **BS::thread_pool** — header-only library, good middle ground.

## CMake Setup

```cmake
find_package(Threads REQUIRED)
target_link_libraries(myapp PRIVATE Threads::Threads)
```

This sets `-pthread` on Linux and handles platform differences. Always use the imported target, never raw `-lpthread`.

## Gotchas

**False sharing.** Two threads writing to adjacent memory on the same cache line (typically 64 bytes) cause constant cache invalidation. Fix: pad structs with `alignas(64)` or use `std::hardware_destructive_interference_size` (C++17).

```cpp
struct alignas(64) PaddedCounter {
    std::atomic<int> value{0};
};
```

**Detached threads at shutdown.** A detached thread (`t.detach()`) that outlives `main()` accesses destroyed globals — undefined behavior. Prefer `std::jthread` which joins in its destructor, or ensure all threads are joined before `main()` returns.

**Exception safety.** If an exception is thrown between thread creation and `.join()`, the thread is never joined and `std::terminate` is called. Use `std::jthread`, RAII wrappers, or try/catch to guarantee join.

**Thread-local storage.** `thread_local` variables are per-thread but their destructors run at thread exit, which can interact badly with thread pools that reuse threads. Initialize explicitly per task, not per thread.
