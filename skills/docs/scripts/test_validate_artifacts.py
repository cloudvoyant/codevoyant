#!/usr/bin/env python3
"""Unit tests for validate_artifacts.py (semantic stage; render stage needs mmdc)."""
import os
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import validate_artifacts as va


def findings_for(doc):
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
        f.write(doc)
        path = f.name
    try:
        return va.validate_doc(path, skip_render=True)
    finally:
        os.unlink(path)


class SemanticChecks(unittest.TestCase):
    def test_literal_backslash_n_flagged(self):
        f = findings_for("```mermaid\ngraph TD\n    A[Line one\\nLine two] --> B\n```\n")
        self.assertTrue(any("literal \\n" in m for _p, t, m, b in f if t == "DIAGRAM"))

    def test_br_labels_pass(self):
        f = findings_for('```mermaid\ngraph TD\n    A["Line one<br/>Line two"] --> B\n```\n')
        self.assertFalse(any(t == "DIAGRAM" and b for _p, t, m, b in f))

    def test_participant_cap(self):
        parts = "\n".join(f"    participant P{i}" for i in range(9))
        f = findings_for(f"```mermaid\nsequenceDiagram\n{parts}\n    P0->>P1: hi\n```\n")
        self.assertTrue(any("participants" in m for _p, t, m, b in f))

    def test_node_cap(self):
        nodes = "\n".join(f"    N{i} --> N{i+1}" for i in range(13))
        f = findings_for(f"```mermaid\ngraph TD\n{nodes}\n```\n")
        self.assertTrue(any("nodes" in m for _p, t, m, b in f))

    def test_node_cap_counts_plain_link_edges(self):
        nodes = "\n".join(f"    N{i} --- N{i+1}" for i in range(13))
        f = findings_for(f"```mermaid\nflowchart TD\n{nodes}\n```\n")
        self.assertTrue(any("nodes" in m and b for _p, t, m, b in f))

    def test_node_cap_counts_dotted_and_thick_edges(self):
        rows = []
        for i in range(13):
            op = ("-.-", "==>", "<-->")[i % 3]
            rows.append(f"    N{i} {op} N{i+1}")
        f = findings_for("```mermaid\nflowchart TD\n" + "\n".join(rows) + "\n```\n")
        self.assertTrue(any("nodes" in m and b for _p, t, m, b in f))

    def test_node_cap_counts_labeled_edges(self):
        nodes = "\n".join(f"    N{i} -->|step {i}| N{i+1}" for i in range(13))
        f = findings_for(f"```mermaid\nflowchart TD\n{nodes}\n```\n")
        self.assertTrue(any("nodes" in m and b for _p, t, m, b in f))

    def test_small_plain_link_diagram_passes(self):
        f = findings_for("```mermaid\nflowchart TD\n    A --- B --- C\n```\n")
        self.assertFalse(any(t == "DIAGRAM" and "nodes" in m for _p, t, m, b in f))

    def test_table_without_separator_flagged(self):
        f = findings_for("| A | B |\n| 1 | 2 |\n")
        self.assertTrue(any(t == "STRUCTURE" for _p, t, m, b in f))

    def test_placeholder_only_table_flagged(self):
        f = findings_for("| A | B |\n| --- | --- |\n| {x} | {y} |\n")
        self.assertTrue(any("placeholders" in m for _p, t, m, b in f))

    def test_table_inside_code_fence_ignored(self):
        doc = "Example table syntax:\n\n```\n| a | b |\n| 1 | 2 |\n```\n"
        f = findings_for(doc)
        self.assertFalse(any(t == "STRUCTURE" for _p, t, m, b in f))

    def test_table_inside_mermaid_fence_ignored(self):
        doc = "```mermaid\ngraph TD\n    A --> B\n```\n"
        f = findings_for(doc)
        self.assertFalse(any(t == "STRUCTURE" for _p, t, m, b in f))

    def test_table_after_code_fence_still_flagged(self):
        doc = "```\nsome code\n```\n\n| A | B |\n| 1 | 2 |\n"
        f = findings_for(doc)
        self.assertTrue(any(t == "STRUCTURE" for _p, t, m, b in f))

    def test_clean_doc_passes(self):
        f = findings_for("| A | B |\n| --- | --- |\n| 1 | 2 |\n")
        self.assertFalse(any(b for _p, t, m, b in f))


if __name__ == "__main__":
    unittest.main()
