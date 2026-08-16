"""Unit tests for select_migrations.py — selection bounds + ascending numeric order."""

import os
import subprocess
import sys
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(__file__), "select_migrations.py")


def _write(ref, fn, frm, to):
    with open(os.path.join(ref, fn), "w") as f:
        f.write(f"# migration\n<from>{frm}</from>\n<to>{to}</to>\n")


def _run(ref, recorded, current):
    out = subprocess.run(
        [sys.executable, SCRIPT, ref, recorded, current],
        capture_output=True, text=True, check=True,
    )
    return out.stdout.splitlines()


class SelectMigrationsTest(unittest.TestCase):
    def setUp(self):
        self._td = tempfile.TemporaryDirectory()
        self.ref = self._td.name

    def tearDown(self):
        self._td.cleanup()

    def test_numeric_not_string_order(self):
        _write(self.ref, "migrate-v1-to-v2.minor.md", "v1", "v2.minor")
        _write(self.ref, "migrate-v2-to-v2.1.minor.md", "v2", "v2.1.minor")
        # Lexicographically "migrate-v2-..." < "migrate-v1-...", so a string
        # sort would print v2 first. Numeric order must print v1 first.
        self.assertEqual(
            _run(self.ref, "1.0.0", "2.5.0"),
            ["migrate-v1-to-v2.minor.md", "migrate-v2-to-v2.1.minor.md"],
        )

    def test_v0_baseline_fires_v1(self):
        _write(self.ref, "migrate-v0-to-v1.minor.md", "v0", "v1.minor")
        self.assertEqual(_run(self.ref, "0.0.0", "1.71.0"), ["migrate-v0-to-v1.minor.md"])

    def test_not_selected_when_current_below_to(self):
        _write(self.ref, "migrate-v0-to-v1.minor.md", "v0", "v1.minor")
        self.assertEqual(_run(self.ref, "0.0.0", "0.9.0"), [])

    def test_not_selected_when_already_at_or_above_to(self):
        _write(self.ref, "migrate-v0-to-v1.minor.md", "v0", "v1.minor")
        self.assertEqual(_run(self.ref, "1.0.0", "1.71.0"), [])

    def test_unparseable_version_degrades_to_v0(self):
        _write(self.ref, "migrate-v0-to-v1.minor.md", "v0", "v1.minor")
        self.assertEqual(_run(self.ref, "junk", "1.0.0"), ["migrate-v0-to-v1.minor.md"])


if __name__ == "__main__":
    unittest.main()
