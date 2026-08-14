#!/usr/bin/env python3
"""Convert snippet markdown files into Raycast snippet JSON.

Reads each `<name>.md` in the source directory, parses
`## <name>` / `` `;keyword` `` / fenced-code-block sections, and writes
`<name>.json` next to it.

Defaults src and out to the script's own directory, so running
`./md2snippets.py` from anywhere converts every .md sitting beside it.

Usage:
    md2snippets.py                # convert every .md beside the script
    md2snippets.py bash.md mise.md
    md2snippets.py --src DIR --out-dir DIR
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_SRC = SCRIPT_DIR
DEFAULT_OUT = SCRIPT_DIR

HEADING_RE = re.compile(r"^##\s+(.+?)\s*$")
KEYWORD_RE = re.compile(r"^`(;[^`]+)`\s*$")
FENCE_RE = re.compile(r"^```([\w+-]*)\s*$")


def strip_frontmatter(lines: list[str]) -> list[str]:
    if lines and lines[0].rstrip() == "---":
        for i in range(1, len(lines)):
            if lines[i].rstrip() == "---":
                return lines[i + 1 :]
    return lines


def parse(md_text: str) -> list[dict]:
    lines = strip_frontmatter(md_text.splitlines())
    snippets: list[dict] = []
    i = 0
    n = len(lines)

    while i < n:
        m = HEADING_RE.match(lines[i])
        if not m:
            i += 1
            continue

        name = m.group(1).strip()
        i += 1

        # Find the keyword line
        keyword = None
        while i < n:
            line = lines[i]
            if HEADING_RE.match(line):
                break
            km = KEYWORD_RE.match(line.strip())
            if km:
                keyword = km.group(1)
                i += 1
                break
            i += 1

        if keyword is None:
            raise ValueError(f"section '{name}' has no keyword line")

        # Find the opening fence
        while i < n and not FENCE_RE.match(lines[i]):
            if HEADING_RE.match(lines[i]):
                raise ValueError(f"section '{name}' has no code fence")
            i += 1

        if i >= n:
            raise ValueError(f"section '{name}' has no code fence")

        i += 1  # consume opening fence
        body_start = i
        while i < n and lines[i].rstrip() != "```":
            i += 1

        if i >= n:
            raise ValueError(f"section '{name}' has an unterminated code fence")

        text = "\n".join(lines[body_start:i])
        i += 1  # consume closing fence

        snippets.append({"name": name, "text": text, "keyword": keyword})

    return snippets


def convert_file(md_path: Path, out_dir: Path) -> Path:
    snippets = parse(md_path.read_text())
    out_path = out_dir / (md_path.stem + ".json")
    out_path.write_text(json.dumps(snippets, indent=2, ensure_ascii=False) + "\n")
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "files",
        nargs="*",
        type=Path,
        help="Specific .md files (default: every .md in --src)",
    )
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)

    md_files = args.files or sorted(args.src.glob("*.md"))
    if not md_files:
        print(f"no .md files found in {args.src}", file=sys.stderr)
        return 1

    failed = 0
    for md in md_files:
        try:
            out = convert_file(md, args.out_dir)
        except ValueError as e:
            # Isolate errors per file: report the bad file and keep going so one
            # malformed section can't abort a whole-store rebuild.
            print(f"{md.name}: {e}", file=sys.stderr)
            failed += 1
            continue
        with out.open() as f:
            count = len(json.load(f))
        print(f"{md.name} -> {out}  ({count} snippets)")

    return 2 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
