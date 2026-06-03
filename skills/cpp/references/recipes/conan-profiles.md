# Debug, Release, and Sanitizer Build Profiles

## Why this matters

Every C++ binary is compiled with a specific set of settings: which OS, which CPU architecture, which compiler, which C++ standard, which optimization level. Conan calls this combination a **profile**, and it's what allows Conan to give you exactly the right prebuilt binary — or build from source with exactly your settings.

The problem most teams hit early is relying on `conan profile detect`. This command generates a profile based on whatever compiler happens to be installed on the current machine. Developer A on Ubuntu 22.04 with GCC 11 gets a different profile than Developer B on Ubuntu 24.04 with GCC 13. CI gets yet another. When profiles differ, Conan generates different package IDs — meaning everyone is potentially building different binaries from source, slowly, on every machine.

The fix is simple but takes discipline: **commit one profile file per target platform under `profiles/`** and never let Conan auto-detect in your project. Every developer and CI runner uses the committed files. Everyone builds against identical settings. Package IDs match, so the Conan binary cache actually works across machines.

The second reason profiles matter is sanitizers. AddressSanitizer (ASan) and ThreadSanitizer (TSan) are compiler instrumentation modes that catch entire classes of bugs at runtime — memory corruption, use-after-free, data races. These bugs are frequently invisible in regular Debug builds, only surfacing under load in production. Running your test suite under ASan and TSan in CI is the most cost-effective way to catch them early. Profiles make this one flag away.

## Layout

```
profiles/
  linux-x86_64                 # release, gcc-13
  linux-x86_64-debug           # debug variant (composes release)
  linux-x86_64-asan            # AddressSanitizer
  linux-x86_64-tsan            # ThreadSanitizer
  linux-x86_64-ubsan           # UndefinedBehaviorSanitizer
  linux-aarch64
  linux-aarch64-debug
  macos-aarch64
  macos-aarch64-debug
  windows-x86_64               # MSVC
```

Filename convention: `<os>-<arch>` with no file extension, plus a `-<variant>` suffix for non-release variants.

## Release profiles per OS/arch

These are your base profiles. Every variant composes from one of these.

`profiles/linux-x86_64`:

```ini
[settings]
os=Linux
arch=x86_64
compiler=gcc
compiler.version=13
compiler.libcxx=libstdc++11
compiler.cppstd=17
build_type=Release
```

`profiles/linux-aarch64`:

```ini
[settings]
os=Linux
arch=armv8
compiler=gcc
compiler.version=13
compiler.libcxx=libstdc++11
compiler.cppstd=17
build_type=Release
```

Note: Conan uses `armv8` for 64-bit ARM (not `aarch64` or `arm64`). This is Conan's internal naming; your profile files must use `armv8` regardless of what `uname -m` prints.

`profiles/macos-aarch64`:

```ini
[settings]
os=Macos
arch=armv8
compiler=apple-clang
compiler.version=17
compiler.libcxx=libc++
compiler.cppstd=17
build_type=Release
```

`profiles/windows-x86_64`:

```ini
[settings]
os=Windows
arch=x86_64
compiler=msvc
compiler.version=193
compiler.runtime=dynamic
build_type=Release

[conf]
tools.cmake.cmaketoolchain:generator=Ninja
```

Pin `compiler.cppstd` in every profile. This makes the C++ standard part of the package ID — meaning a package built with C++14 and one built with C++17 are treated as different binaries. Without this pin, Conan might reuse a C++14-built binary for a C++17 project, causing subtle ABI incompatibilities.

## Debug variant — compose, don't duplicate

Copy-pasting the release profile and changing `build_type=Debug` is error-prone — a future change to the release profile won't automatically apply to the debug profile.

Instead, use Conan's `include()` directive to compose:

`profiles/linux-x86_64-debug`:

```ini
include(linux-x86_64)

[settings]
build_type=Debug
```

That's the entire file. The `include()` pulls all settings from `linux-x86_64`, and `build_type=Debug` overrides just the one setting. CMake's Debug build type automatically implies `-O0 -g` (no optimization, full debug symbols). No additional flags needed.

## AddressSanitizer profile — catching memory bugs

