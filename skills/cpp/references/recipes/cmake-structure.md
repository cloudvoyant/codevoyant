# Structuring a CMake Project

## Why this matters

CMake is the lingua franca of modern C++ build systems. Nearly every IDE, CI platform, and package manager speaks it. But a poorly structured CMake project creates subtle, compounding problems: warnings that leak into your dependencies' compilation (causing noise you can't silence), include paths that work on one machine but break on another, and binaries that install correctly in development but fail in production because the library search path is wrong.

This recipe shows the canonical layout that avoids these problems from the start. The key ideas are:

- **Separate the build interface from the install interface** — what paths work during a build are different from what paths work after installation.
- **Contain your warnings** — attach them to a private `INTERFACE` target so they apply to your code but never propagate to consumers.
- **Use explicit source lists for libraries** — CMake cannot detect when you add a new file unless you tell it explicitly, and a missing file causes a silent link failure.
- **Drive everything through `CMakePresets.json`** — never require developers to memorize `-D` flags.

## Directory layout

```
acme_core/
  CMakeLists.txt
  CMakePresets.json
  cmake/
    acme_core-config.cmake.in
  include/acme_core/
    widget.hpp           # public — consumers #include <acme_core/widget.hpp>
  src/
    widget.cpp           # implementation + private helpers
  tests/
    CMakeLists.txt
    widget.tests.cpp
```

The `include/<name>/` convention namespaces your headers so consumers never have a collision. If two libraries both have a `utils.hpp`, the one under `include/acme_core/` wins cleanly: `#include <acme_core/utils.hpp>` is unambiguous.

## Top-level `CMakeLists.txt`

Start with the minimal working library and understand each line before adding more:

```cmake
cmake_minimum_required(VERSION 3.25)
project(acme_core VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)          # ban GNU extensions; you want strict C++17
set(CMAKE_EXPORT_COMPILE_COMMANDS ON CACHE BOOL "" FORCE)  # needed by clang-tidy
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_INSTALL_RPATH_USE_LINK_PATH TRUE)

include(GNUInstallDirs)    # provides CMAKE_INSTALL_LIBDIR, CMAKE_INSTALL_INCLUDEDIR, etc.

# Explicit source list — preferred for libraries. Editing this list triggers re-configure.
add_library(acme_core
    src/widget.cpp
)
add_library(acme_core::acme_core ALIAS acme_core)
```

The `ALIAS` target (`acme_core::acme_core`) is what consumers link against. Using it means the same `target_link_libraries(acme_core::acme_core)` call works whether the library was found via `find_package` or built as a subdirectory in a monorepo.

### Include directories: the build/install split

```cmake
target_include_directories(acme_core
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)
```

The generator expressions (`$<BUILD_INTERFACE:...>` / `$<INSTALL_INTERFACE:...>`) solve a real problem: during a build, your headers are at `/home/user/acme_core/include`. After installation, they're at `/usr/local/include`. These are different paths. Without the split, an installed package would embed the developer's build path into the exported CMake config — breaking on every other machine.

The `PRIVATE src/` entry means internal implementation helpers in `src/` are accessible during compilation but are not advertised to consumers.

### Pin the C++ standard

```cmake
target_compile_features(acme_core PUBLIC cxx_std_17)
```

`PUBLIC` because consumers of your library also need at least C++17 to use your headers. If your library is self-contained and headers are C++14-compatible, use `PRIVATE`.

### Warnings as a separate target

```cmake
add_library(acme_warnings INTERFACE)
if(MSVC)
    target_compile_options(acme_warnings INTERFACE /W4 /permissive-)
else()
    target_compile_options(acme_warnings INTERFACE
        -Wall -Wextra -Wpedantic -Wconversion -Wshadow)
endif()
target_link_libraries(acme_core PRIVATE acme_warnings)
```

Why not just `target_compile_options(acme_core PRIVATE -Wall ...)`? Because `PRIVATE` on `target_compile_options` only prevents the flags from appearing in the flags of targets that link `acme_core`. But if you ever accidentally use `PUBLIC` on the library, the warnings would propagate. Isolating warnings in an `INTERFACE` target makes the intent explicit and reviewable.

