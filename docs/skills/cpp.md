---
title: cpp
---

# cpp

Context skill for modern C++ projects built with CMake 3.25+ and Conan 2.x.

## Requirements

- CMake 3.25+ — build system generator
- Conan 2.x — C++ package manager (`pip install conan`)
- A C++17-capable compiler (GCC 9+, Clang 10+, or MSVC 19.26+)

## Philosophy

Every project is driven by `CMakePresets.json`; neither developers nor CI invoke raw `cmake -D` flags. Conan uses checked-in `profiles/<os>-<arch>` files with `CMakeToolchain` and `CMakeDeps` generators so `CMakeLists.txt` stays standard `find_package`. Public headers live under `include/<name>/` and targets are always linked by namespaced alias (`acme::acme`), never by bare linker flags. Compiler warnings are attached to a private `INTERFACE` target so they never leak to consumers.

## Recipes

- [Structuring a CMake Project](./cpp/recipes/cmake-structure) — directory layout, target wiring, install rules, and CMakePresets
- [C++ Code Standards](./cpp/recipes/code-standards) — naming conventions, headers, modern C++ rules, and forbidden patterns
- [Formatting, Linting, and Static Analysis](./cpp/recipes/formatting-and-analysis) — clang-format config, clang-tidy checks, CMake targets, pre-commit hook, and CI gate
- [Managing C++ Dependencies with Conan](./cpp/recipes/conan-packages) — adding and consuming packages with Conan 2.x
- [Debug, Release, and Sanitizer Build Profiles](./cpp/recipes/conan-profiles) — checked-in profiles for Debug, Release, ASan, TSan, and cross-compilation
- [Publishing a Conan Package](./cpp/recipes/conan-publishing) — authoring a conanfile.py, publishing to ConanCenter or a private GitLab registry
- [Monorepo with Multiple Libraries](./cpp/recipes/monorepo) — scaling to multiple libs and apps with a single CMake tree
- [gRPC Services in C++](./cpp/recipes/grpc-patterns) — proto conventions, CMake codegen, sync/async server and client, testing
- [Conan Package Cache in CI](./cpp/recipes/ci-caching) — GitHub Actions and GitLab CI cache setup with Conan lockfiles

## References

- [CMake documentation](https://cmake.org/cmake/help/latest/)
- [Conan 2 documentation](https://docs.conan.io/2/)
- [cppreference.com](https://en.cppreference.com)