AddressSanitizer instruments your binary to detect:
- Heap buffer overflows and underflows
- Stack buffer overflows
- Use-after-free (reading memory after it's been freed)
- Use-after-return (returning a pointer to a stack variable)
- Memory leaks

These are real production bugs. A typical codebase that passes all its tests in Release mode will often fail within seconds of running under ASan if there are any latent heap issues.

`profiles/linux-x86_64-asan`:

```ini
include(linux-x86_64)

[settings]
build_type=Debug

[conf]
tools.build:cxxflags=["-fsanitize=address", "-fno-omit-frame-pointer"]
tools.build:cflags=["-fsanitize=address", "-fno-omit-frame-pointer"]
tools.build:sharedlinkflags=["-fsanitize=address"]
tools.build:exelinkflags=["-fsanitize=address"]
```

`-fno-omit-frame-pointer` preserves stack frames in the output so ASan's error reports show readable function names and line numbers instead of raw addresses.

The flags must appear in both compile flags and link flags — ASan is both a compiler instrumentation and a runtime library that must be linked.

## ThreadSanitizer profile — catching data races

ThreadSanitizer detects data races: two threads accessing the same memory concurrently, at least one writing, without synchronization. Data races are undefined behavior in C++ and cause intermittent, platform-specific crashes that are nearly impossible to debug after the fact.

`profiles/linux-x86_64-tsan`:

```ini
include(linux-x86_64)

[settings]
build_type=Debug

[conf]
tools.build:cxxflags=["-fsanitize=thread", "-fno-omit-frame-pointer"]
tools.build:cflags=["-fsanitize=thread", "-fno-omit-frame-pointer"]
tools.build:sharedlinkflags=["-fsanitize=thread"]
tools.build:exelinkflags=["-fsanitize=thread"]
```

Note: ASan and TSan are mutually exclusive — you cannot combine them in a single binary. Run them as separate CI jobs.

## UndefinedBehaviorSanitizer — catching silent UB

UBSan catches:
- Signed integer overflow (undefined in C++; wraps in most implementations, but not guaranteed)
- Null pointer dereference
- Invalid enum values
- Shift amount out of bounds
- Misaligned pointer access

`profiles/linux-x86_64-ubsan`:

```ini
include(linux-x86_64)

[settings]
build_type=Debug

[conf]
tools.build:cxxflags=["-fsanitize=undefined", "-fno-sanitize-recover=undefined", "-fno-omit-frame-pointer"]
tools.build:sharedlinkflags=["-fsanitize=undefined"]
tools.build:exelinkflags=["-fsanitize=undefined"]
```

`-fno-sanitize-recover=undefined` is important: by default, UBSan prints a warning and continues. This flag makes it abort on the first error — matching production semantics (undefined behavior causes a crash or corruption, not a polite warning).

UBSan can be combined with ASan: use `-fsanitize=address,undefined` in a combined profile.

## Cross-compilation profile

`profiles/linux-aarch64-cross`:

```ini
[settings]
os=Linux
arch=armv8
compiler=gcc
compiler.version=12
compiler.libcxx=libstdc++11
build_type=Release

[buildenv]
CC=aarch64-linux-gnu-gcc-12
CXX=aarch64-linux-gnu-g++-12
LD=aarch64-linux-gnu-ld
AR=aarch64-linux-gnu-ar
RANLIB=aarch64-linux-gnu-ranlib
STRIP=aarch64-linux-gnu-strip

[conf]
tools.cmake.cmaketoolchain:system_name=Linux
tools.cmake.cmaketoolchain:system_processor=aarch64
```

Use this as `--profile:host` (the target architecture) while keeping your native profile as `--profile:build` (the compilation machine):

```bash
conan install . \
  --profile:host=profiles/linux-aarch64-cross \
  --profile:build=profiles/linux-x86_64 \
  --build=missing
```

## Selecting a profile at install time

```bash
# Native release build.
conan install . \
  --profile:host=profiles/linux-x86_64 \
  --profile:build=profiles/linux-x86_64 \
  --build=missing

# ASan build — same command, different profile.
conan install . \
  --profile:host=profiles/linux-x86_64-asan \
  --profile:build=profiles/linux-x86_64-asan \
  --build=missing

# Cross-compile to aarch64 from an x86_64 host.
conan install . \
  --profile:host=profiles/linux-aarch64-cross \
  --profile:build=profiles/linux-x86_64 \
  --build=missing
```

Each profile produces a different Conan package ID, so different profile builds land in different cache directories and never overwrite each other.

## Profile resolver script

In CI matrix builds, you want to derive the profile name from the host environment without hardcoding it per job. This script maps the running OS and architecture to a profile filename:

```bash
#!/usr/bin/env bash
# resolve-profile.sh — usage: resolve-profile.sh [release|debug|asan|tsan|ubsan]
set -euo pipefail
VARIANT="${1:-release}"

# host triple from uname: darwin -> macos, arm64 -> aarch64
HOST="${HOST:-$(uname -s | tr '[:upper:]' '[:lower:]' | sed s/darwin/macos/)-$(uname -m | sed s/arm64/aarch64/)}"

if [ "$VARIANT" = "release" ]; then
  NAME="$HOST"
else
  NAME="$HOST-$VARIANT"
fi

[ -f "profiles/$NAME" ] || { echo "ERROR: profiles/$NAME not found" >&2; exit 1; }
printf '%s\n' "$NAME"
```

Use it:

```bash
PROFILE=$(./resolve-profile.sh asan)
conan install . \
  --profile:host="profiles/$PROFILE" \
  --profile:build="profiles/$PROFILE" \
  --build=missing
```

Setting `HOST` externally overrides the detected triple — useful for CI matrix rows targeting different architectures.

## Verifying profiles

```bash
# Inspect resolved settings — check the output matches your intent.
conan profile show -pr profiles/linux-x86_64
conan profile show -pr profiles/linux-x86_64-asan  # confirm -fsanitize=address appears

# Install with two different profiles — you should see distinct package IDs in the cache.
conan install . -pr profiles/linux-x86_64
conan install . -pr profiles/linux-x86_64-asan
conan list "acme-lib/*"    # two separate binaries in the cache
```

## Suppressing false positives from third-party code

ASan and TSan will sometimes report issues in third-party libraries you can't fix. Suppress them rather than disabling the sanitizer entirely:

`asan-suppressions.txt`:

```
leak:libcurl.so
interceptor_via_fun:__interceptor_strdup
```

`tsan-suppressions.txt`:

```
race:libcrypto.so
deadlock:libsqlite3.so
```

Pass the suppression files via environment variables before running your tests:

```bash
LSAN_OPTIONS="suppressions=$(pwd)/asan-suppressions.txt" \
ASAN_OPTIONS="halt_on_error=1:abort_on_error=1:detect_leaks=1" \
  ctest --test-dir build/asan --output-on-failure

TSAN_OPTIONS="suppressions=$(pwd)/tsan-suppressions.txt:halt_on_error=1" \
  ctest --test-dir build/tsan --output-on-failure
```

`halt_on_error=1` stops at the first error rather than accumulating a report. This makes CI failures immediately actionable — you fix one bug at a time rather than wading through a multi-page sanitizer dump.
