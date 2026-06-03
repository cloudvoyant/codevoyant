# Conan Package Cache in CI

## Why this matters

A cold C++ CI build that builds all dependencies from source can take 20-40 minutes. Boost, gRPC, OpenSSL, Abseil — these are large libraries with complex builds. If every CI run starts from scratch, engineers spend their time waiting.

Conan's local cache is the solution: after a first build, packages are stored on disk keyed by their exact settings (OS, compiler, flags). Subsequent runs with identical settings find the packages already built and skip compilation entirely. What took 30 minutes takes 45 seconds.

The challenge in CI is that ephemeral runners throw away the disk between runs. Cache restore/save steps persist the Conan cache directory between jobs. With a good cache key strategy, cache hits are near-100% unless you intentionally change a dependency.

A lockfile (`conan.lock`) is a prerequisite for effective caching: it pins the exact version of every transitive dependency, so the cache key stays stable even if a transitive dep releases a new patch version.

## What to cache

| Path | What it contains | Notes |
|---|---|---|
| `~/.conan2/p/` | Resolved packages — recipes + prebuilt binaries, keyed by package ID | The main cache to preserve |
| `~/.conan2/profiles/` | Profile files | Only if not committed to the repo |
| `build/` | CMake build directory | Optional; speeds up incremental builds |

For per-project isolation (multiple projects sharing a CI runner), set `CONAN_HOME=$CI_PROJECT_DIR/.conan2`. Each project then has its own cache directory that's restored and saved independently.

## Cache key strategy

The cache key must invalidate when — and only when — the dependency graph actually changes. A key that changes too often means constant cold builds. A key that doesn't change enough means stale packages.

Hash these inputs:
- `conanfile.py` or `conanfile.txt` — defines the dependency requirements
- `conan.lock` — pins exact transitive versions
- `profiles/<host>` — defines compiler version and flags

Example key pattern: `conan-${HOST}-${hash(conanfile.py, conan.lock, profiles/<host>)}`

A `restore-keys` fallback (GitHub) or prefix fallback (GitLab) lets a partial cache hit be used when only one input changed — the runner downloads only the changed packages and rebuilds only what's necessary.

## GitHub Actions

```yaml
name: build
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install toolchain
        uses: jdx/mise-action@v2     # installs cmake + conan from mise.toml

      - name: Restore Conan cache
        id: conan-cache
        uses: actions/cache@v4
        with:
          path: ~/.conan2
          key: conan-linux-x86_64-${{ hashFiles('conanfile.py', 'conan.lock', 'profiles/linux-x86_64') }}
          restore-keys: |
            conan-linux-x86_64-

      - name: Conan install
        run: |
          conan profile detect --exist-ok
          conan install . \
            --profile:host=profiles/linux-x86_64 \
            --profile:build=profiles/linux-x86_64 \
            --build=missing \
            --lockfile=conan.lock

      - name: CMake configure + build
        run: |
          cmake --preset conan-release
          cmake --build --preset conan-release -j

      - name: Test
        run: ctest --preset conan-release --output-on-failure

      - name: Prune Conan cache before save
        if: always()
        run: |
          # Drop intermediate source and build dirs that Conan unpacked during the build.
          # Only the packaged binaries remain. This prevents the cache from growing unbounded.
          conan cache clean "*" --source --build --temp
```

`restore-keys: conan-linux-x86_64-` provides a fallback: if the exact key isn't found, GitHub uses the most recent cache entry with that prefix. You get a partial hit — most packages already built, only changed ones rebuilt — rather than a full cold build.

`conan cache clean` after the build removes the unpacked source directories (Conan downloaded and built the sources; the packaged binary is all you need to cache). Without this, the cache grows with every dependency update.

## GitLab CI

