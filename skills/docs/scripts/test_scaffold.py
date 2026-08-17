#!/usr/bin/env python3
"""Tests for scaffold.py.

Run directly (`python3 test_scaffold.py`) or via `python3 -m unittest` from this directory. Stdlib only, no pytest dependency.
"""

from __future__ import annotations

import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import scaffold as sut  # noqa: E402

SCRIPT = Path(__file__).resolve().parent / "scaffold.py"
TEMPLATES = sorted(p.stem for p in (Path(__file__).resolve().parent / ".." / "references" / "templates").glob("*.md"))


class ScaffoldFunction(unittest.TestCase):
    """The scaffold() function: copy a template and replace {key} tokens from the vars dict."""

    def test_writes_and_replaces_tokens(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "docs" / "architecture" / "auth.md"
            rc = sut.scaffold("library", out, {"name": "Auth", "path": "libs/auth"})
            self.assertEqual(rc, 0)
            self.assertTrue(out.is_file())
            text = out.read_text()
            self.assertIn("Auth", text)
            self.assertIn("libs/auth", text)
            self.assertNotIn("{name}", text)
            self.assertNotIn("{path}", text)

    def test_arbitrary_tokens_are_flexible(self):
        """The dict is open-ended — any {key} in a template is replaceable, not just name/path."""
        with tempfile.TemporaryDirectory() as d:
            tmpl = Path(d) / "custom.md"
            tmpl.write_text("---\nglobs: []\n---\n# {name}\n{owner} owns {thing}.\n")
            out = Path(d) / "out.md"
            orig = sut.TEMPLATES_DIR
            try:
                sut.TEMPLATES_DIR = Path(d)
                sut.scaffold("custom", out, {"name": "X", "owner": "Team A", "thing": "the cache"})
            finally:
                sut.TEMPLATES_DIR = orig
            self.assertIn("Team A owns the cache.", out.read_text())

    def test_frontmatter_is_first_line(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "x.md"
            sut.scaffold("library", out, {"name": "X", "path": "libs/x"})
            self.assertEqual(out.read_text().splitlines()[0], "---")

    def test_skip_exists_returns_3(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "x.md"
            out.write_text("KEEP ME")
            rc = sut.scaffold("library", out, {"name": "X"}, overwrite=False)
            self.assertEqual(rc, 3)
            self.assertEqual(out.read_text(), "KEEP ME")

    def test_overwrite_replaces(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "x.md"
            out.write_text("OLD")
            rc = sut.scaffold("library", out, {"name": "X"}, overwrite=True)
            self.assertEqual(rc, 0)
            self.assertNotEqual(out.read_text(), "OLD")

    def test_no_vars_still_copies(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "x.md"
            rc = sut.scaffold("generic", out)
            self.assertEqual(rc, 0)
            self.assertTrue(out.is_file())

    def test_unknown_template_raises(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(FileNotFoundError):
                sut.scaffold("does-not-exist", Path(d) / "x.md", {"name": "X"})

    def test_creates_parent_dirs(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "a" / "b" / "c" / "x.md"
            sut.scaffold("generic", out, {"name": "X"})
            self.assertTrue(out.is_file())


class EveryTemplateIsCopyReady(unittest.TestCase):
    """Guard: every shipped template scaffolds into a doc whose frontmatter parses (--- first)."""

    def test_all_templates_scaffold_frontmatter_first(self):
        self.assertTrue(TEMPLATES, "no templates found")
        with tempfile.TemporaryDirectory() as d:
            for t in TEMPLATES:
                out = Path(d) / f"{t}.md"
                rc = sut.scaffold(t, out, {"name": "Sample", "path": "pkg/sample"}, overwrite=True)
                self.assertEqual(rc, 0, f"{t} failed to scaffold")
                self.assertEqual(out.read_text().splitlines()[0], "---", f"{t}: frontmatter not first")


class TemplateContract(unittest.TestCase):
    """Enforce references/template-contract.md markers so workflows stay template-driven."""

    TPL = Path(__file__).resolve().parent / ".." / "references" / "templates"
    COMPONENT = {"api", "library", "frontend", "auth", "generic"}
    INDEX = {"project-readme", "architecture"}
    TOP_LEVEL = {"ci", "user-guide", "development-guide"}

    def read(self, name):
        return (self.TPL / f"{name}.md").read_text()

    def test_component_templates_have_exactly_one_public_api_marker(self):
        for t in sorted(self.COMPONENT):
            self.assertEqual(self.read(t).count("[public-api]"), 1, f"{t}: need exactly one [public-api]")

    def test_component_templates_have_exactly_one_components_marker(self):
        for t in sorted(self.COMPONENT):
            self.assertEqual(self.read(t).count("[components]"), 1, f"{t}: need exactly one [components]")

    def test_architecture_has_components_but_no_public_api(self):
        self.assertEqual(self.read("architecture").count("[components]"), 1)
        self.assertEqual(self.read("architecture").count("[public-api]"), 0)

    def test_top_level_docs_carry_neither_marker(self):
        for t in sorted(self.TOP_LEVEL):
            self.assertEqual(self.read(t).count("[public-api]"), 0, f"{t}: top-level doc must not mark [public-api]")
            self.assertEqual(self.read(t).count("[components]"), 0, f"{t}: top-level doc must not mark [components]")

    def test_index_docs_have_index_true(self):
        for t in sorted(self.INDEX):
            self.assertIn("index: true", self.read(t), f"{t}: must carry index: true")

    def test_non_index_docs_do_not_have_index_true(self):
        for t in sorted(self.COMPONENT | self.TOP_LEVEL):
            self.assertNotIn("index: true", self.read(t), f"{t}: only index docs carry index: true")

    def test_frontmatter_is_first(self):
        for t in sorted(self.TPL.glob("*.md")):
            text = t.read_text()
            self.assertEqual(text.splitlines()[0], "---", f"{t.name}: frontmatter must be first line")

    def test_optional_marker_is_first_under_its_heading(self):
        """Per the contract, an (optional) marker directly follows a heading or block it makes optional."""
        for t in sorted(self.TPL.glob("*.md")):
            lines = t.read_text().splitlines()
            for i, line in enumerate(lines):
                if not line.strip().startswith("<!-- @agent: (optional)"):
                    continue
                # nearest prior non-blank line must be the heading or content block this marker introduces
                j = i - 1
                while j >= 0 and lines[j].strip() == "":
                    j -= 1
                if j < 0:
                    continue
                self.assertTrue(
                    re.match(r"^#{2,} ", lines[j]),
                    f"{t.name}: (optional) marker under non-heading: {lines[j]!r}",
                )

    def test_components_heading_contains_inline_optional_diagram(self):
        """Component templates merge the system diagram INTO ### Components (diagram block optional, heading required)."""
        for t in sorted(self.COMPONENT | {"architecture"}):
            text = self.read(t)
            lines = text.splitlines()
            comp_idx = next(i for i, l in enumerate(lines) if l.strip() == "### Components")
            # The [components] marker lives in this section
            section = "\n".join(lines[comp_idx:comp_idx + 30])
            self.assertIn("[components]", section, f"{t}: [components] marker must live under ### Components")
            # An optional graph TD may precede it, but the heading itself is required (no '(optional)' on the heading line)
            self.assertTrue(
                "<!-- @agent: (optional)" in section or "<!-- @agent: [components]" in section,
                f"{t}: ### Components must carry an optional-diagram and/or [components] marker",
            )


class Cli(unittest.TestCase):
    """The command-line surface: --vars JSON, exit codes, and messages."""

    def test_cli_write_then_skip(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "x.md"
            args = [sys.executable, str(SCRIPT), "--out", str(out), "--template", "generic", "--vars", '{"name": "X", "path": "p"}']
            first = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(first.returncode, 0)
            self.assertIn("wrote:", first.stdout)
            second = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(second.returncode, 3)
            self.assertIn("skip: exists", second.stdout)

    def test_cli_unknown_template_is_error(self):
        with tempfile.TemporaryDirectory() as d:
            args = [sys.executable, str(SCRIPT), "--out", str(Path(d) / "x.md"), "--template", "nope", "--vars", '{"name": "X"}']
            result = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)

    def test_cli_invalid_vars_json_is_error(self):
        with tempfile.TemporaryDirectory() as d:
            args = [sys.executable, str(SCRIPT), "--out", str(Path(d) / "x.md"), "--template", "generic", "--vars", "not json"]
            result = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main()
