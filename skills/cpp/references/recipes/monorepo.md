# Monorepo with Multiple Libraries

## Why this matters

As a C++ project grows, you inevitably face a choice: split each library into its own repo (multi-repo), or keep everything together (monorepo). Both are valid at different scales, but a monorepo has compelling advantages for tightly-coupled libraries that evolve together:

- **Atomic changes** — a single commit can update the API in `libs/logger`, fix all callers in `libs/storage` and `apps/service`, and add tests. In multi-repo, coordinating this across three repos requires careful version bumping and synchronization.
- **Local development is fast** — in-repo dependencies are built from source directly, no publishing/updating cycle.
- **Consistent standards** — one `.clang-format`, one `code-standards.md`, one CI pipeline governs everything.

The cost is a larger, slower-to-clone repo and more complex CI. That trade-off is usually worth it when libraries are consumed primarily by apps in the same repo.

CMake's `add_subdirectory` is the mechanism: the top-level `CMakeLists.txt` pulls in every library and app, wires them together through namespaced targets, and runs the full build in a single `cmake --build` invocation.

## Layout

```
acme/
  CMakeLists.txt              # top-level: standards, find_package, add_subdirectory
  CMakePresets.json
  conanfile.py
  cmake/                      # shared helper modules (optional)
    AcmeHelpers.cmake
  libs/
    logger/
      CMakeLists.txt
      include/  src/
    storage/
      CMakeLists.txt          # depends on logger
      include/  src/  tests/
  apps/
    service/
      CMakeLists.txt          # links the libs
      src/  tests/
```

The separation between `libs/` and `apps/` is a convention, not a CMake requirement. It signals intent: `libs/` contains reusable, potentially installable targets; `apps/` contains final executables that consume them.

## Top-level `CMakeLists.txt`

The rule for the top-level file: **set every shared property once, find shared deps once, then add subdirectories**. Subdirectory files declare targets — they don't set standards, find packages, or configure build behavior.

```cmake
cmake_minimum_required(VERSION 3.24)
project(acme LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Runtime linker finds shared deps from both build and install trees.
set(CMAKE_INSTALL_RPATH_USE_LINK_PATH TRUE)
set(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)

# Shared helper modules under cmake/.
list(APPEND CMAKE_MODULE_PATH ${CMAKE_SOURCE_DIR}/cmake)

# Find shared deps ONCE here — never repeat find_package in subdirectory files.
find_package(nlohmann_json REQUIRED)
find_package(Catch2 3 REQUIRED)
find_package(spdlog REQUIRED)

# Project-wide warnings target — all libs and apps link this PRIVATE.
add_library(acme_warnings INTERFACE)
if(MSVC)
    target_compile_options(acme_warnings INTERFACE /W4 /permissive-)
else()
    target_compile_options(acme_warnings INTERFACE
        -Wall -Wextra -Wpedantic -Wconversion -Wshadow)
endif()

enable_testing()

# Libraries first — declaration order matters. A target must exist before any subdir references it.
add_subdirectory(libs/logger)
add_subdirectory(libs/storage)   # storage depends on logger, so logger must come first

# Apps last — they consume the libs declared above.
add_subdirectory(apps/service)
```

Declaration order is load-bearing. If `storage` depends on `logger`, `libs/logger` must appear before `libs/storage` in the `add_subdirectory` calls. CMake processes subdirectories immediately when it encounters `add_subdirectory`, so a target referenced by `storage`'s `CMakeLists.txt` must already be defined.

Why call `find_package` at the top level rather than in each subdirectory? Two reasons:
1. It's faster — `find_package` searches the filesystem; once is better than three times.
2. It's clear — you see the full dependency surface of the monorepo in one file.

## Leaf library — no in-repo deps

`libs/logger/CMakeLists.txt`:

```cmake
add_library(logger STATIC src/Logger.cpp)
target_include_directories(logger PUBLIC include)
target_link_libraries(logger
    PUBLIC  nlohmann_json::nlohmann_json
            spdlog::spdlog
    PRIVATE acme_warnings)
```

This file is deliberately small. No `cmake_minimum_required`, no `project()`, no `find_package` — those are all in the top-level file. This file's only job is to declare what `logger` is, what it includes, and what it links.

`PUBLIC nlohmann_json::nlohmann_json` means consumers of `logger` (like `storage`) automatically get nlohmann_json's headers and link flags without having to declare the dependency themselves.

## Library depending on another in-repo lib

`libs/storage/CMakeLists.txt`:

```cmake
add_library(storage STATIC src/Storage.cpp)
target_include_directories(storage PUBLIC include)
target_link_libraries(storage
    PUBLIC
        logger                              # in-repo lib — bare target name
    PRIVATE
        acme_warnings)

add_subdirectory(tests)
```

In-repo libs are referenced by **bare target name** (`logger`). External deps are referenced by their **imported target** (`nlohmann_json::nlohmann_json`). This distinction is important: the bare name is a CMake target defined within the same build tree. The imported namespaced target is found via `find_package`.

