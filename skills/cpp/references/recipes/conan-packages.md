# Managing C++ Dependencies with Conan

## Why this matters

C++ has historically had no standard package manager. The traditional alternatives — vendoring source in your repo, using OS packages (`apt install libboost-dev`), or relying on system-installed libraries — each create serious problems at scale:

- **Vendored source** inflates repo size, makes version bumps painful, and doesn't handle platform-specific build flags.
- **OS packages** differ between Ubuntu 22.04 and 24.04, between macOS versions, and are unavailable in cross-compilation scenarios.
- **System-installed libraries** mean "works on my machine" is real: every developer has a subtly different set of libraries.

Conan 2.x solves all three. It downloads, builds (when needed), and installs packages into a per-user cache keyed by exact settings: OS, architecture, compiler, C++ standard, and build type. Two developers with different GCC versions get different cached binaries but the same dependency graph. CI gets exact reproducibility through a lockfile.

The other half of the solution is CMake's `find_package`. Conan generates standard CMake config files so your `CMakeLists.txt` never imports Conan-specific macros. You write `find_package(spdlog REQUIRED)` — that's it. If you ever switch away from Conan, the CMake code doesn't change.

## Install Conan 2.x

```bash
pipx install conan           # isolated from your system Python
conan --version              # expect: Conan version 2.x
```

Do not use `conan profile detect` on shared machines or in CI — it generates a profile based on whatever compiler happens to be installed. Instead, commit real profiles. See `conan-profiles.md`.

## Step 1: The simplest consumer — `conanfile.txt`

For a project that only consumes packages and won't be published as a package itself:

```ini
[requires]
spdlog/1.14.1
nlohmann_json/3.11.3

[generators]
CMakeToolchain
CMakeDeps

[layout]
cmake_layout
```

`CMakeLists.txt` stays completely vanilla:

```cmake
cmake_minimum_required(VERSION 3.25)
project(hello_app CXX)

find_package(spdlog REQUIRED)
find_package(nlohmann_json REQUIRED)

add_executable(hello_app src/main.cpp)
target_link_libraries(hello_app PRIVATE
    spdlog::spdlog
    nlohmann_json::nlohmann_json
)
target_compile_features(hello_app PRIVATE cxx_std_17)
```

Install and build:

```bash
conan install . \
  --profile:host=profiles/linux-x86_64 \
  --profile:build=profiles/linux-x86_64 \
  --build=missing

cmake --preset conan-release
cmake --build --preset conan-release
```

`--build=missing` tells Conan to build from source any package for which there is no prebuilt binary matching your profile. On a first install this is common; cached after that.

The `conan install` step generates a `conan-release` (and `conan-debug`) CMake preset in `CMakeUserPresets.json`. That preset sets `CMAKE_TOOLCHAIN_FILE` to the generated `conan_toolchain.cmake`, which is what makes `find_package` work without any extra paths.

## Step 2: Project-owned consumer — `conanfile.py`

When you need fine-grained control — specifying transitive header exposure, custom build variables, or conditional requirements — use a Python recipe:

```python
from conan import ConanFile
from conan.tools.cmake import CMakeToolchain, CMakeDeps, cmake_layout

class HelloApp(ConanFile):
    settings = "os", "arch", "compiler", "build_type"

    def requirements(self):
        # transitive_headers=True surfaces a dep's headers to YOUR consumers
        # when your public headers #include it.
        self.requires("nlohmann_json/3.11.3", transitive_headers=True)
        self.requires("spdlog/1.14.1")

    def build_requirements(self):
        # test_requires: dep is built for tests but not part of the package
        # a consumer sees.
        self.test_requires("catch2/3.7.1")

    def layout(self):
        cmake_layout(self)

    def generate(self):
        CMakeToolchain(self).generate()
        CMakeDeps(self).generate()
```

The distinction between `requirements()` and `build_requirements()` matters for published libraries. A `test_requires` dep (like Catch2) is not part of your package's consumer-facing dependency graph — downstream users who `conan install` your library won't need to download Catch2.

## Build vs. host profiles — why there are two

Every `conan install` resolves against two profiles:

- `--profile:build` — the machine doing the compiling. Build-time tools (code generators, `protoc`) come from here.
- `--profile:host` — the machine the artifact will run on. Libraries you link against come from here.

For native builds they're the same file. For cross-compilation they differ:

```bash
# Cross-compile to ARM from an x86 machine:
conan install . \
  --profile:host=profiles/linux-aarch64 \
  --profile:build=profiles/linux-x86_64 \
  --build=missing
```

In a recipe, declare the difference explicitly:
- Build-time tools: `self.tool_requires("protobuf/<host_version>")` — runs during build on the build machine.
- Runtime libraries: `self.requires("protobuf/5.27.0")` — linked into the final binary for the host.

Always pass both profiles explicitly, even for native builds. Relying on Conan's auto-detected default profile is the most common source of "works on my machine" CI failures.

## Lockfiles — guaranteed reproducibility

Without a lockfile, `conan install` resolves the latest compatible version of each dependency. A patch release of a transitive dependency can silently change what gets built. A lockfile pins the exact version of every package in the graph:

