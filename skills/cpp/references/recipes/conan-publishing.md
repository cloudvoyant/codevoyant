# Publishing a Conan Package

## Why this matters

Once you have a C++ library you want to share — within your organization or publicly — you need a way for other projects to depend on it without copying source code. Publishing a Conan package gives consumers a single `self.requires("acme-lib/1.0.0")` that handles downloading, building, and wiring the library into their CMake project.

The alternative — telling consumers to clone your repo and add it as a `FetchContent` or `add_subdirectory` dependency — doesn't scale: it pulls in your test infrastructure, your internal tooling, and your build options. It also means every consumer has to rebuild from source on every machine.

A published Conan package is a contract: consumers get a stable API, prebuilt binaries for supported platforms, and transitive dependency resolution. You control what is exposed (public headers, link targets) and what is hidden (test code, implementation details).

This recipe covers three paths: authoring the recipe, publishing to ConanCenter (public), and publishing to a private GitLab Conan registry (internal).

## The packaging recipe — `conanfile.py`

The packaging recipe is the full version of `conanfile.py` that describes not just how to consume your library, but how to build and package it:

```python
from conan import ConanFile
from conan.tools.cmake import CMake, CMakeDeps, CMakeToolchain, cmake_layout


class AcmeLibConan(ConanFile):
    name = "acme-lib"

    # The four settings that compose a package ID.
    # A change to any of these generates a different binary.
    settings = "os", "compiler", "build_type", "arch"

    options = {"shared": [True, False], "fPIC": [True, False]}
    default_options = {"shared": True, "fPIC": True}

    # Source files to include when Conan exports this recipe.
    exports_sources = (
        "CMakeLists.txt",
        "cmake/*",
        "src/*",
        "include/*",
        "tests/*",
        "README.md",
        "LICENSE*",
    )

    def set_version(self):
        # self.version is pre-set when using `conan create . --version X`.
        # Otherwise read from a VERSION file or hardcode here.
        if self.version is None:
            self.version = "1.0.0"

    def config_options(self):
        # fPIC (position-independent code) is irrelevant on Windows.
        if self.settings.os == "Windows":
            del self.options.fPIC

    def configure(self):
        # A shared library is always position-independent — remove the redundant option.
        if self.options.shared:
            self.options.rm_safe("fPIC")

    def requirements(self):
        # transitive_headers=True means consumers of acme-lib also need nlohmann_json
        # headers — because acme_lib.hpp #includes <nlohmann/json.hpp>.
        self.requires("nlohmann_json/3.11.3", transitive_headers=True)

    def build_requirements(self):
        # test_requires: Catch2 is needed to build and run tests, but it is NOT
        # part of the published package. Consumers of acme-lib don't need Catch2.
        self.test_requires("catch2/3.7.1")

    def layout(self):
        cmake_layout(self)

    def generate(self):
        tc = CMakeToolchain(self)
        # Pass the version into CMake so it can be baked into the binary.
        tc.cache_variables["MY_LIBRARY_VERSION"] = str(self.version)
        tc.generate()
        CMakeDeps(self).generate()

    def build(self):
        cmake = CMake(self)
        cmake.configure(variables={"BUILD_TESTS": "ON"})
        cmake.build()

    def package(self):
        # Delegate to CMake's install rules — this is why cmake-structure.md install rules matter.
        CMake(self).install()

    def package_info(self):
        # cmake_file_name: the name passed to find_package().
        # cmake_target_name: the target used in target_link_libraries().
        self.cpp_info.set_property("cmake_file_name", "acme_lib")
        self.cpp_info.set_property("cmake_target_name", "acme_lib::acme_lib")
        self.cpp_info.libs = ["acme_lib"]
        # Declare that consumers also need nlohmann_json linked in.
        self.cpp_info.requires = ["nlohmann_json::nlohmann_json"]
```

### Why `package_info()` matters

`package_info()` is how Conan tells downstream consumers' CMake configuration what your library exports. Without it (or with wrong values), consumers see one of these failure modes:

- **Missing `cmake_file_name`**: `find_package(acme_lib)` fails with "package not found" even though Conan installed it.
- **Missing `cpp_info.libs`**: Headers compile, but the linker reports unresolved symbols because CMake doesn't know where the `.so` or `.lib` file is.
- **Wrong `cmake_target_name`**: Consumers get a "target not found" error when calling `target_link_libraries(app acme_lib::acme_lib)`.

## Components — multiple link targets in one package

If your package provides multiple independent libraries (e.g., a client library and a server library that share common code):

```python
def package_info(self):
    self.cpp_info.set_property("cmake_file_name", "acme_lib")

    client = self.cpp_info.components["acme_client"]
    client.set_property("cmake_target_name", "acme_lib::acme_client")
    client.libs = ["acme_client"]
    client.requires = ["grpc::grpc++", "protobuf::libprotobuf"]

    server = self.cpp_info.components["acme_server"]
    server.set_property("cmake_target_name", "acme_lib::acme_server")
    server.libs = ["acme_server"]
    server.requires = ["acme_lib::acme_client"]   # server builds on client
```

Consumers link precisely what they need:

```cmake
target_link_libraries(my_client PRIVATE acme_lib::acme_client)
target_link_libraries(my_server PRIVATE acme_lib::acme_server)
```

## Build-time tools — protoc and code generators

If your library uses Protobuf or gRPC, you need both the runtime library (a `requirements` dep) and the code generator tool (a `build_requirements` dep):

```python
def requirements(self):
    self.requires("grpc/1.65.0")        # runtime: linked into the binary
    self.requires("protobuf/5.27.0")    # runtime: linked into the binary

def build_requirements(self):
    self.test_requires("catch2/3.7.1")
    # Tool deps: these run during the build to generate .pb.cc/.grpc.pb.cc files.
    # They are NOT linked into the final binary.
    self.tool_requires("protobuf/<host_version>")
    self.tool_requires("grpc/<host_version>")
```

`<host_version>` is a Conan version range that resolves to the same version as the runtime dep. Using a tool_requires ensures the code generator binary is built for the build machine, even during cross-compilation — the linker dep is still built for the host.

## Creating the package locally

Before publishing, verify the package builds and is consumable:

```bash
conan create . \
  --profile:host=profiles/linux-x86_64 \
  --profile:build=profiles/linux-x86_64 \
  --build=missing

conan list "acme-lib/*"       # confirm it landed in the cache
```

The `test_package/` directory (if present) runs automatically. It's a minimal project with its own `conanfile.py` that `self.requires(self.tested_reference_str)` — proving the package is actually consumable from the published state, not just from the build directory.

In Conan 2.x, package references are `name/version`. No trailing `@`, no `user/channel` unless you explicitly add them.

## Publishing to ConanCenter (public)

ConanCenter does not accept `conan upload`. You contribute the recipe to the index repo:

1. Fork `conan-io/conan-center-index`.
2. Add `recipes/acme-lib/all/conanfile.py` + `recipes/acme-lib/config.yml`:
   ```yaml
   versions:
     "1.0.0":
       folder: all
   ```
3. Validate locally the same way CI will:
   ```bash
   conan create recipes/acme-lib/all --version 1.0.0 --build=missing
   ```
4. Open a PR. The ConanCenter bot builds across its platform matrix. Once merged, anyone globally can `conan install --requires=acme-lib/1.0.0`.

ConanCenter is the right choice for genuinely open-source libraries. For internal or proprietary libraries, use the private registry path below.

## Publishing to a private GitLab Conan registry

GitLab provides a Conan registry per project. The convention for teams: point every library at one shared "artifacts" project so consumers only configure one Conan remote.

### Add the remote and authenticate

```bash
REMOTE_NAME="acme-conan"
REMOTE_URL="${CONAN_REMOTE_URL:-https://gitlab.example.com/api/v4/projects/12345678/packages/conan}"

# Idempotent: safe to run repeatedly in bootstrap scripts.
if ! conan remote list | grep -q "^${REMOTE_NAME}:"; then
  conan remote add --index 0 "$REMOTE_NAME" "$REMOTE_URL"
fi
```

Hardcode the registry project ID (`12345678`) rather than using `$CI_PROJECT_ID`. If you use `$CI_PROJECT_ID`, a forked repo's CI pipeline will try to publish to the fork's own registry instead of the shared team registry.

Authentication — three sources in priority order:

```bash
if [ -n "${CI_JOB_TOKEN:-}" ]; then
  # CI pipelines: GitLab injects CI_JOB_TOKEN; the username is literally "gitlab-ci-token".
  conan remote login -p "$CI_JOB_TOKEN" "$REMOTE_NAME" gitlab-ci-token
elif [ -n "${CONAN_LOGIN_USERNAME:-}" ] && [ -n "${CONAN_PASSWORD:-}" ]; then
  conan remote login -p "$CONAN_PASSWORD" "$REMOTE_NAME" "$CONAN_LOGIN_USERNAME"
else
  echo "WARN: no CI_JOB_TOKEN or CONAN_LOGIN_USERNAME/CONAN_PASSWORD set." >&2
fi
```

For read-only consumers (developers pulling packages without publishing), use a group-scoped deploy token with `read_package_registry` scope:

```bash
conan remote login -p "$READONLY_DEPLOY_TOKEN" "$REMOTE_NAME" "acme-developers"
```

### Create and upload

```bash
VERSION="1.0.0"

conan create . \
  --profile:host=profiles/linux-x86_64 \
  --profile:build=profiles/linux-x86_64 \
  --build=missing

conan upload "acme-lib/${VERSION}" --remote acme-conan --confirm
```

To also cache upstream ConanCenter binaries in your registry (speeding up CI for teams with restricted outbound access):

```bash
conan upload "some-heavy-dep/*" --remote acme-conan --confirm
```

### Prerelease versions for merge request pipelines

Publishing a unique prerelease per MR pipeline prevents version clashes while allowing downstream projects to test against the in-progress version. Compute the timestamp once per pipeline so parallel per-arch jobs agree:

```bash
RC_TIMESTAMP="${RC_TIMESTAMP:-${CI_PIPELINE_ID:-$(date -u +%Y%m%d%H%M%S)}}"
RC_VERSION="1.0.0-rc${RC_TIMESTAMP}"

conan create . \
  --profile:host=profiles/linux-x86_64 \
  --profile:build=profiles/linux-x86_64 \
  --build=missing \
  --version "$RC_VERSION"

conan upload "acme-lib/${RC_VERSION}" --remote acme-conan --confirm
```

`--version` on the CLI overrides `set_version()` in the recipe. Final release jobs on the default branch omit `--version` and publish `1.0.0`.

### GitLab CI publish job

```yaml
publish:
  stage: deploy
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  parallel:
    matrix:
      - HOST: [linux-x86_64, linux-aarch64]
  script:
    - conan remote add --index 0 acme-conan "$CONAN_REMOTE_URL" || true
    - conan remote login -p "$CI_JOB_TOKEN" acme-conan gitlab-ci-token
    - conan create . --profile:host="profiles/$HOST" --profile:build="profiles/$HOST" --build=missing
    - conan upload "acme-lib/$VERSION" --remote acme-conan --confirm
```

The `matrix` axis gives one job per architecture. Each job uploads its architecture's binary under its own package ID. A separate prerelease job runs the RC flow on MR pipelines.

For cross-project pushes (your library repo publishing to a shared registry project), allow-list the source project under the registry project's **Settings > CI/CD > Token Access**.

## Wrapping a prebuilt SDK as a Conan package

When a closed-source vendor SDK ships as a prebuilt zip file, wrap it in a Conan recipe so your team can depend on it like any other package:

```python
import os
from conan import ConanFile
from conan.tools.files import copy, download, unzip


class AcmeSdkConan(ConanFile):
    """Template for wrapping a prebuilt SDK. Per-SDK recipes copy this file
    and set `name`. Version comes from --version at create time."""

    # Binary-distributed: compiler/build_type don't affect a prebuilt's ID.
    # The same zip runs regardless of whether you compiled with -O2 or -O0.
    settings = "os", "arch"

    def configure(self):
        if self.settings.os != "Linux":
            raise Exception(
                f"{self.name} is not available for {self.settings.os}. "
                f"Build inside the Linux dev container instead."
            )

    def source(self):
        # Conan 2 forbids self.settings access in source() — defer downloads to build().
        pass

    def build(self):
        version_clean = str(self.version).lstrip("v")
        arch_map = {"x86_64": "x86_64", "armv8": "aarch64"}
        arch = arch_map[str(self.settings.arch)]
        pkg = f"{self.name}-{version_clean}-linux-{arch}.zip"
        url = (
            f"https://gitlab.example.com/api/v4/projects/12345678/packages/"
            f"generic/{self.name}/{version_clean}/{pkg}"
        )
        token = os.environ.get("CI_JOB_TOKEN") or os.environ.get("READONLY_DEPLOY_TOKEN")
        if not token:
            raise Exception("Neither CI_JOB_TOKEN nor READONLY_DEPLOY_TOKEN is set.")
        header = "JOB-TOKEN" if os.environ.get("CI_JOB_TOKEN") else "DEPLOY-TOKEN"
        download(self, url, pkg, headers={header: token})
        unzip(self, pkg, destination="extracted", strip_root=False)

    def package(self):
        src = os.path.join(self.build_folder, "extracted")
        copy(self, "*", src=src, dst=self.package_folder)

    def package_info(self):
        # cmake_find_mode="both" lets find_package(<name>) resolve through Conan's generators.
        # cpp_info.libs is MANDATORY — without it, headers compile but the linker
        # reports unresolved symbols.
        self.cpp_info.set_property("cmake_find_mode", "both")
        self.cpp_info.set_property("cmake_module_file_name", self.name)
        self.cpp_info.set_property("cmake_file_name", self.name)
        self.cpp_info.includedirs = ["include"]
        self.cpp_info.libdirs = ["lib"]
        self.cpp_info.builddirs = ["lib/cmake"]
```

### Organizing multiple SDK wraps

```
conan-recipes/
  _template_acme_sdk/
    conanfile.py        # template — copy this per SDK
  step-sdk/
    conanfile.py        # copy of template, name = "step-sdk"
  voxel-sdk/
    conanfile.py        # copy of template, name = "voxel-sdk"
  versions.env          # pinned versions, one per line
```

Per-SDK recipes are **copies of the template, not imports**. Conan's source export only captures the recipe directory passed to `conan create` — a `from base import ...` pointing to a sibling directory would not be exported with the recipe.

`conan-recipes/versions.env`:

```ini
step-sdk=v0.5.1
voxel-sdk=v0.26.0
mesh-sdk=v0.2.6
```

### Register all wraps at once

```bash
#!/usr/bin/env bash
set -euo pipefail
conan profile detect --exist-ok >/dev/null
while IFS='=' read -r name version; do
  [[ -z "$name" || "$name" =~ ^[[:space:]]*# ]] && continue
  conan create "conan-recipes/$name" --version="$version" --build=missing
done < conan-recipes/versions.env
```

After running this script, all SDKs are in the local cache. Consumers `self.requires("step-sdk/v0.5.1")`.
