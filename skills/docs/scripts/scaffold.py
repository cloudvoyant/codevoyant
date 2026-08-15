#!/usr/bin/env python3
"""Scaffold a documentation skeleton by copying a template and filling tokens.

Copies the copy-ready template at `references/templates/<type>.md` (resolved relative to this script), replaces every `{key}` token with the value from the `--vars` JSON dict, and writes the result to `--out`. A literal copy plus string replacements — no section parsing. The dict is open-ended: put whatever tokens your templates use in it (`{name}`, `{path}`, or anything else).

Every fill-in prompt in the written doc is a `<!-- @agent: … -->` marker (authoring instructions for whoever fills the doc in); find them with `grep -rn "@agent" docs/ README.md`. A marker whose text starts with `(optional)` marks a section you may delete.

Usage:
    scaffold.py --out docs/architecture/auth.md --template auth --vars '{"name": "Auth", "path": "libs/auth"}'
    scaffold.py --out README.md --template project-readme --vars '{"name": "My Project"}'
    scaffold.py --out docs/ci.md --template ci --vars '{"name": "CI/CD & Infrastructure"}' --overwrite

Exit codes: 0 wrote the file; 2 bad arguments (unknown template or invalid --vars JSON); 3 the file already existed and was left untouched (pass --overwrite to replace it).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = SCRIPT_DIR / ".." / "references" / "templates"


def scaffold(template: str, out: Path, variables: dict | None = None, overwrite: bool = False) -> int:
    """Copy template `<type>.md` to `out`, replacing each `{key}` token with variables[key]. Returns the exit code (0 wrote, 3 skipped-exists)."""
    template_path = (TEMPLATES_DIR / f"{template}.md").resolve()
    if not template_path.is_file():
        raise FileNotFoundError(f"no such template: {template_path}")

    if out.exists() and not overwrite:
        print("skip: exists")
        return 3

    text = template_path.read_text()
    for key, value in (variables or {}).items():
        text = text.replace("{" + key + "}", str(value))

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text)
    print(f"wrote: {out}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, required=True, help="Target doc path (parent dirs created)")
    ap.add_argument("--template", required=True, help="Template type (file stem under references/templates/)")
    ap.add_argument("--vars", default="{}", help='JSON object of {key: value} token replacements, e.g. \'{"name": "Auth", "path": "libs/auth"}\'')
    ap.add_argument("--overwrite", action="store_true", help="Overwrite an existing --out file")
    args = ap.parse_args()

    try:
        variables = json.loads(args.vars)
    except json.JSONDecodeError as e:
        ap.error(f"--vars is not valid JSON: {e}")
    if not isinstance(variables, dict):
        ap.error("--vars must be a JSON object (key/value dict)")

    try:
        return scaffold(args.template, args.out, variables, args.overwrite)
    except FileNotFoundError as e:
        ap.error(str(e))


if __name__ == "__main__":
    raise SystemExit(main())