```bash
# Generate the lockfile once, then commit it:
conan lock create . \
  --profile:host=profiles/linux-x86_64 \
  --profile:build=profiles/linux-x86_64
# commits conan.lock

# All future installs use pinned versions:
conan install . \
  --profile:host=profiles/linux-x86_64 \
  --profile:build=profiles/linux-x86_64 \
  --lockfile=conan.lock \
  --build=missing
```

Regenerate the lockfile only when you intentionally bump a dependency version. Treat a lockfile update as a deliberate code change that gets reviewed.

## Remotes — where packages are downloaded from

By default, Conan downloads from `conancenter`. To add a private registry (for internal packages or cached mirrors):

```bash
conan remote list
conan remote add --index 0 acme-conan \
  "https://gitlab.example.com/api/v4/projects/12345678/packages/conan"
conan remote login acme-conan "$CONAN_USER" -p "$CONAN_TOKEN"
```

`--index 0` places the private remote first, so it's searched before ConanCenter. This is important when you have internal versions of packages that would otherwise be shadowed by ConanCenter versions.

Idempotent guard for bootstrap scripts (safe to re-run):

```bash
if ! conan remote list | grep -q "^acme-conan:"; then
  conan remote add --index 0 acme-conan "$REMOTE_URL"
fi
```

## Auto-loading the Conan toolchain (optional convenience)

After `conan install`, a plain `cmake -S . -B build` (without `-DCMAKE_TOOLCHAIN_FILE=...`) fails to find your packages. You can fix this by adding a guard at the top of `CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.25)

if(EXISTS "${CMAKE_BINARY_DIR}/generators/conan_toolchain.cmake" AND NOT CMAKE_TOOLCHAIN_FILE)
    include("${CMAKE_BINARY_DIR}/generators/conan_toolchain.cmake")
endif()

project(acme_core VERSION 1.0.0 LANGUAGES CXX)
```

This is a convenience for developers who forget to use `--preset conan-release`. In CI, always use the preset explicitly.

## Target naming — the most common source of confusion

The CMake target name is not automatically the Conan package name. Two rules:

**Rule 1: Hyphens in Conan names become underscores in CMake names.**

Conan package `step-sdk` → `find_package(step_sdk)` and link target `step_sdk::step_sdk`. The package recipe sets this:

```python
self.cpp_info.set_property("cmake_file_name", "step_sdk")
self.cpp_info.set_property("cmake_target_name", "step_sdk::step_sdk")
```

If you're consuming a third-party package and getting "Could not find package step-sdk", check how the package sets `cmake_file_name`. Look at the package's `conanfile.py` on ConanCenter or run `conan inspect step-sdk/1.0.0`.

**Rule 2: Vendor-defined casing may not match the package name.**

`opencascade` from Conan may export `OpenCASCADE::OpenCASCADE` to match the upstream CMake convention. Use whatever the package exports, not a guess based on the package name.

**Rule 3: `cpp_info.libs` is mandatory for prebuilt wraps.**

If you wrap a prebuilt SDK and forget to set `self.cpp_info.libs = ["acme_lib"]`, headers will compile but the linker will fail with unresolved symbols — because CMake doesn't know where the `.so` or `.lib` file is.

## Target collision — two packages exporting the same upstream lib

This happens when two of your dependencies both wrap the same upstream library (e.g., both `opencascade/7.8.0` and a vendor SDK internally use OpenCASCADE and declare its CMake targets). `CMakeDeps` then fails with a duplicate or conflicting target error.

Fix:
1. **Pick one source.** Declare the shared library once as a direct `self.requires(...)` in your root recipe — Conan's dependency solver deduplicates it.
2. **Reconcile casing.** Ensure every consumer references the same exported target name. Align a wrap's `cmake_target_name` to the dominant casing used by the majority of packages.
3. **Remove unused linkage.** A dep that's never `#include`d but pulls a colliding transitive can often be removed entirely.

## Inspecting and cleaning the Conan cache

```bash
conan list "spdlog/*"             # list cached versions and revisions
conan cache path spdlog/1.14.1    # filesystem path of the cached package
conan remove "spdlog/*"           # evict from cache
```

For per-project isolation (useful when working on multiple projects with conflicting profiles):

```bash
export CONAN_HOME="$PWD/.conan2"
```

This keeps the cache, profiles, and `remotes.json` inside the project directory instead of `~/.conan2`.

## Deploying shared libraries at runtime

When your app depends on Conan-managed shared libraries, those `.so` files need to be present at runtime. The `runtime_deploy` feature is experimental and silently skips packages without `package_type="shared-library"`. A reliable fallback is to copy `.so` files out of the cache after install:

```bash
BUILD_DIR=build/linux-x86_64
mkdir -p "$BUILD_DIR/runtime"
CONAN_HOME="${CONAN_HOME:-$HOME/.conan2}"
find "$CONAN_HOME/p" \( -name '*.so' -o -name '*.so.*' \) \
  -path '*/p/lib/*' -type f \
  -exec cp -L -n {} "$BUILD_DIR/runtime/" \;
```

`cp -L` dereferences symlinks so you get actual files, not symlinks into the cache. In a container, `COPY runtime/ /app/lib` and set `LD_LIBRARY_PATH=/app/lib`.
