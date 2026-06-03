# C++ Code Standards and Static Analysis

## Why this matters

C++ gives you more power and more rope than almost any other language. That means consistent conventions and static analysis aren't just style preferences — they prevent real, hard-to-find bugs.

**Why consistent naming matters at scale:** In a codebase with five engineers and a few thousand lines, you can hold most of it in your head. In a codebase with twenty engineers and 200,000 lines, you can't. Consistent naming becomes a navigation system: `kMaxRetries` means it's a compile-time constant, `count_` means it's a private member, `compute_hash` means it's a function. A reviewer can scan unfamiliar code and quickly understand structure without reading every line. Inconsistent naming makes code review slower, onboarding harder, and grep less reliable.

**Why clang-tidy catches real bugs:** Consider these examples from real codebases:

- `bugprone-use-after-move` catches: `std::move(v); v.push_back(x);` — `v` is in a valid but unspecified state after the move. This compiles, passes sanitizers in most cases, and fails intermittently in production.
- `bugprone-unchecked-optional-access` catches: `auto val = maybe_value.value();` without checking `maybe_value.has_value()` — throws `std::bad_optional_access` at runtime.
- `modernize-use-nullptr` enforces `nullptr` over `NULL` — `NULL` is typically `0`, which leads to ambiguous overload resolution and comparison with integer types.
- `cppcoreguidelines-pro-type-cstyle-cast` flags `(int*)ptr` — C-style casts silently discard `const`, skip virtual dispatch, and bypass safety checks that `static_cast`, `const_cast`, and `dynamic_cast` provide separately and explicitly.

The investment in configuring these tools once pays dividends on every pull request.

## `.clang-format` — automated formatting

Formatting debates waste code review time. `clang-format` eliminates them by enforcing a deterministic style on every save or commit. The goal is not to have the prettiest possible formatting — it's to have the same formatting every time, everywhere.

This config uses Google style as a base with a few pragmatic overrides:

```yaml
# .clang-format
BasedOnStyle: Google
Language: Cpp
Standard: c++17

ColumnLimit: 100             # Google uses 80; 100 is more practical for modern screens
IndentWidth: 4
TabWidth: 4
UseTab: Never
AccessModifierOffset: -3     # `public:` indented 1 level less than the class body
NamespaceIndentation: None   # don't indent contents of namespaces

PointerAlignment: Left       # int* p — pointer is part of the type, not the variable name
DerivePointerAlignment: false
ReferenceAlignment: Left

AllowShortFunctionsOnASingleLine: Empty     # only empty bodies on one line
AllowShortIfStatementsOnASingleLine: Never  # always brace your ifs
AllowShortLoopsOnASingleLine: false

BreakBeforeBraces: Attach    # opening brace on same line (K&R style)
BreakConstructorInitializers: BeforeComma
BreakInheritanceList: BeforeComma

# Group and sort #includes. Priority determines group order:
# 1. Standard library (<vector>)  2. System/third-party (<grpc/grpc.h>)
# 3. Project headers  4. Same-directory headers
IncludeBlocks: Regroup
IncludeCategories:
  - Regex:    '^<[^/.]+>$'         # <vector>, <string>
    Priority: 1
  - Regex:    '^<.*\.h(pp)?>$'     # <grpc/grpc.h>, <openssl/ssl.h>
    Priority: 2
  - Regex:    '^"[^/]+"$'          # "widget.h" — same-directory header
    Priority: 4
  - Regex:    '.*'                 # everything else (project-relative paths)
    Priority: 3

SortIncludes: CaseSensitive
SortUsingDeclarations: true

AlignAfterOpenBracket: Align
AlignTrailingComments: true
SpacesBeforeTrailingComments: 2

EmptyLineBeforeAccessModifier: LogicalBlock
EmptyLineAfterAccessModifier: Never

FixNamespaceComments: true    # add `// namespace acme_core` after closing `}`
ShortNamespaceLines: 0
```

Run:

```bash
# Format all C++ files in the repo, in-place:
clang-format -i $(git ls-files '*.h' '*.hpp' '*.cc' '*.cpp')