`PUBLIC logger` means `storage`'s consumers also link `logger` transitively — which is correct if `storage.hpp` includes `logger.hpp`. If `logger` is only used in `storage.cpp` and doesn't appear in public headers, use `PRIVATE logger`.

`libs/storage/tests/CMakeLists.txt`:

```cmake
add_executable(storage_unit_tests Storage.unit.tests.cpp)
target_link_libraries(storage_unit_tests
    PRIVATE storage Catch2::Catch2WithMain)
include(Catch)
catch_discover_tests(storage_unit_tests PROPERTIES LABELS "unit")
```

The `LABELS "unit"` property lets `ctest -L unit` run only unit tests, skipping integration or end-to-end tests.

## Application

`apps/service/CMakeLists.txt`:

```cmake
add_executable(service src/main.cpp)
target_link_libraries(service PRIVATE storage logger acme_warnings)
add_subdirectory(tests)
```

This app links both `storage` and `logger` explicitly. Even though `storage` already has a `PUBLIC` dependency on `logger`, it's clearer to list both when `main.cpp` directly `#include`s logger headers. Explicit is better than implicit.

## Configure, build, and test the whole tree

```sh
# Without Conan (if all deps are system-installed):
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure

# With Conan:
conan install . --profile:host=profiles/linux-x86_64 \
                --profile:build=profiles/linux-x86_64 --build=missing
cmake --preset conan-release
cmake --build --preset conan-release -j
ctest --preset conan-release --output-on-failure
```

Slice by test label:

```sh
ctest --test-dir build -L unit        # only unit tests
ctest --test-dir build -LE e2e        # everything except end-to-end tests
```

## Conan for the monorepo

One top-level `conanfile.py` resolves all dependencies across the entire monorepo. Conan deduplicates — if both `logger` and `storage` need `nlohmann_json`, it appears once in the graph:

```python
from conan import ConanFile
from conan.tools.cmake import CMakeToolchain, CMakeDeps, cmake_layout

class Acme(ConanFile):
    settings = "os", "arch", "compiler", "build_type"
    generators = "CMakeToolchain", "CMakeDeps"

    def requirements(self):
        # Union of every in-repo target's deps. Conan deduplicates.
        self.requires("nlohmann_json/3.11.3")
        self.requires("spdlog/1.14.1")

    def build_requirements(self):
        self.test_requires("catch2/3.7.1")

    def layout(self):
        cmake_layout(self)
```

## Shared helper module

As the monorepo grows, you'll find yourself repeating the same `target_link_libraries(${target} PRIVATE acme_warnings)` and `target_compile_features` calls in every leaf `CMakeLists.txt`. Factor them out into a helper function:

`cmake/AcmeHelpers.cmake`:

```cmake
# Apply the project's common per-target settings in one call.
function(acme_configure_target target)
    target_link_libraries(${target} PRIVATE acme_warnings)
    target_compile_features(${target} PUBLIC cxx_std_17)
    set_target_properties(${target} PROPERTIES
        POSITION_INDEPENDENT_CODE ON)
endfunction()
```

Use it in a leaf:

```cmake
include(AcmeHelpers)

add_library(logger STATIC src/Logger.cpp)
target_include_directories(logger PUBLIC include)
target_link_libraries(logger PUBLIC nlohmann_json::nlohmann_json)
acme_configure_target(logger)
```

The top-level `list(APPEND CMAKE_MODULE_PATH ...)` makes `include(AcmeHelpers)` resolve without a path prefix.

## Versioning across packages

For independent library releases (each lib has its own version):

```cmake
# libs/storage/CMakeLists.txt
project(storage VERSION 1.4.0)   # sub-project() sets PROJECT_VERSION locally
add_library(storage STATIC src/Storage.cpp)
set_target_properties(storage PROPERTIES
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR})
```

A sub-`project()` call inside `add_subdirectory` is legal. It sets `PROJECT_VERSION` locally for that lib without affecting the top-level project's version.

For lockstep releases (every lib shares the monorepo's calendar version):

```cmake
# Top-level CMakeLists.txt
project(acme VERSION 2025.06.01 LANGUAGES CXX)

# libs/storage/CMakeLists.txt — inherit the parent version.
add_library(storage STATIC src/Storage.cpp)
set_target_properties(storage PROPERTIES
    VERSION ${PROJECT_VERSION}      # resolves to the top-level 2025.06.01
    SOVERSION ${PROJECT_VERSION_MAJOR})
```

## Key conventions

- **One place** sets standards, RPATH, `enable_testing()`, and shared `find_package` calls: the top-level file. Subdirectory files stay minimal — declare a target, set includes, list links.
- **In-repo libs** linked by **bare target name** (`logger`); **external deps** by their **imported target** (`nlohmann_json::nlohmann_json`). The difference is intentional and visible.
- **Declaration order is load-bearing** — add a comment when ordering is non-obvious: `# storage depends on logger`.
- **Internal libs are usually `STATIC`** — linked into the final binaries. Only install/export libs meant to be consumed outside the monorepo (see `cmake-structure.md` install rules).
- **Shared CMake helper modules** go under `cmake/` and are added to `CMAKE_MODULE_PATH` once at the top level.