```yaml
variables:
  CONAN_HOME: "$CI_PROJECT_DIR/.conan2"   # per-project isolation

.conan-cache: &conan-cache
  key:
    files:
      - conanfile.py
      - conan.lock
      - profiles/$HOST
    prefix: "conan-$HOST"
  paths:
    - .conan2/
  policy: pull-push

build:
  stage: build
  image: registry.example.com/cpp-toolchain:latest
  parallel:
    matrix:
      - HOST: [linux-x86_64, linux-aarch64]
  cache:
    <<: *conan-cache
  script:
    - conan profile detect --exist-ok
    - conan remote add --index 0 acme-conan "$CONAN_REMOTE_URL" || true
    - conan remote login -p "$CI_JOB_TOKEN" acme-conan gitlab-ci-token
    - |
      conan install . \
        --profile:host="profiles/$HOST" \
        --profile:build="profiles/$HOST" \
        --build=missing \
        --lockfile=conan.lock
    - cmake --preset conan-release
    - cmake --build --preset conan-release -j
    - ctest --preset conan-release --output-on-failure
  after_script:
    - conan cache clean "*" --source --build --temp
  artifacts:
    paths:
      - build/Release/bin/
    expire_in: 1 day
```

Per-arch jobs each get their own cache key — the `$HOST` matrix axis is part of the `prefix`. An `linux-x86_64` build never uses the `linux-aarch64` cache.

`policy: pull-push` is the default: jobs read from cache and write back. For MR pipelines where you're experimenting with a new dependency and don't want to pollute the shared cache, use `policy: pull` — the job reads the main branch's cache but doesn't write its experimental state back.

## How cache restoration works

`conan install` checks the local cache before downloading or building. After cache restore, packages already present resolve instantly:

```
conan install . --build=missing
...
spdlog/1.14.1: Already installed!
nlohmann_json/3.11.3: Already installed!
```

Only packages whose package ID (determined by settings + options) doesn't match in the cache get downloaded or rebuilt. This is what makes the cache hit so effective — most runs only need to build changed packages.

## Diagnosing unexpected rebuilds

If `--build=missing` rebuilds packages you expected to be cached:

**Compiler version drift** — the runner image was updated and the compiler changed. Your cache key includes the profile, but if the actual compiler differs from what the profile specifies, Conan generates a different package ID. Fix: pin your toolchain image tag, don't use `:latest`.

**Profile drift** — a developer's machine profile differs from CI. Fix: always use committed profile files, never machine-detected profiles.

**Lockfile not passed** — `conan install` without `--lockfile=conan.lock` may resolve different transitive versions than the lockfile specifies, generating a different package ID. Fix: always pass `--lockfile=conan.lock` in CI.

**Verify with**:

```bash
# Show the resolved package graph — compare IDs between local and CI runs.
conan graph info . --lockfile=conan.lock \
  --profile:host=profiles/linux-x86_64 \
  --profile:build=profiles/linux-x86_64
```

## Cache size management

The Conan cache accumulates old package revisions over time. Prune in CI:

```bash
# After every build: drop intermediate source + build dirs (keeps packaged binaries).
conan cache clean "*" --source --build --temp

# Weekly scheduled job: remove binaries older than 14 days.
conan remove "*" --confirm --lru=14d
```

Run the heavier prune (`--lru`) on a scheduled pipeline, not on every build — it forces a cold build on the next run for evicted packages.

## Private registry as a cache alternative

If your team uses a private Conan registry (see `conan-publishing.md`), you can publish prebuilt binaries to it. Developers and CI then download prebuilt binaries from the registry rather than building from source — no CI cache needed.

```bash
conan remote login -p "$READONLY_DEPLOY_TOKEN" acme-conan acme-developers
conan install . \
  --profile:host=profiles/linux-x86_64 \
  --profile:build=profiles/linux-x86_64 \
  --build=missing \
  --remote=acme-conan
```

This makes CI deterministic in a different way: the registry is the source of truth for binaries, not each runner's local cache. The CI cache still helps — it avoids even the download step for packages already seen on that runner.

## Verifying a cache is working

A job that successfully uses the cache should show:

1. The restore step finds a matching key (not "No cache found").
2. `conan install` prints `Already installed!` for most packages.
3. Wall-clock time drops significantly — a 20-minute cold build should complete in under 2 minutes warm.

If wall-clock time didn't drop, check whether the cache key on the current run matches the cache key from the previous run. A single changed file (even a whitespace edit to `conanfile.py`) generates a completely new key.
