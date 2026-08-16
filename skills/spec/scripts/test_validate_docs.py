#!/usr/bin/env python3
"""Tests for validate_docs.py — the doc-aware valid-docs gate.

Run directly (`python3 test_validate_docs.py`) or via `mise run test` (which
discovers `skills/**/test_*.py`). Stdlib only, no pytest dependency.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "validate_docs.py"

INDEX = """---
globs:
  - "**"
index: true
---
# Architecture
"""

COMPONENT = """---
globs:
  - "libs/auth/**"
---
# Auth
## Public API
"""

UNMANAGED = """---
exclude: true
---
# Scratch notes (not managed)
"""


def make_repo(root: Path) -> None:
    """Default fixture: valid docs + a libs/auth component + a package.json."""
    (root / "docs" / "architecture").mkdir(parents=True)
    (root / "docs" / "architecture" / "index.md").write_text(INDEX)
    (root / "docs" / "architecture" / "auth.md").write_text(COMPONENT)
    (root / "libs" / "auth").mkdir(parents=True)
    (root / "libs" / "auth" / "index.ts").write_text("export const x = 1\n")
    (root / "package.json").write_text('{"name": "root-pkg"}\n')


class ValidateDocs(unittest.TestCase):
    """validate_docs.py: the whole-repo valid-docs gate."""

    def run_validator(self, root: Path):
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(root)],
            capture_output=True, text=True,
        )
        return proc.returncode, proc.stdout, proc.stderr

    def test_valid_repo_passes(self):
        with tempfile.TemporaryDirectory() as d:
            make_repo(Path(d))
            rc, out, err = self.run_validator(Path(d))
            self.assertEqual(rc, 0, f"stdout={out!r} stderr={err!r}")
            self.assertIn("0 blocking", out)

    def test_dead_glob_is_blocking(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            make_repo(root)
            (root / "docs" / "architecture" / "gone.md").write_text(
                "---\nglobs:\n  - \"libs/gone/**\"\n---\n# Gone\n"
            )
            rc, out, _ = self.run_validator(root)
            self.assertEqual(rc, 1)
            self.assertIn("GLOB", out)
            self.assertIn("libs/gone/**", out)

    def test_unmanaged_doc_is_skipped(self):
        """exclude: true → skipped: no glob check, no structure contribution."""
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            make_repo(root)
            (root / "docs" / "scratch.md").write_text(UNMANAGED)
            rc, out, _ = self.run_validator(root)
            self.assertEqual(rc, 0, f"stdout={out!r}")
            self.assertNotIn("scratch.md", out)

    def test_all_excluded_is_blocking(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "docs").mkdir()
            (root / "docs" / "only.md").write_text(UNMANAGED)
            rc, out, _ = self.run_validator(root)
            self.assertEqual(rc, 1)
            self.assertIn("exclude: true", out)

    def test_no_docs_is_blocking(self):
        with tempfile.TemporaryDirectory() as d:
            rc, out, _ = self.run_validator(Path(d))
            self.assertEqual(rc, 1)
            self.assertIn("no markdown docs", out)

    def test_missing_structure_is_blocking(self):
        """Docs exist but no index and no public-API doc → blocking."""
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "docs").mkdir()
            (root / "docs" / "notes.md").write_text(
                "---\nglobs:\n  - \"**\"\n---\n# Notes\n"
            )
            rc, out, _ = self.run_validator(root)
            self.assertEqual(rc, 1)
            self.assertIn("architecture index", out)

    def test_coverage_gap_is_non_blocking(self):
        """A component with no owning doc → warning only, exit 0.

        The root-level package.json is skipped (its path `.` is unclaimable),
        so the gap is exercised by a real `libs/api` component.
        """
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            make_repo(root)
            (root / "libs" / "api").mkdir(parents=True)
            (root / "libs" / "api" / "package.json").write_text('{"name": "api-pkg"}\n')
            (root / "libs" / "api" / "index.ts").write_text("export const y = 1\n")
            rc, out, _ = self.run_validator(root)
            self.assertEqual(rc, 0, f"stdout={out!r}")
            self.assertIn("COVERAGE", out)
            self.assertIn("api-pkg", out)

    def test_unmanaged_doc_does_not_count_as_owner(self):
        """exclude: true docs are not owners, so coverage can still gap."""
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            make_repo(root)
            # An unmanaged doc claiming to own libs/api does NOT satisfy coverage.
            (root / "docs" / "scratch.md").write_text(
                "---\nexclude: true\nglobs:\n  - \"libs/api/**\"\n---\n# Scratch\n"
            )
            (root / "libs" / "api").mkdir(parents=True)
            (root / "libs" / "api" / "package.json").write_text('{"name": "api-pkg"}\n')
            (root / "libs" / "api" / "index.ts").write_text("export const y = 1\n")
            rc, out, _ = self.run_validator(root)
            self.assertEqual(rc, 0, f"stdout={out!r}")
            self.assertIn("COVERAGE", out)
            self.assertIn("api-pkg", out)


if __name__ == "__main__":
    unittest.main()
