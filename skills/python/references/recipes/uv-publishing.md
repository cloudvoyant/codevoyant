# Publishing Python Packages with uv

## Why this matters

Publishing a package is more than running `uv build && uv publish`. Packages that land in PyPI or a private registry become a public API — their metadata appears in search results, their version numbers are permanent (PyPI doesn't allow reuse), and their `py.typed` marker determines whether type-checkers trust them downstream. Getting this wrong on the first publish is painful.

This recipe walks through metadata, versioning, building, and publishing to three registries: PyPI, GitLab, and GCP Artifact Registry.


## Package Metadata

Fill these fields in `pyproject.toml` before the first publish — they appear in the registry UI and are pinned permanently in the wheel:

```toml
[project]
name = "acme-sdk"
version = "0.1.0"
description = "One-line summary that surfaces in search results."
readme = "README.md"
requires-python = ">=3.12"
license = "MIT"
keywords = ["voxel", "geometry", "cad"]
authors = [{ name = "Acme Team", email = "engineering@acme.io" }]
classifiers = [
  "Development Status :: 4 - Beta",
  "Intended Audience :: Developers",
  "License :: OSI Approved :: MIT License",
  "Programming Language :: Python :: 3.12",
  "Programming Language :: Python :: 3.13",
  "Typing :: Typed",
]

[project.urls]
Homepage      = "https://github.com/acme-io/acme-sdk"
Documentation = "https://acme-sdk.readthedocs.io"
Repository    = "https://github.com/acme-io/acme-sdk"
Issues        = "https://github.com/acme-io/acme-sdk/issues"
Changelog     = "https://github.com/acme-io/acme-sdk/blob/main/CHANGELOG.md"
```

Also include `src/<pkg>/py.typed` (an empty file) so type-checkers honor inline annotations in downstream packages.


## Versioning — Single Source of Truth

Never hardcode `__version__ = "0.1.0"` separately from `[project] version` — they drift. Instead, let `importlib.metadata` read the version from the installed wheel metadata at runtime:

```python
# src/acme_sdk/__init__.py
from importlib.metadata import PackageNotFoundError, version

try:
    __version__ = version("acme-sdk")
except PackageNotFoundError:    # editable install before metadata is built
    __version__ = "0.0.0+dev"
```


## Build

```bash
uv build                  # standalone: dist/*.whl + dist/*.tar.gz
uv build --all-packages   # workspace: one wheel per member (root never builds)
uv build --sdist          # sdist only
uv build --wheel          # wheel only
```

Always inspect before publishing:

```bash
ls -la dist/
uvx twine check dist/*    # catches metadata issues PyPI will reject
```

`twine check` will catch things like missing `readme`, malformed classifiers, and version strings that don't match PEP 440 before they hit the registry.


## Publish to PyPI

Always test against TestPyPI first — it uses the same validation as production but failures don't block your package name.

```bash
# Test first against TestPyPI
uv publish --publish-url https://test.pypi.org/legacy/ \
           --token "$TEST_PYPI_TOKEN" dist/*

# Production PyPI
uv publish --token "$PYPI_TOKEN" dist/*
```

Tokens come from <https://pypi.org/manage/account/token/>. Scope tokens per-project once the first version is up. Never commit them — load from a secret store or CI variable.


## Publish to a Private GitLab Registry

Declare the index in `pyproject.toml` (replace `12345678` with your GitLab project id):

```toml
[[tool.uv.index]]
name = "gitlab"
url = "https://gitlab.com/api/v4/projects/12345678/packages/pypi"
```

Authenticate via env vars named after the index (`UV_INDEX_<NAME>_USERNAME/PASSWORD`):

```bash
# Local: a PAT with api scope
export UV_INDEX_GITLAB_USERNAME="<your-username>"
export UV_INDEX_GITLAB_PASSWORD="$GITLAB_PAT"

# CI: GitLab job token works automatically
export UV_INDEX_GITLAB_USERNAME=gitlab-ci-token
export UV_INDEX_GITLAB_PASSWORD="$CI_JOB_TOKEN"

uv publish --index gitlab dist/*
```

Equivalent `twine` invocation if uv isn't on the runner:

```bash
twine upload \
  --repository-url "https://gitlab.com/api/v4/projects/${CI_PROJECT_ID}/packages/pypi" \
  --username gitlab-ci-token --password "$CI_JOB_TOKEN" \
  dist/*
```


## Publish to GCP Artifact Registry

GCP uses OAuth bearer tokens, not API keys. Either use `twine` with `keyrings.google-artifactregistry-auth`, or fetch the token from `gcloud` and pass it directly:

```bash
# 1. Get an access token from gcloud
TOKEN="$(gcloud auth print-access-token)"

# 2. Publish — username `oauth2accesstoken` is the GCP convention
uv publish \
  --publish-url "https://us-python.pkg.dev/${GCP_PROJECT_ID}/${REPO}/" \
  --username oauth2accesstoken \
  --password "$TOKEN" \
  dist/*
```

In CI on GCP runners, use workload-identity-federation so the runner picks up the token automatically — never bake a service-account key into the build.

To **install** from the same registry, add to `pyproject.toml`:

```toml
[[tool.uv.index]]
name = "gcp"
url = "https://us-python.pkg.dev/${GCP_PROJECT_ID}/${REPO}/simple/"
```

and set `UV_INDEX_GCP_USERNAME=oauth2accesstoken`, `UV_INDEX_GCP_PASSWORD="$(gcloud auth print-access-token)"`.


## Release Flow

A typical conventional-commits + commitizen release cycle:

```bash
# 1. Bump version + update CHANGELOG.md + tag (driven by commit messages)
uv run cz bump --yes --allow-no-commit

# 2. Build clean
rm -rf dist/
uv build

# 3. Verify metadata
uvx twine check dist/*

# 4. Push tags (triggers CI publish on tag)
git push --follow-tags
```

CI then runs `uv build && uv publish --token "$PYPI_TOKEN" dist/*` on every `v*` tag.


## Common Pitfalls

- `uv publish` with no `--publish-url` defaults to PyPI — pass `--index <name>` or `--publish-url <url>` for anywhere else
- A 403 on PyPI usually means the name is taken or the token isn't scoped to that project — check `pypi.org/manage/projects/`
- Workspace root must **not** publish — its `pyproject.toml` should declare the "find nothing" packaging trick (see `uv-workspace.md`)
- Don't ship `tests/` in the wheel — uv's `uv_build` backend excludes it by default; setuptools needs `[tool.setuptools.packages.find] where = ["src"]` to keep tests out
- Pre-release versions need PEP 440 syntax: `0.2.0a1`, `0.2.0b2`, `0.2.0rc1`, `0.2.0.dev3` — anything else is rejected
- Reusing a version number is not allowed on PyPI even after delete — bump to a new version, including patch/post releases (`0.1.0.post1`)
- GitLab job tokens have repo-scoped access — for cross-project publishes you need a project access token or deploy token, not `$CI_JOB_TOKEN`
