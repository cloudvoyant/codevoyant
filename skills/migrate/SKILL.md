---
name: migrate
description: "Initialize, repair, and migrate the codevoyant shared context store: create ~/.codevoyant/<project-slug>/ and the gitignored .codevoyant symlink shared across git worktrees, then apply any store-layout migrations between the store's recorded codevoyant version and the current version (from version.txt), recording the result in .codevoyant/metadata.json. Triggers on: 'migrate', 'codevoyant migrate', 'migrate codevoyant', 'migrate .codevoyant', 'copy codevoyant data', 'migrate context store'."
license: MIT
compatibility: "Works on Claude Code and any agent runtime with Bash. Uses stdlib tools only (git, cp, mkdir, ln, awk, sed, tr, plus python3 for JSON read/write and version comparison). No third-party dependencies."
---

# migrate

Initialize or repair the codevoyant shared context store, then apply any store-layout migrations between the version the store was last migrated to and the current codevoyant version. The canonical per-project store is `~/.codevoyant/<project-slug>/`, and the in-repo `.codevoyant` is a gitignored symlink to it, so every git worktree of the same project shares one store. This skill is the ONLY place that knows about `.codevoyant` residency and migration — every other skill just uses ordinary relative `.codevoyant/...` paths that resolve transparently through the symlink.

This is an agent-driven skill: you (the agent) run the bash below and apply the selected migration files' instructions in order. There is no bundled program. `SKILL.md` is a thin dispatcher — the actual per-transition procedures live in flat `references/migrate-v<A>-to-v<B>.md` files.

## Critical rules

- **The slug must match `cv_init_store`.** The slug computation in Step 1 is byte-identical to the inline `cv_init_store` used by the other skills so the symlink target agrees.
- **Migrations are non-destructive.** Each migration file keeps its own "never clobber / never touch worktrees / union the registry" rules; the dispatcher only selects and orders them.
- **Version compare is numeric, not string.** Versions are compared as integer tuples (`1.10.0 > 1.9.0`), never as plain strings.

## Step 1: Ensure the store + symlink exist

Run this first. It creates `~/.codevoyant/<slug>/`, makes the in-repo `.codevoyant` a symlink to it (leaving an old real dir in place — the migrations relocate it later), and ensures a bare `.codevoyant` line in `.gitignore`.

```bash
cv_init_store() {
  local root; root="$(git rev-parse --show-toplevel 2>/dev/null)" || root=""; [ -n "$root" ] || root="$PWD"
  local link="$root/.codevoyant"
  [ -L "$link" ] && { export CV_STORE="$(cd "$link" && pwd -P)"; return 0; }   # already a symlink
  local common name slug
  common="$(git rev-parse --git-common-dir 2>/dev/null)" || common=""
  if [ -n "$common" ]; then
    case "$common" in /*) : ;; *) common="$root/$common" ;; esac
    name="$(basename "$(cd "$(dirname "$common")" >/dev/null 2>&1 && pwd -P)")"
  else
    name="$(basename "$root")"
  fi
  slug="$(printf '%s' "$name" | LC_ALL=C tr '[:upper:]' '[:lower:]' | LC_ALL=C sed 's/[^a-z0-9][^a-z0-9]*/-/g; s/^-*//; s/-*$//')"
  [ -n "$slug" ] || slug="unnamed"    # empty-slug fallback — matches cv_init_store
  local dest="$HOME/.codevoyant/$slug"
  mkdir -p "$dest"
  export CV_STORE="$dest"
  local gi="$root/.gitignore"
  { [ -f "$gi" ] && grep -qxF '.codevoyant' "$gi"; } || \
    printf '\n# codevoyant context store (symlink to ~/.codevoyant/<project-slug>/)\n.codevoyant\n' >> "$gi"
  # Intentional divergence from the dispatcher-skill cv_init_store: those copies return
  # early on a real .codevoyant dir, whereas this migrate copy exports CV_STORE and leaves
  # an OLD real dir in place so the v0→v1 migration can copy its data into the store. The
  # slug-producing core (name resolution + LC_ALL=C tr/sed + `unnamed` fallback) stays
  # byte-identical, so the symlink target and this skill's copy destination always agree.
  # Only create the symlink when there is nothing (or a symlink) at the path.
  if [ ! -e "$link" ]; then ln -s "$dest" "$link"; fi
}
cv_init_store
echo "store: $CV_STORE"
```

