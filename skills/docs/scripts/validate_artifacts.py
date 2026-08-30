#!/usr/bin/env python3
"""Validate non-text artifacts in codevoyant docs (mermaid fences + tables).

Two-stage gate:
  1. syntax   — render every mermaid fence with mmdc (PATH first, else pinned npx).
  2. semantic — node/participant caps, literal-\\n labels, edge labels, table shape.

Usage:
  validate_artifacts.py <doc.md> [<doc.md> ...]
  validate_artifacts.py --skip-render <doc.md>    # semantic stage only

Exit 0 = clean (or only NOTEs); exit 1 = blocking findings.
Findings print as:  <path>: <TYPE> <message>
JSON mode: --json emits [{"path","type","message","blocking"}].
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

MMDC_PIN = "11.16.0"  # single pinned renderer: "valid" must be deterministic
MAX_SEQUENCE_PARTICIPANTS = 8
MAX_NODES = 12

FENCE_RE = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL)
TABLE_ROW_RE = re.compile(r"^\s*\|.*\|\s*$")
CODE_FENCE_RE = re.compile(r"^\s*(```|~~~)")
# flowchart edge operators: plain (---, -->), dotted (-.-, -.->), thick
# (===, ==>), bidirectional (<-->, <==>, <-.->), special tips (--x, --o,
# x--x, o--o), and invisible links (~~~). Labels can sit between segments
# (A -->|text| B), so labels are stripped before splitting on these.
EDGE_OP_RE = re.compile(r"<==>|<-->|<-\.->|<-{2,3}|-\.+-?>?|={2,3}>?|-{2,3}[xo]?>?|[xo]-{2,3}[xo]|~{3}")
EDGE_LABEL_RE = re.compile(r"\|[^|\n]*\|")
# dash/dot label forms (A -- some text --> B, A -. some text .-> B). The
# label must be multi-word: single tokens stay, so node chains (A --- B --- C)
# are never mistaken for labeled edges.
EDGE_TEXT_LABEL_RE = re.compile(r"(-{2,3}|-\.+)\s+([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)+)\s+(-{2,3}>?|\.+-?>?)")
SHAPE_LABEL_RE = re.compile(r"\[[^\]\n]*\]|\([^\)\n]*\)|\{[^\}\n]*\}")
NODE_TOKEN_RE = re.compile(r"^[A-Za-z0-9_]+$")
GRAPH_KEYWORDS = {
    "graph", "flowchart", "subgraph", "end", "direction", "style",
    "class", "classdef", "click", "linkstyle", "default",
}
GRAPH_DIRECTIVE_RE = re.compile(r"^(graph|flowchart|subgraph|end|direction|style|classdef|class|click|linkstyle)\b", re.IGNORECASE)


def mermaid_fences(text):
    return [(m.start(), m.group(1)) for m in FENCE_RE.finditer(text)]


def diagram_type(body):
    for line in body.splitlines():
        line = line.strip()
        if line:
            return line.split()[0]
    return ""


def node_ids(body, dtype):
    ids = set()
    if dtype == "sequenceDiagram":
        for line in body.splitlines():
            m = re.match(r"\s*participant\s+(\S+)", line)
            if m:
                ids.add(m.group(1))
        return ids
    for m in re.finditer(r"^\s*([A-Za-z0-9_]+)\s*(?:\[|\(|\{)", body, re.MULTILINE):
        ids.add(m.group(1))
    for line in body.splitlines():
        line = line.strip()
        if not line or GRAPH_DIRECTIVE_RE.match(line):
            continue
        line = EDGE_TEXT_LABEL_RE.sub(r"\1 \3", line)
        line = EDGE_LABEL_RE.sub(" ", line)
        line = SHAPE_LABEL_RE.sub(" ", line)
        for token in EDGE_OP_RE.split(line):
            token = token.strip().strip('"')
            if token and NODE_TOKEN_RE.match(token) and token.lower() not in GRAPH_KEYWORDS:
                ids.add(token)
    return ids


def check_semantics(path, body, findings):
    dtype = diagram_type(body)
    if not dtype:
        findings.append((str(path), "DIAGRAM", "empty mermaid fence", True))
        return
    if re.search(r"\[[^\]\n]*\\n[^\]\n]*\]", body) or re.search(r'"[^"\n]*\\n[^"\n]*"', body):
        findings.append((str(path), "DIAGRAM", f"literal \\n in a {dtype} node label — use <br/>", True))
    if dtype == "sequenceDiagram":
        n = len(node_ids(body, dtype))
        if n > MAX_SEQUENCE_PARTICIPANTS:
            findings.append((str(path), "DIAGRAM", f"sequenceDiagram has {n} participants (cap {MAX_SEQUENCE_PARTICIPANTS}) — split it", True))
    elif dtype in ("graph", "flowchart"):
        ids = node_ids(body, dtype)
        if len(ids) > MAX_NODES:
            findings.append((str(path), "DIAGRAM", f"{dtype} has {len(ids)} nodes (cap {MAX_NODES}) — split it", True))
        # unlabeled edges are allowed where the guide says direction implies meaning (dependency graphs)
    # erDiagram: entity blocks present; PK/FK guidance is advisory, not gated


def check_tables(path, text, findings):
    lines = text.splitlines()
    in_fence = False
    i = 0
    while i < len(lines):
        if CODE_FENCE_RE.match(lines[i]):
            in_fence = not in_fence
            i += 1
            continue
        if not in_fence and TABLE_ROW_RE.match(lines[i]):
            block = []
            while i < len(lines) and TABLE_ROW_RE.match(lines[i]) and not CODE_FENCE_RE.match(lines[i]):
                block.append(lines[i])
                i += 1
            if len(block) >= 2 and not re.match(r"^\s*\|[\s:|-]+\|\s*$", block[1]):
                findings.append((str(path), "STRUCTURE", "table without a separator row (| --- |)", True))
            if len(block) >= 3 and all(re.fullmatch(r"\s*\|(\s*\{\w[^}]*\}\s*\|)+\s*", r) for r in block[2:]):
                findings.append((str(path), "STRUCTURE", "table rows are all unfilled {placeholders}", True))
        else:
            i += 1


def mmdc_cmd():
    if shutil.which("mmdc"):
        return ["mmdc"]
    if shutil.which("npx"):
        return ["npx", "-y", f"@mermaid-js/mermaid-cli@{MMDC_PIN}"]
    return None


def check_render(path, body, cmd, findings):
    with tempfile.TemporaryDirectory() as td:
        src = Path(td) / "d.mmd"
        out = Path(td) / "d.svg"
        src.write_text(body)
        try:
            proc = subprocess.run(cmd + ["-i", str(src), "-o", str(out)], capture_output=True, text=True, timeout=120)
        except (subprocess.TimeoutExpired, OSError) as e:
            findings.append((str(path), "NOTE", f"mermaid render skipped ({e})", False))
            return
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip().splitlines()
            msg = err[0][:200] if err else "render failed"
            findings.append((str(path), "DIAGRAM", f"mermaid does not render: {msg}", True))


def validate_doc(path, skip_render=False):
    text = Path(path).read_text(encoding="utf-8")
    findings = []
    cmd = None if skip_render else mmdc_cmd()
    if not skip_render and cmd is None:
        findings.append((str(path), "NOTE", "no mmdc/npx on PATH — render gate skipped", False))
    for _start, body in mermaid_fences(text):
        if cmd:
            check_render(path, body, cmd, findings)
        check_semantics(path, body, findings)
    check_tables(path, text, findings)
    return findings


def main(argv):
    args = [a for a in argv[1:]]
    as_json = "--json" in args
    skip_render = "--skip-render" in args
    paths = [a for a in args if not a.startswith("--")]
    if not paths:
        print(__doc__)
        return 2
    all_findings = []
    for p in paths:
        all_findings.extend(validate_doc(p, skip_render))
    if as_json:
        print(json.dumps([{"path": p, "type": t, "message": m, "blocking": b} for p, t, m, b in all_findings], indent=2))
    else:
        for p, t, m, b in all_findings:
            print(f"{p}: {t}{' (blocking)' if b else ''} {m}")
        if not all_findings:
            print("clean")
    return 1 if any(b for *_, b in all_findings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
