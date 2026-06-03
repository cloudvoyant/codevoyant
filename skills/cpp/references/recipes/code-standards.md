# C++ Code Standards

## Why consistent conventions matter at scale

In a codebase with five engineers and a few thousand lines, you can hold most of it in your head. In a codebase with twenty engineers and 200,000 lines, you can't. Consistent conventions become a navigation system: `kMaxRetries` means compile-time constant, `count_` means private member, `compute_hash` means function. A reviewer can scan unfamiliar code and understand structure without reading every line. Inconsistent conventions make code review slower, onboarding harder, and `grep` less reliable.

These standards combine Google C++ Style (dominant in the open-source C++ ecosystem) with C++17 best practices. The tooling that enforces them mechanically lives in `formatting-and-analysis.md`.


## Naming conventions

| Kind | Style | Example | Why |
|---|---|---|---|
| Class / struct / enum | `CamelCase` | `class WidgetFactory;` | Visually distinct from variables and functions |
| Function / method | `snake_case` | `int compute_hash(...);` | Consistent with STL conventions |
| Variable / parameter | `snake_case` | `int retry_count = 3;` | Readable, grep-friendly |
| Member (private/protected) | `snake_case_` | `int count_;` | Trailing `_` instantly distinguishes members from locals — prevents shadowing bugs |
| Constant / `constexpr` | `kCamelCase` | `constexpr int kMaxRetries = 5;` | `k` prefix distinguishes from variables; `CamelCase` from functions |
| Enum value | `kCamelCase` | `enum class State { kIdle, kRunning };` | Consistent with constexpr; scoped by `enum class` |
| Namespace | `lower_case` | `namespace acme_core { ... }` | Mirrors directory/package names |
| Macro | `UPPER_SNAKE_CASE` | `#define ACME_LOG(...)` | ALL_CAPS signals "this is a macro — approach with caution" |
| Template parameter | `CamelCase` | `template <typename Iterator>` | Conventionally distinct from type aliases |

Header file: `lower_snake_case.h` or `.hpp`. Test file: `<name>.tests.cpp` (matches the `CONFIGURE_DEPENDS` glob in `CMakeLists.txt`).


## Headers — `#pragma once`

Always use `#pragma once` instead of `#ifndef`/`#define`/`#endif` include guards:

```cpp
// include/acme_core/widget.hpp
#pragma once
#include <string>

namespace acme_core {
class Widget {
 public:
  std::string Name() const;
};
}  // namespace acme_core
```

Why `#pragma once`? The `#ifndef` guard form requires inventing a unique macro name (`ACME_CORE_WIDGET_HPP_`), and a typo in that name causes silent double-inclusion. `#pragma once` is supported by every compiler you'd realistically target (GCC, Clang, MSVC), is shorter, and cannot have the typo problem.


## Modern C++ rules

These rules exist because the old alternatives cause real bugs.

**`nullptr` over `NULL` or `0`** — `NULL` is `#define`d as `0` (an integer), which leads to ambiguous overloads: `f(NULL)` may call `f(int)` instead of `f(Widget*)`.

**`auto` for iterators, lambdas, and verbose template types** — but not for primitive types or where the type isn't obvious from context:

```cpp
auto it = map.begin();                     // obvious: iterator
auto fn = [](int x) { return x * 2; };    // obvious: lambda
auto result = compute();                   // NOT obvious: what type does compute() return?
```

**`[[nodiscard]]` on functions where the return value is the only effect:**

```cpp
[[nodiscard]] absl::Status Parse(std::string_view input, Output* out);
[[nodiscard]] std::unique_ptr<Widget> MakeWidget(int n);
```

Without `[[nodiscard]]`, a caller silently discards an error status: `Parse(input, &out);` — the status is created and immediately destroyed, no warning. With `[[nodiscard]]`, the compiler warns if the return value isn't used.

**`enum class` over bare `enum`** — bare enums leak their values into the enclosing scope. `State::kIdle` is unambiguous; `kIdle` alone can clash with any other `kIdle` in scope.

**`std::string_view` for borrowed string params; `std::string` for owned/stored ones:**

```cpp
// Input-only — doesn't allocate, works with string literals and std::string
void Log(std::string_view message);

// The string will be stored — owns its memory
void SetName(std::string name) { name_ = std::move(name); }
```

**Rule of zero** — don't define copy constructor, move constructor, copy assignment, move assignment, or destructor unless you're directly managing a raw resource. If you define one, define all five. Modern RAII types (`std::unique_ptr`, `std::vector`) handle resource management; if you use them, the compiler-generated defaults are correct.

**`final` and `override` everywhere they apply** — `final` on a class enables devirtualization and signals intent. `override` on a virtual method means "this must override a base method" — if the base signature changes, you get a compile error instead of silently creating a new virtual that's never called.


## Forbidden patterns

These aren't style preferences — they cause real bugs.

**`using namespace std;` in headers** — pollutes every translation unit that includes the header, causing ambiguous name resolution that can be impossible to debug.

**`new` / `delete` directly** — use `std::make_unique<T>()` / `std::make_shared<T>()`. Raw `new` can leak when a constructor throws between the `new` and the assignment. `make_unique` is exception-safe.

**C-style casts** — `(int*)ptr` silently:
- Discards `const`
- Bypasses virtual dispatch
- Succeeds even when `static_cast` would fail at compile time

Use `static_cast`, `reinterpret_cast`, `const_cast`, or `dynamic_cast` — each has a specific, documented meaning.

**Bare `printf` / `std::cout` for logging** — use spdlog, glog, or absl::LOG. Structured loggers add timestamps, levels, and structured fields. `printf` in a multi-threaded program produces interleaved output.

**Catching by value or catching `std::exception` without specifics:**

```cpp
// Bad: swallows everything, including std::bad_alloc
try { ... } catch (std::exception& e) { /* ... */ }

// Better: only catches what you expect
try { ... } catch (const ParseError& e) { /* ... */ }
```

**`goto`** — the common legitimate use case (error cleanup in C) is better handled in C++ by RAII destructors.

**Mutable global state** — use a function-local `static` for lazy-initialized singletons:

```cpp
Database& GetDatabase() {
  static Database db("connection_string");   // thread-safe init in C++11+
  return db;
}
```