`CV_STORE` now holds the canonical store path (`~/.codevoyant/<slug>/`). The selected migration files use it as their working target. If `.codevoyant` is currently an old real directory (not yet a symlink), the v0→v1 migration treats that directory as one of its sources.

## Step 2: Resolve versions and select migrations

Determine the current codevoyant version, read the store's recorded version, then select every migration file whose transition falls in `(recorded, current]`.

### 2a. Current version

Prefer the repo's canonical `version.txt` at the repo root, then fall back to the latest git tag, then to a safe default of `0.0.0` (an unknown environment should apply all migrations from the base rather than silently skip them).

```bash
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || ROOT="$PWD"
CURRENT=""
if [ -f "$ROOT/version.txt" ]; then
  CURRENT="$(head -n1 "$ROOT/version.txt" | tr -d '[:space:]')"
  printf '%s' "$CURRENT" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || CURRENT=""   # ignore garbage
fi
[ -n "$CURRENT" ] || CURRENT="$(git tag --sort=-v:refname 2>/dev/null | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' | head -1 | sed 's/^v//')"
[ -n "$CURRENT" ] || CURRENT="0.0.0"
```

### 2b. Recorded version

```bash
RECORDED="$(python3 - "$CV_STORE/metadata.json" <<'PY'
import json,sys
try:
    with open(sys.argv[1]) as f:
        v = json.load(f).get("version","")
    # Coerce to string; a non-string version (e.g. 12345) is treated as unset
    # so it falls back to the v0 baseline rather than mis-ranking.
    print(v if isinstance(v, str) else "")
except Exception: print("")
PY
)"
[ -n "$RECORDED" ] || RECORDED="0.0.0"   # unversioned/unparseable store == v0 baseline

# State-based v0 guard: don't trust a stamped version alone. If the in-repo
# .codevoyant is not yet a symlink (still a real dir, or absent) OR the store's
# metadata.json is missing, the store has NOT been through the v0→v1 relocation
# yet — treat it as v0 regardless of any recorded version. This makes the
# dispatcher robust to a mis-stamped or hand-edited metadata.json (e.g. a store
# stamped 1.67.2 that never actually relocated).
if [ ! -L "$ROOT/.codevoyant" ] || [ ! -f "$CV_STORE/metadata.json" ]; then
  RECORDED="0.0.0"
fi
echo "recorded=$RECORDED current=$CURRENT"
```

### 2c. Migration file naming + selector rules

Migration files are flat, directly under `skills/migrate/references/`, named `migrate-v<A>-to-v<B>.md`. `<A>` is the `<from>` selector, `<B>` the `<to>` selector. Each file also declares `<from>...</from>` and `<to>...</to>` tags in its body; the tags are authoritative (the filename is a human-readable echo). A selector is a **version prefix** expanded to an inclusive `(lower, upper)` integer-tuple bound:

| Selector | Meaning | Lower bound | Upper bound |
|---|---|---|---|
| `v0` | whole major 0 (unversioned / pre-v1) | `(0,0,0)` | `(0,MAX,MAX)` |
| `v1` | whole major 1 | `(1,0,0)` | `(1,MAX,MAX)` |
| `v1.minor` / `v1.x` | any minor within major 1 | `(1,0,0)` | `(1,MAX,MAX)` |
| `v1.67` | pinned minor 1.67 | `(1,67,0)` | `(1,67,MAX)` |
| `v1.67.2` | exact patch | `(1,67,2)` | `(1,67,2)` |

