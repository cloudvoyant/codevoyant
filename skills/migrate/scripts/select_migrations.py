#!/usr/bin/env python3
"""Select and order store-layout migrations for the migrate skill.

Usage: select_migrations.py <ref_dir> <recorded> <current>

Enumerates the flat migration files under <ref_dir> (named migrate-v*.md),
parses the authoritative <from>/<to> version tags from each file body, selects
every migration whose <to> series has been entered -- recorded < to_lower and
to_lower <= current (numeric integer-tuple compare) -- and prints the selected
filenames one per line in strictly ascending numeric <to> lower-bound order.

Ordering is NEVER string order: migrate-v9-to-v10.md must sort before
migrate-v10-to-v11.md by version tuple, not lexicographically. An unparseable
version degrades to the v0 baseline (0,0,0) instead of erroring, mirroring the
dispatcher's "unknown environment applies all migrations from the base" rule.

Exit code is always 0; selection is printed on stdout.
"""

import os
import re
import sys

MAX = 999999


def parse_ver(s):
    # Degrade gracefully: a malformed/hand-edited version (e.g. "1.x",
    # "1.67.2-rc1") falls back to the v0 baseline instead of throwing.
    try:
        return tuple(int(x) for x in s.split("."))
    except (ValueError, AttributeError):
        return (0, 0, 0)


def bounds(sel):
    # sel like "v0", "v1", "v1.minor", "v1.x", "v1.67", "v1.67.2"
    sel = sel.strip().lstrip("v")
    parts = sel.split(".")
    nums = []
    for p in parts:
        if re.fullmatch(r"\d+", p):
            nums.append(int(p))
        else:
            break  # "minor"/"x" and anything non-numeric -> open from here
    if len(nums) == 1:      # major only
        lo = (nums[0], 0, 0); hi = (nums[0], MAX, MAX)
    elif len(nums) == 2:    # major.minor
        lo = (nums[0], nums[1], 0); hi = (nums[0], nums[1], MAX)
    elif len(nums) >= 3:    # exact
        lo = (nums[0], nums[1], nums[2]); hi = lo
    else:                   # no leading number -> treat as base
        lo = (0, 0, 0); hi = (0, MAX, MAX)
    return lo, hi


def main(ref_dir, recorded, current):
    rec = parse_ver(recorded)
    cur = parse_ver(current)
    tag_re = re.compile(r"<(from|to)>\s*(.*?)\s*</\1>", re.S)
    picks = []
    for fn in os.listdir(ref_dir):
        if not (fn.startswith("migrate-v") and fn.endswith(".md")):
            continue
        with open(os.path.join(ref_dir, fn)) as f:
            text = f.read()
        # First-match-wins: the authoritative tag is the first occurrence; any
        # later repetition in prose (e.g. a "## Selector" section) can't override.
        tags = {}
        for m in tag_re.finditer(text):
            tags.setdefault(m.group(1), m.group(2))
        if "from" not in tags or "to" not in tags:
            continue
        to_lo, _ = bounds(tags["to"])
        if to_lo > rec and to_lo <= cur:
            picks.append((to_lo, fn))
    # Strictly ascending numeric <to> lower-bound order, never string order.
    # Ties on the same lower bound break on filename for determinism.
    picks.sort(key=lambda p: (p[0], p[1]))
    for _, fn in picks:
        print(fn)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
