# Zig Setup

mise.toml patterns for Zig projects. Based on mise-zig-template / neo.

## Standard Setup

```toml
[env]
PROJECT  = "my-project"
TEMPLATE = "mise-zig-template"
VERSION  = "{{ exec(command='cat version.txt 2>/dev/null || echo 0.1.0') }}"
GCP_REGISTRY_PROJECT_ID = "devops-466002"
GCP_REGISTRY_REGION     = "us-east1"
GCP_REGISTRY_NAME       = "cloudvoyant-generic-registry"
_.path  = ['{{ config_root }}/node_modules/.bin']

[tools]
zig        = "0.15.1"   # pin to exact version — Zig has breaking changes between releases
node       = "lts"      # for semantic-release
bats       = "latest"
shellcheck = "latest"
shfmt      = "latest"

[tasks.install]
description = "Install Node deps (semantic-release) and fetch Zig packages"
run         = """
npm install --no-save --prefix "{{ config_root }}" \
  semantic-release \
  @semantic-release/changelog \
  @semantic-release/exec \
  @semantic-release/git \
  @semantic-release/github \
  conventional-changelog-conventionalcommits
zig build --fetch 2>/dev/null || true
"""

[tasks.build]
description = "Build Zig project (debug)"
run         = "zig build && echo 'Build successful → zig-out/bin/{{ env.PROJECT }}'"

[tasks.build-prod]
description = "Build optimized release binary"
run         = "zig build -Doptimize=ReleaseFast"

[tasks.run]
description = "Build and run the project"
run         = "zig build run"

[tasks.test]
description = "Run Zig test suite"
run         = "zig build test"

[tasks.format]
description = "Format Zig source files in-place"
run         = "zig fmt src/"

[tasks."format-check"]
description = "Check Zig formatting without modifying files"
run         = "zig fmt --check src/"

[tasks.lint]
description = "Lint shell scripts in .mise-tasks/"
run         = "shellcheck .mise-tasks/*"

[tasks."lint-fix"]
description = "Auto-fix .mise-tasks/ shell script formatting"
run         = "shfmt -w .mise-tasks/*"

[tasks.clean]
description = "Remove Zig build artifacts"
run         = "rm -rf zig-out/ zig-cache/ .zig-cache/"

[tasks.build-all-platforms]
description = "Cross-compile for Linux/macOS/Windows x86_64+aarch64"
run         = ".mise-tasks/build-all-platforms"

[tasks.docker-build]
description = "Build Docker image"
run         = "docker build -t $PROJECT:$VERSION ."

[tasks.docker-run]
description = "Run Docker container"
run         = "docker run --rm $PROJECT:$VERSION"

[tasks.docker-test]
description = "Run tests inside Docker"
run         = "docker run --rm $PROJECT:$VERSION zig build test"

[tasks.version]
description = "Print current version"
run         = "cat version.txt"

[tasks.version-next]
description = "Preview next semantic-release version (dry-run)"
run         = "mise run upversion -- --dry-run"

[tasks.upversion]
description = "Bump version using semantic-release"
run         = ".mise-tasks/upversion"

[tasks.publish]
description = "Cross-compile and publish GitHub release"
run         = ".mise-tasks/publish"

[tasks.publish-rc]
description = "Publish release candidate to GitHub pre-release"
run         = ".mise-tasks/publish-rc"
```

## Notes

- **Always pin the Zig version** — `"0.15.1"` not `"latest"`. Zig master has frequent breaking changes.
- `zig build --fetch` downloads packages from `build.zig.zon`. Run in `install` with `|| true` — it's a no-op if there are no deps.
- `zig fmt` operates on directories, not globs: `zig fmt src/` not `zig fmt 'src/**/*.zig'`
- `zig-cache/` and `.zig-cache/` may both exist depending on Zig version — clean both in `clean`
- Cross-compilation is a Zig strength: `build-all-platforms` is a common task that produces `linux-x86_64`, `macos-aarch64`, `windows-x86_64`, etc.
- `node` + `npm install` for semantic-release is the versioning pattern — Zig has no native release tooling