### Tests and the install rule guard

```cmake
set_target_properties(acme_core PROPERTIES
    VERSION ${PROJECT_VERSION}
    SOVERSION ${PROJECT_VERSION_MAJOR}
)

option(ACME_CORE_BUILD_TESTS "Build tests" ON)
if(ACME_CORE_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
```

The option lets CI control whether tests are compiled (e.g., skip when building the library for packaging).

## Sources: explicit vs glob

**Explicit — preferred for libraries and shipped code:**

```cmake
add_library(acme_core
    src/widget.cpp
    src/parser.cpp
    src/io.cpp
)
```

When you add `src/new_feature.cpp`, you edit `CMakeLists.txt`. CMake detects the change and re-configures automatically. More importantly, a code reviewer can see new files in the diff.

**Glob — only for high-churn directories like `tests/`:**

```cmake
file(GLOB TEST_SOURCES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/*.tests.cpp")
add_executable(acme_core_tests ${TEST_SOURCES})
```

`CONFIGURE_DEPENDS` makes CMake re-run the glob at build time to detect new files. Without it, adding a test file requires a manual `cmake ..` to register it. Even with `CONFIGURE_DEPENDS`, CMake documentation cautions that this adds overhead on every build. For test directories where files change frequently, the ergonomics trade-off is usually worth it; for library sources, it is not.

## Include scopes: the dependency visibility model

