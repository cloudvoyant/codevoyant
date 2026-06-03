# Formatting, Linting, and Static Analysis

See the [clang-format docs](https://clang.llvm.org/docs/ClangFormat.html) and [clang-tidy docs](https://clang.llvm.org/extra/clang-tidy/) for the full option reference — here's the validated configuration and the reasoning behind the choices.

## Why automated tooling beats code review for style

Formatting debates and style nitpicks waste code review time on things that don't matter. Worse, manual review misses subtle bugs that a compiler-level tool would catch instantly. The two tools here divide responsibilities cleanly:

- **clang-format** eliminates all formatting discussion. The config is checked in; every file looks the same on every machine. Reviewers spend time on logic, not whitespace.
- **clang-tidy** runs the compiler's full AST on your code and catches real bugs — not just style issues. Unlike a text-based linter, it understands semantics: it knows that `v` in `std::move(v); v.push_back(x);` is the same variable, and that the move leaves it in an unspecified state.

Concrete examples of what clang-tidy catches:
- `bugprone-use-after-move`: `std::move(v); v.push_back(x);` — compiles, passes most sanitizers, fails intermittently in production.
- `bugprone-unchecked-optional-access`: `auto val = maybe_value.value();` without checking `has_value()` — throws `std::bad_optional_access` at runtime.
- `cppcoreguidelines-pro-type-cstyle-cast`: `(int*)ptr` silently discards `const`, bypasses virtual dispatch, and succeeds even when `static_cast` would fail at compile time.
- `performance-unnecessary-copy-initialization`: `auto x = heavy_obj;` that should be `const auto& x = heavy_obj;`.


## `.clang-format`

This config uses Google style as a base with practical overrides. The goal is deterministic output — not the prettiest formatting, the same formatting everywhere.

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
NamespaceIndentation: None   # don't indent namespace contents

PointerAlignment: Left       # int* p — pointer is part of the type, not the variable
DerivePointerAlignment: false
ReferenceAlignment: Left

AllowShortFunctionsOnASingleLine: Empty     # only empty bodies on one line
AllowShortIfStatementsOnASingleLine: Never  # always brace ifs
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
# Format all C++ files in-place:
clang-format -i $(git ls-files '*.h' '*.hpp' '*.cc' '*.cpp')

# Check-only mode for CI (exits non-zero if any file would change):
clang-format --dry-run --Werror $(git ls-files '*.h' '*.hpp' '*.cc' '*.cpp')
```


## `.clang-tidy`

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

### What each check group catches

**`bugprone-*`** — patterns that are frequently bugs even when they compile cleanly:
- `bugprone-use-after-move`: using a moved-from object
- `bugprone-unchecked-optional-access`: dereferencing an optional without checking `has_value()`
- `bugprone-integer-division`: `float x = 3 / 2;` silently gives `1.0`, not `1.5`

**`cert-*`** — CERT C++ Secure Coding Standard:
- `cert-err58-cpp`: static-storage objects that throw during construction — the exception is uncatchable

**`clang-analyzer-*`** — inter-procedural analysis, promoted to errors:
- Null pointer dereferences across function boundaries
- Memory and resource leaks
- Dead code indicating logic errors

**`modernize-*`** — C++11/14/17 idioms replacing error-prone C patterns:
- `modernize-use-nullptr`: replaces `NULL` and `0` for pointers
- `modernize-use-override`: adds `override` to virtual overrides, catching silent shadowing bugs
- `modernize-use-emplace`: replaces `push_back(T(...))` with `emplace_back(...)`

**`performance-*`** — common performance mistakes:
- `performance-unnecessary-copy-initialization`: `auto x = heavy_obj;` → should be `const auto& x`
- `performance-move-const-arg`: `std::move(const_var)` compiles but does nothing

**Why some checks are disabled:**
- `cppcoreguidelines-avoid-magic-numbers`: too noisy in practice — bitmasks, HTTP status codes, math constants
- `readability-function-cognitive-complexity`: useful signal but flags any function with nested loops
- `modernize-use-trailing-return-type`: style preference, not correctness — `int compute()` is clearer than `auto compute() -> int`

`HeaderFilterRegex` limits diagnostics to your own headers. Without it, clang-tidy runs on every transitively included header — including Conan packages — generating thousands of irrelevant warnings.

Run:

```bash
# Single file (fastest for iteration):
clang-tidy -p build src/widget.cpp

# Whole project, parallel:
run-clang-tidy -p build -j $(nproc) -header-filter='^(include|src)/.*'
```

`-p build` points to the `compile_commands.json` directory. CMake generates this when `CMAKE_EXPORT_COMPILE_COMMANDS=ON` — set in the CMake structure preset.


## CMake targets

Wire format checking and tidy into CMake so developers and CI use identical commands:

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

```bash
cmake --build build --target format         # in-place format (developer)
cmake --build build --target format-check   # check only, exits 1 if diff (CI)
cmake --build build --target tidy           # full tidy pass
```

### Inline tidy during compilation (optional)

```cmake
option(ENABLE_TIDY "Run clang-tidy on every build" OFF)
if(ENABLE_TIDY)
    set(CMAKE_CXX_CLANG_TIDY clang-tidy)
endif()
```

Gate it behind an option — inline tidy significantly slows builds. Enable only in CI:

```bash
cmake --preset release -DENABLE_TIDY=ON
cmake --build --preset release
```


## Pre-commit hook

`.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/mirrors-clang-format
    rev: v18.1.8
    hooks:
      - id: clang-format
        types_or: [c++, c]
```

```bash
pre-commit install   # one-time per checkout
```

After this, `git commit` automatically runs clang-format on staged files and aborts if any file would change. The developer re-stages the formatted files and commits again.


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
