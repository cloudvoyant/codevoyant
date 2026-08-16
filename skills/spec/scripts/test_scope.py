#!/usr/bin/env python3
"""Tests for scope.py — the doc-glob resolution script.

Run directly (`python3 test_scope.py`) or via `mise run test` (which discovers
`skills/**/test_*.py`). Stdlib only, no pytest dependency.
"""

from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "scope.py"


class ScopeFunction(unittest.TestCase):
    """scope.py: glob->path ownership evaluation."""

    def run_scope(self, globs, paths):
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), "--globs", *globs],
            input="\n".join(paths) + "\n",
            capture_output=True, text=True,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        return {ln.strip() for ln in proc.stdout.splitlines() if ln.strip()}

    def test_exact_dir_glob(self):
        out = self.run_scope(["libs/auth/**"], ["libs/auth/index.ts", "libs/authz/index.ts", "apps/web/x.ts"])
        self.assertEqual(out, {"libs/auth/index.ts"})

    def test_prefix_segment_boundary(self):
        """libs/auth must NOT contain libs/authz (whole-segment match)."""
        out = self.run_scope(["libs/auth"], ["libs/auth/oidc.ts", "libs/authz/oidc.ts"])
        self.assertEqual(out, {"libs/auth/oidc.ts"})

    def test_index_glob_matches_everything(self):
        out = self.run_scope(["**"], ["a.ts", "libs/auth/b.ts", "docs/c.md"])
        self.assertEqual(out, {"a.ts", "libs/auth/b.ts", "docs/c.md"})

    def test_extension_glob(self):
        out = self.run_scope(["libs/auth/*.ts"], ["libs/auth/index.ts", "libs/auth/index.js"])
        self.assertEqual(out, {"libs/auth/index.ts"})

    def test_no_match_is_empty(self):
        out = self.run_scope(["libs/auth/**"], ["apps/web/x.ts"])
        self.assertEqual(out, set())

    def test_multiple_globs_union(self):
        out = self.run_scope(["libs/auth/**", "docs/**"], ["libs/auth/a.ts", "docs/x.md", "mise.toml"])
        self.assertEqual(out, {"libs/auth/a.ts", "docs/x.md"})


if __name__ == "__main__":
    unittest.main()