`MAX` is a large sentinel (`999999`). A migration is **selected** when its `<to>` **lower** bound is `> recorded` and `<= current` (numeric tuple compare) — i.e. the current codevoyant version has reached (entered) the target series while the store has not. Keying on the lower bound (not the upper) is what lets an open-ended series selector like `v1.minor` (upper bound `(1,MAX,MAX)`) fire once `current` enters the v1 series, instead of never. Selected migrations are applied in **ascending `<to>` lower-bound order**. The `<from>` selector is documentary/legibility metadata (it tells a human where the migration starts); it is not a hard gate.

### 2d. Enumerate, parse, select, order

```bash
SKILL_REF_DIR="$(dirname "$0")/references"     # if $0 is unavailable, use the migrate skill's references/ dir
# Locate the references dir robustly: this SKILL.md lives at skills/migrate/SKILL.md.
[ -d "$SKILL_REF_DIR" ] || SKILL_REF_DIR="$ROOT/skills/migrate/references"

SELECTED="$(python3 - "$SKILL_REF_DIR" "$RECORDED" "$CURRENT" <<'PY'
import os, re, sys
ref_dir, recorded, current = sys.argv[1], sys.argv[2], sys.argv[3]
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
            break   # "minor"/"x" and anything non-numeric → open from here
    if len(nums) == 1:      # major only
        lo = (nums[0], 0, 0); hi = (nums[0], MAX, MAX)
    elif len(nums) == 2:    # major.minor
        lo = (nums[0], nums[1], 0); hi = (nums[0], nums[1], MAX)
    elif len(nums) >= 3:    # exact
        lo = (nums[0], nums[1], nums[2]); hi = lo
    else:                   # no leading number → treat as base
        lo = (0, 0, 0); hi = (0, MAX, MAX)
    return lo, hi

rec = parse_ver(recorded)
cur = parse_ver(current)
tag_re = re.compile(r"<(from|to)>\s*(.*?)\s*</\1>", re.S)
picks = []
for fn in os.listdir(ref_dir):
    if not (fn.startswith("migrate-v") and fn.endswith(".md")):
        continue
    with open(os.path.join(ref_dir, fn)) as f:
        text = f.read()
    # First-match-wins: the authoritative tag is the first occurrence; any later
    # repetition in prose (e.g. the "## Selector" section) can't override it.
    tags = {}
    for m in tag_re.finditer(text):
        tags.setdefault(m.group(1), m.group(2))
    if "from" not in tags or "to" not in tags:
        continue
    to_lo, _ = bounds(tags["to"])
    # Selected when the migration's target series has been ENTERED: its <to> lower bound is
    # newer than the recorded version and at/below the current version. Keying on the lower
    # bound lets an open series selector (e.g. v1.minor, upper bound (1,MAX,MAX)) fire once
    # current reaches the v1 series, rather than never.
    if to_lo > rec and to_lo <= cur:
        picks.append((to_lo, fn))
picks.sort()
for _, fn in picks:
    print(fn)
PY
)"
echo "selected migrations:"; printf '%s\n' "$SELECTED"
```

## Step 3: Apply the selected migrations, record the version, report

For each filename in `SELECTED`, in the order printed, open `skills/migrate/references/<filename>` and follow its instructions against the resolved store (`$CV_STORE`). Each migration file is self-contained (it declares its own prerequisites, steps, and safety rules). If `SELECTED` is empty, there is nothing to migrate — proceed straight to recording the version.

After all selected migrations have been applied, write the current version back to the store:

```bash
python3 - "$CV_STORE/metadata.json" "$CURRENT" <<'PY'
import json,sys
with open(sys.argv[1],"w") as f:
    json.dump({"version": sys.argv[2]}, f, indent=2)
    f.write("\n")
PY
cat "$CV_STORE/metadata.json"
```

Then report to the user:

- the resolved slug and store path (`CV_STORE`),
- the resolved `current` version and its source (`version.txt`, git tag, or default), and the store's `recorded` version,
- the migration files selected and applied, in order (or "none — store already current"),
- for any relocation migration that ran: each source copied from, how many files were copied vs. preserved as `.local-` conflicts, and the registry union result (rows from each side, dedup collisions),
- the version written to `.codevoyant/metadata.json`.
