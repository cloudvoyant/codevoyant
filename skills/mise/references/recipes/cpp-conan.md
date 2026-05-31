# C++ + Conan Setup

mise.toml patterns for C++ projects using Conan 2 for dependency management and CMake as the build system.

## Standard Setup

```toml
[env]
PROJECT = "my-cpp-project"
VERSION = "{{ exec(command='cat version.txt 2>/dev/null | tr -d [:space:] || echo 0.1.0') }}"
BUILD_TYPE = "Debug"   # override with: BUILD_TYPE=Release mise run build-prod

[tools]
python = "latest"   # Conan is a Python package
cmake  = "latest"
ninja  = "latest"   # faster than make; used as CMake generator
# Note: install conan via pip inside the install task, not as a mise tool

[tasks.install]
description = "Install Conan dependencies and configure CMake"
run         = """
pip install --user conan
conan profile detect --force
conan install . \
  --output-folder=build \
  --build=missing \
  -s build_type={{ env.BUILD_TYPE }}
cmake -B build -G Ninja \
  -DCMAKE_BUILD_TYPE={{ env.BUILD_TYPE }} \
  -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake
"""

[tasks.build]
description = "Build the project (debug)"
run         = "cmake --build build --config Debug -j $(nproc 2>/dev/null || sysctl -n hw.logicalcpu)"

[tasks.build-prod]
description = "Build optimized release binary"
run         = """
BUILD_TYPE=Release cmake -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake
cmake --build build --config Release -j $(nproc 2>/dev/null || sysctl -n hw.logicalcpu)
"""

[tasks.run]
description = "Build and run the binary"
depends     = ["build"]
run         = "./build/bin/{{ env.PROJECT }}"

[tasks.test]
description = "Build and run tests with CTest"
depends     = ["build"]
run         = "cd build && ctest --output-on-failure -C Debug"

[tasks.format]
description = "Format C++ source files with clang-format"
run         = "find src include -name '*.cpp' -o -name '*.h' -o -name '*.hpp' | xargs clang-format -i"

[tasks."format-check"]
description = "Check C++ formatting without modifying files"
run         = "find src include -name '*.cpp' -o -name '*.h' -o -name '*.hpp' | xargs clang-format --dry-run -Werror"

[tasks.lint]
description = "Run clang-tidy static analysis"
run         = """
find src -name '*.cpp' | xargs clang-tidy \
  -p build/compile_commands.json \
  --warnings-as-errors='*'
"""

[tasks.clean]
description = "Remove build artifacts"
run         = "rm -rf build/"

[tasks.docker-build]
description = "Build Docker image"
run         = "docker build -t $PROJECT:$VERSION ."

[tasks.docker-test]
description = "Run tests inside Docker"
run         = "docker run --rm $PROJECT:$VERSION ctest --output-on-failure"

[tasks.version]
description = "Print current version"
run         = "cat version.txt"
```

## Conan Profile Notes

On first run, `conan profile detect` auto-detects compiler, stdlib, and architecture. The detected profile is saved at `~/.conan2/profiles/default`.

For cross-compilation or custom profiles, create named profiles and pass `-pr:b=default -pr:h=my-cross-profile`.

## CMake + Conan Integration

Conan 2 generates a `conan_toolchain.cmake` in the output folder. Always pass it to CMake:

```bash
cmake -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake ...
```

Enable `compile_commands.json` for clang-tidy and IDE integration:

```cmake
# CMakeLists.txt
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
```

## Parallel Builds

Use `$(nproc)` on Linux and `$(sysctl -n hw.logicalcpu)` on macOS for portable parallelism:

```bash
cmake --build build -j $(nproc 2>/dev/null || sysctl -n hw.logicalcpu)
```

## conanfile.py vs conanfile.txt

- `conanfile.txt` — simple projects, no custom logic
- `conanfile.py` — use when you need custom settings, options, or generators

```toml
# conanfile.txt example:
[requires]
fmt/10.2.1
spdlog/1.13.0

[generators]
CMakeToolchain
CMakeDeps
```
