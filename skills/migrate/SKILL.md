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
- **Apply in ascending numeric order, never string order.** Selected migrations are applied in strictly ascending numeric `<to>`-tuple order — the exact order `select_migrations.py` prints them (`migrate-v9-to-v10.md` sorts before `migrate-v10-to-v11.md` by version, not lexicographically).
- **Confirmation gate before applying.** The dispatcher lists every selected migration (filename + `<from>` → `<to>`) and asks the author for confirmation before applying anything. `--yes` / `-y` (or `MIGRATE_YES=1`) skips the prompt for unattended runs. A declined confirmation aborts before any store change and no version is recorded.
- **Markdown output: soft-wrap prose, never hard-wrap** — when writing markdown, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

## Step 0: Parse invocation flags

The raw invocation args (filled by Claude Code / OpenCode slash commands): `$ARGUMENTS`. If this line is not filled in, read the args from the user's current message.

`/migrate` accepts `--yes` / `-y` to skip the confirmation prompt for unattended runs; `MIGRATE_YES=1` in the environment does the same. Capture the invocation arguments you received (the args after `/migrate`) into `INVOKE_ARGS` as a single space-separated string (empty if none), then parse:

```bash
INVOKE_ARGS="${INVOKE_ARGS:-$*}"     # set from the /migrate invocation args
ASSUME_YES=0
case " $INVOKE_ARGS " in
  *" --yes "*) ASSUME_YES=1 ;;
  *" -y "*) ASSUME_YES=1 ;;
esac
[ "${MIGRATE_YES:-0}" = "1" ] && ASSUME_YES=1
echo "assume_yes=$ASSUME_YES"
```

`ASSUME_YES` is `1` when `--yes`/`-y` was passed or `MIGRATE_YES=1` is set; otherwise `0` (the default — always confirm before applying).

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

Selection and ordering live in `scripts/select_migrations.py` — a single, unit-tested source of truth. It enumerates the flat migration files under the references dir, parses the authoritative `<from>`/`<to>` tags from each file body, selects every migration whose `<to>` lower bound is `> recorded` and `<= current` (numeric tuple compare), and prints them one per line in **strictly ascending numeric `<to>`-tuple order** (never string order — `migrate-v9-to-v10.md` sorts before `migrate-v10-to-v11.md` by version, not lexicographically).

```bash
SKILL_REF_DIR="$(dirname "$0")/references"     # if $0 is unavailable, use the migrate skill's references/ dir
# Locate the references dir robustly: this SKILL.md lives at skills/migrate/SKILL.md.
[ -d "$SKILL_REF_DIR" ] || SKILL_REF_DIR="$ROOT/skills/migrate/references"
SKILL_SCRIPTS="$(dirname "$SKILL_REF_DIR")/scripts"   # skills/migrate/scripts
[ -d "$SKILL_SCRIPTS" ] || SKILL_SCRIPTS="$ROOT/skills/migrate/scripts"

SELECTED="$(python3 "$SKILL_SCRIPTS/select_migrations.py" "$SKILL_REF_DIR" "$RECORDED" "$CURRENT")"
echo "selected migrations:"; printf '%s\n' "$SELECTED"
```

## Step 2.5: Confirmation gate — show the plan, get approval before applying

Before touching the store, present the author exactly what will run and get explicit confirmation. Selected migrations are applied in the order printed (ascending numeric `<to>` tuple — see Step 2d); never reorder them as strings.

For each selected migration, print `filename  (<from> → <to>)`, using the authoritative tags parsed from the file body. If `SELECTED` is empty, print "no migrations to apply — nothing to confirm" and proceed to Step 3 without asking.

```bash
if [ -n "$SELECTED" ]; then
  echo "Migrations selected (in apply order):"
  while IFS= read -r fn; do
    frm="$(grep -o '<from>[^<]*</from>' "$SKILL_REF_DIR/$fn" | head -n1 | sed 's/<from>//;s/<\/from>//')"
    to="$(grep -o '<to>[^<]*</to>' "$SKILL_REF_DIR/$fn" | head -n1 | sed 's/<to>//;s/<\/to>//')"
    printf '  %s  (%s → %s)\n' "$fn" "$frm" "$to"
  done <<< "$SELECTED"
fi
```

Then, unless `ASSUME_YES=1` (set in Step 0 by `--yes`/`-y` on the invocation or `MIGRATE_YES=1` in the environment), ask the author: "Apply the N migration(s) above? (yes/no)". If the author declines, stop here — do **not** apply any migration and do **not** record a new version. If accepted (or `ASSUME_YES=1`), proceed to Step 3.

```bash
if [ "$ASSUME_YES" != "1" ]; then
  printf 'Apply the %s migration(s) above? (yes/no) ' "$(wc -l <<<"$SELECTED" | tr -d ' ')"
  CONFIRM=""; read -r CONFIRM || CONFIRM=""
  case "$CONFIRM" in
    y|Y|yes|YES) : ;;
    *) echo "Declined — aborting before any store change."; exit 1 ;;
  esac
fi
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
