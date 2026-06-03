# Python Project Setup with uv

## Why this matters

Without a consistent project setup, every developer on a team ends up with a slightly different environment — different Python versions, different package versions, different build assumptions. This causes the classic "works on my machine" bug. `uv` solves this by treating the Python version, dependencies, and lockfile as one committed unit. No more `pip install -r requirements.txt` drifting out of sync.

`uv` also replaces the need for `venv`, `pip`, `pip-tools`, and `pyenv` — one tool handles all of it. The golden rule: **never invoke `pip` or `python` directly**. Always go through `uv run ...`.


## Standalone Package (start here)

A single library or app with one `pyproject.toml`. This is the simplest form.

```bash
uv init --package --lib --python 3.12 acme-sdk
cd acme-sdk
```

Minimal `pyproject.toml` using the uv native build backend (preferred for new SDKs):

```toml
[project]
name = "acme-sdk"
version = "0.1.0"
description = "Acme SDK"
readme = "README.md"
requires-python = ">=3.12"
dependencies = []

[dependency-groups]
dev = [
  "commitizen>=4.8",
  "pytest>=8.4",
  "ruff>=0.12",
]

[tool.uv]
package = true

[build-system]
requires = ["uv_build>=0.8.5,<0.9.0"]
build-backend = "uv_build"
```

Use `setuptools` instead when you need namespace packages (e.g. `acme.sdk` under a shared `acme.*` root):

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]
include = ["acme*"]
namespaces = true
```

Source tree — always use `src/<package>/` layout:

```
acme-sdk/
  pyproject.toml
  .python-version          ← "3.12" (commit this)
  src/acme_sdk/
    __init__.py            ← __version__ = "0.1.0"
    __main__.py            ← optional CLI entry
    py.typed               ← empty file, marks the package as typed (PEP 561)
  tests/
    test_smoke.py
```

Expose a CLI entry point:

```toml
[project.scripts]
acme = "acme_sdk.__main__:main"
```


## Workspace (Multi-Package Monorepo)

When your project grows into multiple libraries and apps that share dependencies, use a workspace. The key insight: one `uv.lock` for the entire workspace. All packages stay in sync automatically — no more "lib A pins numpy 1.x but app B needs 2.x" conflicts.

```
acme/                         ← workspace root, NOT a shipped package
  pyproject.toml
  uv.lock                     ← one lockfile for the whole workspace
  .python-version
  libs/
    voxel-sdk/                ← base library
    mesh-sdk/                 ← depends on voxel-sdk
  apps/
    acme-cli/                 ← app depending on both libs
```

Create the workspace root:

```bash
mkdir acme && cd acme
uv init --bare --python 3.12 .
```

Root `pyproject.toml` — the workspace root is NOT a package, so it must never build a wheel:

```toml
[project]
name = "acme"
version = "0.1.0"
description = "Acme workspace root"
readme = "README.md"
requires-python = ">=3.12"
dependencies = []

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

# "find nothing" — the root must never ship a wheel
[tool.setuptools.packages.find]
where = ["_nothing_"]
exclude = ["*"]

[tool.uv.workspace]
members = ["libs/*", "apps/*"]

[dependency-groups]
dev = ["pytest>=8", "pytest-cov>=5", "ruff>=0.12"]

[tool.pytest.ini_options]
testpaths = ["apps", "libs"]
addopts = "-v --import-mode=importlib"
```

Member `libs/voxel-sdk/pyproject.toml`:

```toml
[project]
name = "voxel-sdk"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["pydantic>=2", "numpy>=1.26"]

[project.optional-dependencies]
ray = ["ray[default]>=2.30"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]
```

Member that depends on another workspace member — list the dep **without a version**, then route it via `[tool.uv.sources]`:

```toml
# libs/mesh-sdk/pyproject.toml
[project]
name = "mesh-sdk"
dependencies = ["voxel-sdk", "trimesh>=4"]

[tool.uv.sources]
voxel-sdk = { workspace = true }
```

App member `apps/acme-cli/pyproject.toml`:

```toml
[project]
name = "acme-cli"
dependencies = ["click>=8.1", "voxel-sdk", "mesh-sdk"]

[project.scripts]
acme = "acme_cli.cli:cli"

[tool.uv.sources]
voxel-sdk = { workspace = true }
mesh-sdk  = { workspace = true }
```


## Essential Commands

See the [uv CLI reference](https://docs.astral.sh/uv/reference/cli/) for the full command list. The ones that come up constantly:

```bash
uv sync --all-packages --group dev   # workspace: install every member + dev deps
uv lock --check                      # CI gate: fail if lockfile drifted from pyproject.toml
uv run pytest                        # always use uv run — never invoke python/pytest directly
uv run --package acme-cli acme run   # run a specific workspace member's entry point
uvx ruff --version                   # run a tool ephemerally (no install needed)
```

**Rule: never invoke `pip`, `python`, or `pytest` directly** — always go through `uv run`. This ensures the project venv is used, not whatever happens to be on `$PATH`.

Commit `pyproject.toml`, `uv.lock`, and `.python-version` together every time you change dependencies. CI verifies this with `uv lock --check`.


## Ruff Config (Linter + Formatter)

Two profiles — pick one per repo and stay consistent. Do not mix them.

**Profile A — workspace style** (lighter, focused rule set):

```toml
[tool.ruff]
line-length = 120
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]
ignore = ["B008"]   # Click/Typer use `Option(...)` as default args

[tool.ruff.format]
quote-style = "double"
```

**Profile B — SDK/CLI style** (select `ALL`, curated ignores):

```toml
[tool.ruff]
line-length = 100
indent-width = 2

[tool.ruff.lint]
select = ["ALL"]
ignore = [
  "D401",   # non-imperative docstring mood
  "D203",   # conflicts with D211
  "D213",   # conflicts with D212
  "COM812", # conflicts with formatter
  "ISC001", # conflicts with formatter
]

[tool.ruff.lint.per-file-ignores]
"test/**/*.py" = ["S101", "D100", "D103", "ANN201", "INP001"]
"src/**/__main__.py" = ["T201"]   # print is fine in CLI entry points
```

Run:

```bash
uv run ruff check .
uv run ruff check --fix .
uv run ruff format .
uv run ruff format --check .       # CI gate
```


## Commitizen (Conventional Commit Versioning)

Commitizen reads your commit messages and automatically derives the next semver bump (patch/minor/major). No manual version editing.

```toml
[tool.commitizen]
name = "cz_conventional_commits"
tag_format = "v$version"
version_scheme = "semver"
version_provider = "uv"
update_changelog_on_bump = true
bump_message = "bump: $current_version → $new_version [skip-ci]"
changelog_file = "CHANGELOG.md"
```

```bash
uv run cz bump --get-next               # preview next semver
uv run cz bump --yes --allow-no-commit  # bump version + changelog + tag
```


## Common Pitfalls

- A workspace root must **not** ship a wheel — use the "find nothing" setuptools trick (`where = ["_nothing_"]`, `exclude = ["*"]`)
- `[tool.uv.sources] foo = { workspace = true }` must live in **every member** that depends on `foo`, not just the root
- A workspace member's `[project.optional-dependencies]` (extras) do work — reference them as `voxel-sdk[ray]`
- `uv build --all-packages` builds every member but skips the root (correctly)
- `uv venv --seed` is required if you'll later use Ray's `runtime_env.pip` per-task venv bootstrap
- Never mix Profile A and Profile B ruff configs in the same repo
