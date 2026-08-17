#!/usr/bin/env python3
"""Evaluate whether paths fall inside a set of doc globs.

Vendored into both the docs and spec skills from `skills/shared/scope-scripts`
(see `skills/vendor.json`). The docs skill uses it for update/review diff
scoping; the spec skill uses it for doc-aware write scoping (Rule 3 of
`references/doc-aware.md`). Given a set of `globs` and a list of repo-relative
paths, print the paths that fall inside the globs.

The glob matching mirrors the docs skill's heuristic: a glob is normalized to
its directory prefix (a trailing `/**`, `/*`, or extension glob is stripped)
and a path is in scope when its segments start with that prefix (whole-segment
match — `libs/auth` contains `libs/auth/oidc` but not `libs/authz`).

Usage:
    printf '%s\n' "libs/auth/index.ts" | python3 scripts/scope.py --globs 'libs/auth/**' 'docs/**'
    git diff --name-only "$(git merge-base "$BASE" HEAD)" HEAD | python3 scripts/scope.py --globs 'libs/auth/**'

Exit 0 when the invocation succeeds. Prints one owned path per line. No output
= the path is outside the globs (out of scope).
"""

from __future__ import annotations

import argparse
import fnmatch
import sys
from pathlib import PurePosixPath


def _segments(path: str) -> list[str]:
    p = PurePosixPath(path)
    # PurePosixPath('..') handling: reject paths escaping the tree root.
    if any(part == ".." for part in p.parts):
        raise ValueError(f"path escapes repo root: {path!r}")
    return [part for part in p.parts if part not in (".", "/")]


def _has_wildcard(segment: str) -> bool:
    return any(c in segment for c in "*?[")


def glob_matches_path(glob: str, path: str) -> bool:
    """True when `path` (a repo-relative file path) falls inside `glob`.

    Matching is per-segment (so `libs/auth` never contains `libs/authz`):
    - `**` matches zero or more whole segments,
    - `*`/`?`/`[...]` match within a single segment (fnmatch),
    - a glob whose last segment has no wildcard is a directory prefix and
      matches everything under it (equivalent to appending `/**`).
    """
    if glob in ("**", "*", "/*"):
        return True
    glob = glob.rstrip("/")
    if not _has_wildcard(glob.split("/")[-1]):
        glob += "/**"
    glob_segs = [s for s in glob.split("/") if s not in ("", ".")]
    path_segs = _segments(path)
    return _match(glob_segs, path_segs)


def _match(gs: list[str], ps: list[str]) -> bool:
    if not gs:
        return not ps
    g = gs[0]
    if g == "**":
        return any(_match(gs[1:], ps[i:]) for i in range(len(ps) + 1))
    if not ps:
        return False
    if not fnmatch.fnmatchcase(ps[0], g):
        return False
    return _match(gs[1:], ps[1:])


def owned_paths(globs: list[str], paths: list[str]) -> list[str]:
    """The paths in `paths` owned by at least one glob."""
    return [p for p in paths if any(glob_matches_path(g, p) for g in globs)]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--globs", required=True, metavar="GLOB", nargs="+",
                    help="One or more globs from a doc's `globs:` frontmatter.")
    ap.add_argument("--paths", metavar="FILE", default="-",
                    help="File of changed paths (one per line); '-' reads stdin. Default: stdin.")
    args = ap.parse_args()
    globs = args.globs

    if args.paths == "-":
        paths = [ln.strip() for ln in sys.stdin]
    else:
        with open(args.paths, encoding="utf-8") as f:
            paths = [ln.strip() for ln in f]
    paths = [p for p in paths if p]

    try:
        owned = owned_paths(globs, paths)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    for p in owned:
        print(p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
