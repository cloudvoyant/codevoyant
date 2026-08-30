#!/usr/bin/env python3
"""Canonical codevoyant store initializer — shared asset, vendored per skills/vendor.json.

Ensures the in-repo `.codevoyant` is a symlink to the shared per-project store
(~/.codevoyant/<project-slug>/) BEFORE any workflow mkdirs under it, so worktrees
and regular clones of the same project share one store.

Idempotent. Never migrates an existing real dir (that is /migrate's job).
The slug pipeline is byte-identical to the /migrate skill's computation
(worktree-aware via `git rev-parse --git-common-dir`).

Usage: cv_init_store.py [repo-root]     (defaults to the git toplevel, else cwd)
Prints the computed slug on stdout. Exit 0 in all handled cases.
"""
import os
import re
import subprocess
import sys
from pathlib import Path


def _git(args, root):
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), *args],
            capture_output=True, text=True, timeout=10,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return proc.stdout.strip() if proc.returncode == 0 else ""


def compute_slug(root):
    """Same pipeline as the bash original: lower, [^a-z0-9]+ -> '-', strip '-'."""
    common = _git(["rev-parse", "--git-common-dir"], root)
    if common:
        cpath = Path(common)
        if not cpath.is_absolute():
            cpath = root / cpath
        try:
            name = cpath.parent.resolve().name
        except OSError:
            name = root.name
    else:
        name = root.name
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "unnamed"


def init_store(root, home=None):
    """Create the ~/.codevoyant/<slug> symlink for `root`; return the slug.

    - Already a symlink  -> no-op.
    - Existing real dir  -> no-op (migration is /migrate's job).
    - Otherwise          -> mkdir dest, symlink, append .gitignore entry once.
    """
    root = Path(root)
    home = Path(home) if home else Path(os.environ["HOME"])
    slug = compute_slug(root)
    link = root / ".codevoyant"
    if link.is_symlink():
        return slug
    if link.is_dir():
        return slug
    dest = home / ".codevoyant" / slug
    dest.mkdir(parents=True, exist_ok=True)
    link.symlink_to(dest)
    gi = root / ".gitignore"
    lines = gi.read_text(encoding="utf-8").splitlines() if gi.exists() else []
    if ".codevoyant" not in lines:
        with gi.open("a", encoding="utf-8") as f:
            f.write("\n# codevoyant context store (symlink to ~/.codevoyant/<project-slug>/)\n.codevoyant\n")
    return slug


def main(argv):
    if len(argv) > 1:
        root = Path(argv[1])
    else:
        top = _git(["rev-parse", "--show-toplevel"], Path.cwd())
        root = Path(top) if top else Path.cwd()
    print(init_store(root))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