# Check-only mode for CI (exits non-zero if any file would be changed):
clang-format --dry-run --Werror $(git ls-files '*.h' '*.hpp' '*.cc' '*.cpp')
```

## `.clang-tidy` — static analysis

clang-tidy runs the compiler's full AST on your code and checks hundreds of patterns. Unlike a linter that looks at text, clang-tidy understands the semantics — it knows that `v` in `std::move(v); v.push_back(x);` is the same variable, and that the move invalidates it.

```yaml
# .clang-tidy
Checks: >
  bugprone-*,
  cert-*,
  clang-analyzer-*,
  cppcoreguidelines-*,
  modernize-*,
  performance-*,
  portability-*,
  readability-*,
  -bugprone-easily-swappable-parameters,
  -cppcoreguidelines-avoid-magic-numbers,
  -cppcoreguidelines-pro-bounds-pointer-arithmetic,
  -modernize-use-trailing-return-type,
  -readability-magic-numbers,
  -readability-identifier-length,
  -readability-function-cognitive-complexity

WarningsAsErrors: >
  bugprone-use-after-move,
  bugprone-unchecked-optional-access,
  cert-err58-cpp,
  clang-analyzer-*

HeaderFilterRegex: '^(include|src)/.*'

CheckOptions:
  - { key: readability-identifier-naming.ClassCase,                value: CamelCase   }
  - { key: readability-identifier-naming.StructCase,               value: CamelCase   }
  - { key: readability-identifier-naming.EnumCase,                 value: CamelCase   }
  - { key: readability-identifier-naming.EnumConstantCase,         value: CamelCase   }
  - { key: readability-identifier-naming.EnumConstantPrefix,       value: k           }
  - { key: readability-identifier-naming.FunctionCase,             value: lower_case  }
  - { key: readability-identifier-naming.VariableCase,             value: lower_case  }
  - { key: readability-identifier-naming.ParameterCase,            value: lower_case  }
  - { key: readability-identifier-naming.MemberCase,               value: lower_case  }
  - { key: readability-identifier-naming.PrivateMemberSuffix,      value: _           }
  - { key: readability-identifier-naming.ProtectedMemberSuffix,    value: _           }
  - { key: readability-identifier-naming.NamespaceCase,            value: lower_case  }
  - { key: readability-identifier-naming.ConstexprVariableCase,    value: CamelCase   }
  - { key: readability-identifier-naming.ConstexprVariablePrefix,  value: k           }
  - { key: readability-identifier-naming.MacroDefinitionCase,      value: UPPER_CASE  }
```

### What the check groups catch and why they're enabled

**`bugprone-*`** — patterns that are frequently bugs, even if they compile cleanly:
- `bugprone-use-after-move`: using a moved-from object
- `bugprone-unchecked-optional-access`: dereferencing an optional without checking `has_value()`
- `bugprone-integer-division`: `float x = 3 / 2;` silently gives `1.0`, not `1.5`

**`cert-*`** — CERT C++ Secure Coding Standard:
- `cert-err58-cpp`: objects with static storage duration that throw during construction — the exception is uncatchable

**`clang-analyzer-*`** — inter-procedural analysis, promoted to errors:
- Null pointer dereferences across function boundaries
- Memory and resource leaks
- Dead code that indicates logic errors

**`modernize-*`** — C++11/14/17 idioms replacing error-prone C patterns:
- `modernize-use-nullptr`: replaces `NULL` and `0` for pointers
- `modernize-use-override`: adds `override` to all virtual overrides, catching silent shadowing bugs
- `modernize-use-emplace`: replaces `push_back(T(...))` with `emplace_back(...)` for efficiency

**`performance-*`** — common performance mistakes:
- `performance-unnecessary-copy-initialization`: catches `auto x = heavy_obj;` that should be `const auto& x = heavy_obj;`
- `performance-move-const-arg`: catches `std::move(const_var)` which compiles but does nothing

**Why some checks are disabled:**
- `cppcoreguidelines-avoid-magic-numbers`: too noisy in practice (bitmasks, HTTP status codes, etc.)
- `readability-function-cognitive-complexity`: useful signal but too aggressive — flags any function with nested loops
- `modernize-use-trailing-return-type`: a style preference, not a correctness issue; `int compute()` is clearer than `auto compute() -> int` in most cases

**`HeaderFilterRegex`** limits diagnostics to your own headers. Without this, clang-tidy runs on every header transitively included — including third-party Conan packages, generating thousands of irrelevant warnings.

Run:

```bash
# Single file (fastest for iteration):
clang-tidy -p build src/widget.cpp

