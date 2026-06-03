---
name: cpp
description: "C++ project patterns: CMake build system, Conan package management, gRPC services, code standards, and release/sanitizer build profiles. Load when writing CMakeLists.txt, conanfile.py, .proto files, or setting up C++ CI."
license: MIT
compatibility: Works on Claude Code, OpenCode, GitHub Copilot (VS Code), and Codex. No platform-specific features used.
---

# cpp

Patterns for modern C++ projects built with CMake + Conan 2.x. Covers single-library and monorepo layouts, package authoring and publishing, gRPC services, and the code-standards / sanitizer toolchain.

## When to load recipes

| You are working on… | Load recipe |
|---|---|
| CMake project structure (single lib or app) | `references/recipes/cmake-structure.md` |
| Adding / consuming Conan packages | `references/recipes/conan-packages.md` |
| Publishing a Conan package | `references/recipes/conan-publishing.md` |
| Debug / Release / ASan / TSan build profiles | `references/recipes/conan-profiles.md` |
| CI/CD with Conan cache | `references/recipes/ci-caching.md` |
| gRPC service definition and implementation | `references/recipes/grpc-patterns.md` |
| Clang-format, clang-tidy, naming conventions | `references/recipes/code-standards.md` |
| Monorepo with multiple libs + apps | `references/recipes/monorepo.md` |

Load `cmake-structure` + `conan-packages` together for any new C++ project.

## Core Conventions

- C++17 minimum, pinned per target with `target_compile_features(<tgt> PUBLIC cxx_std_17)`
- CMake 3.25+ with `CMakePresets.json` driving every configure/build
- Conan 2.x with checked-in `profiles/<os>-<arch>` files — never rely on `conan profile detect`
- Conan generators: `CMakeToolchain` + `CMakeDeps` — your `CMakeLists.txt` stays vanilla `find_package`
- Public headers under `include/<name>/`; consumers `#include <name/header.hpp>`
- Always link via namespaced/alias targets (`acme::acme`, `spdlog::spdlog`) — never bare `-lacme`
- Warnings on a separate `INTERFACE` target, linked PRIVATE so they don't leak to consumers
- Build through `mise run build` / `mise run test` so dev and CI run the same pipeline

## Repo Layout (single library)

```
acme_core/
  CMakeLists.txt
  CMakePresets.json
  conanfile.py
  profiles/
    linux-x86_64
    linux-x86_64-debug
    linux-x86_64-asan
    macos-aarch64
  cmake/
    acme_core-config.cmake.in
  include/acme_core/
    widget.hpp
  src/
    widget.cpp
  tests/
    CMakeLists.txt
    widget.tests.cpp
  .clang-format
  .clang-tidy
  mise.toml
  mise-tasks/
    install
    build
    test
```

For multi-package layout (libs + apps), see `references/recipes/monorepo.md`.

## Common Pitfalls

- Hyphenated Conan package names map to underscored CMake names (`step-sdk` → `find_package(step_sdk)`). The recipe sets `cmake_file_name` / `cmake_target_name` — see `conan-packages.md`.
- Two packages exporting the same upstream lib under different target names (e.g. `OpenCASCADE::OpenCASCADE` vs `opencascade::opencascade`) collide at `CMakeDeps` time. Pick one source and reconcile target casing.
- Don't hard-set `CMAKE_BUILD_TYPE` in `CMakeLists.txt` — let presets / `-D` choose it.
- Never set warnings via global `CMAKE_CXX_FLAGS` — they leak into dependencies. Use an `INTERFACE` warnings target.
- Commit `conan.lock` once you ship; regenerate only on intentional dep bumps.
- Generated `.pb.{h,cc}` and `.grpc.pb.{h,cc}` belong in `${CMAKE_BINARY_DIR}` — never committed.
