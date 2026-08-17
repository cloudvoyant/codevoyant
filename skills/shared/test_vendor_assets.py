#!/usr/bin/env python3
"""Tests for `.mise-tasks/vendor-assets` — the shared-asset vendoring tool.

Run directly (`python3 test_vendor_assets.py`) or via `mise run test` (which
discovers `skills/**/test_*.py`). Stdlib only, no pytest dependency.

Each test builds an isolated fixture under a temp dir (VENDOR_ROOT) so the real
tool runs without touching the repo's actual skills/vendor.json.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOL = Path(__file__).resolve().parents[2] / ".mise-tasks" / "vendor-assets"


class VendorAssetsTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        for skill in ("spec", "docs"):
            (self.root / "skills" / skill).mkdir(parents=True)
        src = self.root / "skills" / "shared" / "scope-scripts"
        src.mkdir(parents=True)
        (src / "scope.py").write_text("SCOPE\n")
        (src / "test_scope.py").write_text("TEST_SCOPE\n")
        self.config = self.root / "skills" / "vendor.json"
        self.config.write_text(json.dumps({
            "version": 2,
            "assets": {
                "scope-scripts": {
                    "source": "skills/shared/scope-scripts",
                    "files": ["scope.py", "test_scope.py"],
                    "skills": ["spec", "docs"],
                    "destination": "scripts",
                },
            },
        }))
        self.env = dict(os.environ, VENDOR_ROOT=str(self.root))

    def tearDown(self):
        self.tmp.cleanup()

    def run_tool(self, *args):
        proc = subprocess.run(
            [str(TOOL), *args],
            env=self.env, capture_output=True, text=True,
        )
        return proc

    def target_files(self):
        return sorted(
            (self.root / "skills" / "spec" / "scripts").iterdir()
        )

    def test_propagates_new_source_file(self):
        """A file added to the shared source propagates and --check passes."""
        src = self.root / "skills" / "shared" / "scope-scripts"
        (src / "helper.py").write_text("HELPER\n")

        proc = self.run_tool()
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertTrue((self.root / "skills" / "spec" / "scripts" / "helper.py").exists())
        self.assertTrue((self.root / "skills" / "docs" / "scripts" / "helper.py").exists())

        proc = self.run_tool("--check")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)

    def test_stale_copy_flagged_and_cleaned(self):
        """A removed allowlist entry leaves a stale target copy --check flags and vendor cleans."""
        proc = self.run_tool()
        self.assertEqual(proc.returncode, 0, proc.stderr)

        (self.root / "skills" / "shared" / "scope-scripts" / "test_scope.py").unlink()
        cfg = json.loads(self.config.read_text())
        cfg["assets"]["scope-scripts"]["files"] = ["scope.py"]
        self.config.write_text(json.dumps(cfg))

        proc = self.run_tool("--check")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("stale", proc.stdout + proc.stderr)

        proc = self.run_tool()
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertFalse((self.root / "skills" / "spec" / "scripts" / "test_scope.py").exists())
        self.assertFalse((self.root / "skills" / "docs" / "scripts" / "test_scope.py").exists())

        proc = self.run_tool("--check")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)

    def test_non_string_values_fail_validate_cleanly(self):
        """Non-string schema values error cleanly instead of a TypeError."""
        self.config.write_text(json.dumps({
            "version": 2,
            "assets": {
                "bad": {
                    "source": "skills/shared/scope-scripts",
                    "files": ["scope.py"],
                    "skills": [42],
                    "destination": "scripts",
                },
            },
        }))
        proc = self.run_tool("--validate")
        self.assertNotEqual(proc.returncode, 0)
        combined = proc.stdout + proc.stderr
        self.assertIn("skills", combined)
        self.assertNotIn("Traceback", combined)
        self.assertNotIn("TypeError", combined)


if __name__ == "__main__":
    unittest.main()