# Whole project, parallel (uses run-clang-tidy from the LLVM install):
run-clang-tidy -p build -j $(nproc) -header-filter='^(include|src)/.*'
```

`-p build` points to the directory containing `compile_commands.json`. CMake generates this file when `CMAKE_EXPORT_COMPILE_COMMANDS=ON` (set in `cmake-structure.md`).

## Naming conventions

These conventions combine Google C++ Style (dominant in the ecosystem) with the modifications enforced by our `.clang-tidy` config above:

| Kind | Style | Example | Why |
|---|---|---|---|
| Class / struct / enum | `CamelCase` | `class WidgetFactory;` | Visually distinct from variables and functions |
| Function / method | `snake_case` | `int compute_hash(...);` | Consistent with STL conventions |
| Variable / parameter | `snake_case` | `int retry_count = 3;` | Readable, searchable |
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

Why `#pragma once`? The `#ifndef` guard form requires inventing a unique macro name (`ACME_CORE_WIDGET_HPP_`), and typos in that name cause silent double-inclusion. `#pragma once` is supported by every compiler you'd realistically target (GCC, Clang, MSVC), is shorter, and cannot have the typo problem.

## Modern C++ rules

These rules exist because the old alternatives cause real bugs:

**`nullptr` over `NULL` or `0`** — `NULL` is `#define`d as `0` (an integer), leading to ambiguous overloads: `f(NULL)` may call `f(int)` instead of `f(Widget*)`.

**`auto` for iterators, lambdas, and verbose template types** — but not for primitive types or where the type isn't obvious from the right-hand side:

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

Without `[[nodiscard]]`, a caller can silently discard an error status: `Parse(input, &out);` — the status is created and immediately destroyed. The compiler won't warn. With `[[nodiscard]]`, the compiler emits a warning if the return value isn't used.

**`enum class` over bare `enum`** — bare enums leak their values into the enclosing scope. `State::kIdle` is unambiguous; `kIdle` alone (from a bare enum) can clash with any other `kIdle` in scope.

**`std::string_view` for borrowed string params; `std::string` for owned/stored ones:**

```cpp
// Input-only string param — doesn't allocate, works with string literals and std::string.
void Log(std::string_view message);

// The string will be stored — owns its memory.
void SetName(std::string name) { name_ = std::move(name); }
```

**Rule of zero** — don't define copy constructor, move constructor, copy assignment, move assignment, or destructor unless you're directly managing a raw resource. If you define one, define all five. Modern RAII types (`std::unique_ptr`, `std::vector`, etc.) handle resource management; if you use them, the compiler-generated defaults are correct.

**`final` and `override` everywhere they apply** — `final` on a class means "don't subclass this" (enables devirtualization). `override` on a virtual method means "this must override a base class method" — if the base signature changes, you get a compile error instead of silently creating a new virtual that's never called.

## Forbidden patterns

These aren't style preferences — they cause real bugs:

**`using namespace std;` in headers** — pollutes every translation unit that includes the header, causing ambiguous name resolution that's impossible to debug.

**`new` / `delete` directly** — use `std::make_unique<T>(...)` / `std::make_shared<T>(...)`. Raw `new` can leak when a constructor throws between `new` and the pointer being assigned. `make_unique` is exception-safe.