See the [CMake target properties docs](https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html#target-usage-requirements) for the full model. The decision rule we follow:

**Ask who needs the dependency:**
- Used only in `.cpp` files → `PRIVATE` (consumers don't need it)
- Types from the dependency appear in your public headers → `PUBLIC` (consumers must find it)
- Header-only library with types in your headers, no `.cpp` files → `INTERFACE`

```cmake
# JSON parsing is an implementation detail — hidden from consumers.
target_link_libraries(acme_core PRIVATE nlohmann_json::nlohmann_json)

# fmt types appear in acme_core's public API — consumers need fmt too.
target_link_libraries(acme_core PUBLIC fmt::fmt)
```

The most common mistake: forgetting to `find_dependency(fmt)` in `acme_core-config.cmake.in` when `fmt` is `PUBLIC`. Consumers who call `find_package(acme_core)` will compile but fail to link without it.

## Finding packages

```cmake
find_package(Catch2 3 REQUIRED)              # CONFIG: Catch2::Catch2WithMain
find_package(nlohmann_json REQUIRED)         # CONFIG: nlohmann_json::nlohmann_json
find_package(Protobuf REQUIRED CONFIG)       # protobuf::libprotobuf
target_link_libraries(acme_core PUBLIC nlohmann_json::nlohmann_json)
```

Pass a major version (`Catch2 3`) to require that major. Pass `COMPONENTS` for sub-targets. The `CONFIG` keyword forces CMake to use the package's installed config file rather than a legacy Find module — prefer this when the package provides one.

When using Conan, the `conan install` step generates `conan_toolchain.cmake` and all the `Find*.cmake` files, so `find_package` resolves transparently. See `conan-packages.md`.

## FetchContent — vendoring without a package manager

For small test-only dependencies you don't want in Conan:

```cmake
include(FetchContent)
FetchContent_Declare(
    doctest
    GIT_REPOSITORY https://github.com/doctest/doctest.git
    GIT_TAG        v2.4.11      # always pin — never a branch name
)
FetchContent_MakeAvailable(doctest)
target_link_libraries(acme_tests PRIVATE doctest::doctest)
```

Always pin to a tag or commit hash — never a branch. A branch changes what you get on every clean build, breaking reproducibility. FetchContent downloads at configure time; the downloaded source is built as part of your project.

Use FetchContent for small test-only deps. For any dependency you ship as part of your library, prefer Conan — FetchContent doesn't handle binary caching, version conflict resolution, or cross-compilation settings.

## Tests subdirectory

`tests/CMakeLists.txt`:

```cmake
find_package(Catch2 3 REQUIRED)

add_executable(acme_core_tests widget.tests.cpp)
target_link_libraries(acme_core_tests
    PRIVATE
        acme_core::acme_core
        Catch2::Catch2WithMain
)

include(Catch)
catch_discover_tests(acme_core_tests
    PROPERTIES LABELS "unit"
)
```

`catch_discover_tests` runs the test binary once at build time to enumerate test cases, then registers each one individually with CTest. This means `ctest -R MyTestName` works by test name, and CI reporters can show per-test pass/fail.

Run all tests:
```sh
ctest --test-dir build --output-on-failure
```

Run only unit tests:
```sh
ctest --test-dir build -L unit
```

## Install rules (Config package)

Install rules make your library consumable by other CMake projects via `find_package(acme_core)`. Without them, you can only use the library from its build directory.

Add to the library `CMakeLists.txt`:

```cmake
install(TARGETS acme_core
    EXPORT acme_core_targets
    LIBRARY  DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE  DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME  DESTINATION ${CMAKE_INSTALL_BINDIR}
    INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)

install(DIRECTORY include/acme_core
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
    FILES_MATCHING PATTERN "*.hpp"
)

install(EXPORT acme_core_targets
    FILE acme_core_targets.cmake
    NAMESPACE acme_core::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/acme_core
)

include(CMakePackageConfigHelpers)
configure_package_config_file(
    cmake/acme_core-config.cmake.in
    ${CMAKE_CURRENT_BINARY_DIR}/acme_core-config.cmake
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/acme_core
)
write_basic_package_version_file(
    ${CMAKE_CURRENT_BINARY_DIR}/acme_core-config-version.cmake
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)
install(FILES
    ${CMAKE_CURRENT_BINARY_DIR}/acme_core-config.cmake
    ${CMAKE_CURRENT_BINARY_DIR}/acme_core-config-version.cmake
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/acme_core
)
```

`cmake/acme_core-config.cmake.in` — this file is the entry point for consumers calling `find_package(acme_core)`:

```cmake
@PACKAGE_INIT@

include(CMakeFindDependencyMacro)
# Re-find PUBLIC deps so consumers get them transitively.
# Uncomment for each PUBLIC dependency:
# find_dependency(nlohmann_json)

include("${CMAKE_CURRENT_LIST_DIR}/acme_core_targets.cmake")
check_required_components(acme_core)
```

If your library has `PUBLIC` dependencies (types from those deps appear in your headers), you must call `find_dependency` here. Otherwise a consumer who does `find_package(acme_core)` will successfully find your library but fail to compile because the transitive includes aren't resolved.

## CMakePresets.json

Presets eliminate the need to remember `cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ...`. Every developer and CI runner uses the same flags:

```json
{
    "version": 3,
    "cmakeMinimumRequired": { "major": 3, "minor": 25, "patch": 0 },
    "configurePresets": [
        {
            "name": "release",
            "generator": "Ninja",
            "binaryDir": "${sourceDir}/build/release",
            "cacheVariables": {
                "CMAKE_BUILD_TYPE": "Release",
                "CMAKE_EXPORT_COMPILE_COMMANDS": "ON"
            }
        },
        {
            "name": "debug",
            "inherits": "release",
            "binaryDir": "${sourceDir}/build/debug",
            "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug" }
        }
    ],
    "buildPresets": [
        { "name": "release", "configurePreset": "release" },
        { "name": "debug",   "configurePreset": "debug"   }
    ],
    "testPresets": [
        { "name": "release", "configurePreset": "release" }
    ]
}
```

Configure and build:

```sh
cmake --preset release && cmake --build --preset release
cmake --preset debug   && cmake --build --preset debug
```

When using Conan, `conan install` generates a `conan-release` preset automatically — see `conan-packages.md`.

## Common pitfalls

- **Never set `CMAKE_BUILD_TYPE` in `CMakeLists.txt`** — let the preset or the developer's `-D` flag choose. Hardcoding it prevents switching build types.
- **Never set warnings via global `CMAKE_CXX_FLAGS`** — they leak into every target in the tree, including third-party code pulled via `add_subdirectory` or FetchContent.
- **`STATIC` vs `SHARED`** — omit the keyword and the type follows `BUILD_SHARED_LIBS`. This lets consumers override at configure time without editing your `CMakeLists.txt`.