**C-style casts** — `(int*)ptr` silently:
- Discards `const`
- Bypasses virtual dispatch
- Succeeds even when `static_cast` would fail at compile time
Use `static_cast`, `reinterpret_cast`, `const_cast`, or `dynamic_cast` — each has a specific, documented meaning.

**Bare `printf` / `std::cout` for logging** — use spdlog, glog, or absl::LOG. Structured loggers add timestamps, log levels, and structured fields. `printf` in a multi-threaded program produces interleaved output.

**Catching by value or catching `std::exception` without specifics** — catch the narrowest type you can handle:

```cpp
// Bad: swallows everything, including std::bad_alloc.
try { ... } catch (std::exception& e) { /* ... */ }

// Better: only catches what you expect.
try { ... } catch (const ParseError& e) { /* ... */ }
```

**`goto`** — clang-tidy `cppcoreguidelines-avoid-goto` flags this. The common legitimate use case (error cleanup in C) is better handled in C++ by RAII destructors.

**Mutable global state** — use a function-local `static` for lazy-initialized singletons:

```cpp
Database& GetDatabase() {
  static Database db("connection_string");   // thread-safe init in C++11+
  return db;
}
```

## CMake targets for format and tidy

Wire format checking and tidy into CMake so developers and CI use the same commands:

```cmake
find_program(CLANG_FORMAT_EXE clang-format)
find_program(CLANG_TIDY_EXE   clang-tidy)
find_program(RUN_CLANG_TIDY   run-clang-tidy)

file(GLOB_RECURSE ALL_CXX_SOURCES CONFIGURE_DEPENDS
    "${CMAKE_SOURCE_DIR}/src/*.cpp"
    "${CMAKE_SOURCE_DIR}/src/*.h"
    "${CMAKE_SOURCE_DIR}/include/*.hpp")

if(CLANG_FORMAT_EXE)
    add_custom_target(format
        COMMAND ${CLANG_FORMAT_EXE} -i ${ALL_CXX_SOURCES}
        COMMENT "Running clang-format on all sources")

    add_custom_target(format-check
        COMMAND ${CLANG_FORMAT_EXE} --dry-run --Werror ${ALL_CXX_SOURCES}
        COMMENT "Checking clang-format compliance")
endif()

if(RUN_CLANG_TIDY)
    add_custom_target(tidy
        COMMAND ${RUN_CLANG_TIDY} -p ${CMAKE_BINARY_DIR}
                -header-filter=^${CMAKE_SOURCE_DIR}/(include|src)/.*
        COMMENT "Running clang-tidy across the project")
endif()
```

Usage:

```bash
cmake --build build --target format         # in-place format (developer)
cmake --build build --target format-check   # check only, exit 1 if diff (CI gate)
cmake --build build --target tidy           # full tidy pass
```

## Inline tidy during compilation (optional)

clang-tidy can run on every translation unit during `cmake --build`:

```cmake
set(CMAKE_CXX_CLANG_TIDY clang-tidy)
```

This significantly slows builds. Gate it behind an option and run only in CI:

```cmake
option(ENABLE_TIDY "Run clang-tidy on every build" OFF)
if(ENABLE_TIDY)
    set(CMAKE_CXX_CLANG_TIDY clang-tidy)
endif()
```

```bash
cmake --preset release -DENABLE_TIDY=ON
cmake --build --preset release
```

## Pre-commit hook — catch issues before push

`.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/mirrors-clang-format
    rev: v18.1.8
    hooks:
      - id: clang-format
        types_or: [c++, c]
```

One-time setup per checkout:

```bash
pre-commit install
```

After this, `git commit` automatically runs clang-format on staged files and aborts if any file would be changed. The developer re-stages the formatted files and commits again.

## CI gate

```yaml
# .github/workflows/lint.yml
name: lint
on: [pull_request]
jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get update && sudo apt-get install -y clang-format-18 clang-tidy-18
      - run: cmake --preset release && cmake --build build/release --target format-check
      - run: cmake --build build/release --target tidy
```

Format check runs first — it's fast (seconds). Tidy runs second — it's slow (minutes) but catches deeper issues. Both must pass before merge.
