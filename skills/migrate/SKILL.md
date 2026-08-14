---
name: migrate
description: "Initialize, repair, and migrate the codevoyant shared context store: create ~/.codevoyant/<project-slug>/ and the gitignored .codevoyant symlink shared across git worktrees, copy existing codevoyant data from user-supplied source location(s) into it, and record/upgrade the store's codevoyant version in .codevoyant/metadata.json. Triggers on: 'migrate', 'codevoyant migrate', 'migrate codevoyant', 'migrate .codevoyant', 'copy codevoyant data', 'migrate context store'."
license: MIT
compatibility: "Works on Claude Code and any agent runtime with Bash. Uses stdlib tools only (git, cp, mkdir, ln, awk, sed, tr, plus python3 for JSON read/write). No third-party dependencies."
---

# migrate

Initialize or repair the codevoyant shared context store and copy existing codevoyant data into it. The canonical per-project store is `~/.codevoyant/<project-slug>/`, and the in-repo `.codevoyant` is a gitignored symlink to it, so every git worktree of the same project shares one store. This skill is the ONLY place that knows about `.codevoyant` residency and migration — every other skill just uses ordinary relative `.codevoyant/...` paths that resolve transparently through the symlink.

This is an agent-driven skill: you (the agent) run the bash below interactively, prompting the user for the source location(s) to copy from. There is no bundled program.

## Critical rules

- **Never clobber.** Copy is additive: a plain file/dir is copied only if it is absent in the store; on a non-registry file conflict, keep the destination (store) copy and preserve the incoming one as `<name>.local-<UTC-timestamp>`.
- **Never touch `worktrees/`.** Git worktrees are absolute checkouts; never copy, move, or descend into a `worktrees/` subtree.
- **Union the registry, don't sideline it.** The plan registry `.codevoyant/README.md` is merged row-by-row (see Step 4), never preserved as a `.local-` copy.
- **The slug must match `cv_init_store`.** The slug computation below is byte-identical to the inline `cv_init_store` used by the other skills so the symlink target agrees.

## Step 1: Ensure the store + symlink exist

Run this first. It creates `~/.codevoyant/<slug>/`, makes the in-repo `.codevoyant` a symlink to it (leaving an old real dir in place — this skill migrates it in later steps), and ensures a bare `.codevoyant` line in `.gitignore`.

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
  # an OLD real dir in place so Step 3/4 can copy its data into the store. The slug-producing
  # core (name resolution + LC_ALL=C tr/sed + `unnamed` fallback) stays byte-identical, so the
  # symlink target and this skill's copy destination always agree.
  # Only create the symlink when there is nothing (or a symlink) at the path.
  if [ ! -e "$link" ]; then ln -s "$dest" "$link"; fi
}
cv_init_store
echo "store: $CV_STORE"
```

`CV_STORE` now holds the canonical store path (`~/.codevoyant/<slug>/`). Use it as the copy DESTINATION in the steps below. If `.codevoyant` is currently an old real directory (not yet a symlink), treat that directory as one of the sources in Step 2.

## Step 2: Ask the user for the source location(s)

Prompt the user (interactively) for one or more source paths to copy existing codevoyant data FROM. Typical sources:

- an old real `.codevoyant/` directory in this repo (if `.codevoyant` was a plain dir before this skill ran),
- another checkout's store (e.g. `~/.codevoyant/<other-slug>/` or `/path/to/other-repo/.codevoyant/`).

Collect the answers into `SOURCES` (a list of absolute paths). If the user has no existing data to import (fresh init), `SOURCES` is empty — skip Steps 3–4 and go straight to Step 5. If `.codevoyant` here is still an old real dir, include its resolved path in `SOURCES`.

## Step 3: Copy data from each source (non-destructive)

For each `SRC` in `SOURCES`, copy every entry into `CV_STORE`, additively, skipping `worktrees/` and the registry `README.md` (the registry is handled by Step 4). Never overwrite an existing store file; on a conflict, keep the store copy and preserve the incoming one as `<name>.local-<UTC-timestamp>`.

```bash
copy_tree() {  # copy_tree SRC DST
  local src="$1" dst="$2" name rel
  mkdir -p "$dst"
  find "$src" -mindepth 1 -maxdepth 1 -print0 | while IFS= read -r -d '' path; do
    name="$(basename "$path")"
    [ "$name" = "worktrees" ] && continue          # never touch worktrees
    if [ -d "$path" ]; then
      copy_tree "$path" "$dst/$name"               # recurse
    else
      [ "$name" = "README.md" ] && [ "$dst" = "$CV_STORE" ] && continue   # top-level registry → Step 4
      if [ ! -e "$dst/$name" ]; then
        cp -p "$path" "$dst/$name"
      elif ! cmp -s "$path" "$dst/$name"; then
        cp -p "$path" "$dst/$name.local-$(date -u +%Y%m%dT%H%M%SZ)"   # conflict → preserve incoming
      fi
    fi
  done
}
for SRC in "${SOURCES[@]}"; do
  SRC="$(cd "$SRC" 2>/dev/null && pwd -P)" || { echo "skip missing source: $SRC"; continue; }
  [ "$SRC" = "$CV_STORE" ] && continue
  echo "copying from: $SRC"
  copy_tree "$SRC" "$CV_STORE"
done
```

Note: `copy_tree`'s loop body runs in a subshell (the `find … | while` pipe), so a shell counter incremented inside it would be lost to the parent. Don't try to tally copied-vs-`.local-` counts with a loop variable. For the Step 6 report, gather the counts by inspecting the result instead — e.g. after copying, count new files under `CV_STORE` and `find "$CV_STORE" -name '*.local-*'` for the conflict-preserved ones.

## Step 4: Union the plan registry (`.codevoyant/README.md`)

The only top-level registry is `.codevoyant/README.md` — a markdown table with header `| Name | Status | Plugin | Description | Created | Branch |`. When both the store and a source have one, UNION the data rows keyed by the first column (plan Name): keep a single header, include every distinct plan row from both, and on a same-Name collision keep the store's (destination) row. For each `SRC` that has a `README.md`:

```bash
union_registry() {  # union_registry SRC_README DST_README
  local src="$1" dst="$2" tmp
  [ -f "$src" ] || return 0
  if [ ! -f "$dst" ]; then cp -p "$src" "$dst"; return 0; fi
  tmp="$(mktemp)"
  # Emit the destination header + intro verbatim (everything up to and incl. the separator row),
  # then all destination data rows, then source data rows whose Name (col 1) is not already present.
  awk '
    function key(line,   a) { split(line, a, "|"); gsub(/^[ \t]+|[ \t]+$/, "", a[2]); return a[2] }
    FNR==NR {                       # destination file
      # Header test keys on the trimmed first column via key(), so a data row whose
      # Description merely contains the substring "Name |" is not misread as the header.
      if ($0 ~ /^\|/ && $0 !~ /^\|[ \t]*-+/ && key($0) != "Name") { seen[key($0)]=1; drows[++dn]=$0 }
      else if ($0 ~ /^\|[ \t]*-+/) { hassep=1; head[++hn]=$0 }
      else { head[++hn]=$0 }
      next
    }
    {                               # source file
      if ($0 ~ /^\|/ && $0 !~ /^\|[ \t]*-+/ && key($0) != "Name") {
        k=key($0); if (!(k in seen) && k != "") { seen[k]=1; srows[++sn]=$0 }
      }
    }
    END {
      for (i=1;i<=hn;i++) print head[i]
      for (i=1;i<=dn;i++) print drows[i]
      for (i=1;i<=sn;i++) print srows[i]
    }
  ' "$dst" "$src" > "$tmp"
  mv "$tmp" "$dst"
}
for SRC in "${SOURCES[@]}"; do
  SRC="$(cd "$SRC" 2>/dev/null && pwd -P)" || continue
  [ "$SRC" = "$CV_STORE" ] && continue
  [ -f "$SRC/README.md" ] && union_registry "$SRC/README.md" "$CV_STORE/README.md"
done
```

The header block is whatever the destination already has (title line, blank line, the `| Name | ... |` header, and the `|---|...|` separator). Only data rows are unioned. If the store had no `README.md` yet, the source's is copied wholesale.

Note: `.codevoyant/README.md` is the only top-level registry codevoyant maintains. If a future skill introduces another top-level state file, migrate it the same way (union its records, don't sideline it).

## Step 5: Version tracking + migrations

Read the store's recorded codevoyant version from `.codevoyant/metadata.json` (`{"version": "..."}`), determine the current version, apply any migration steps between them, then write the current version back.

```bash
# Current codevoyant version — prefer the latest git tag, fall back to 1.67.2.
CURRENT="$(git tag --sort=-v:refname 2>/dev/null | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' | head -1 | sed 's/^v//')"
[ -n "$CURRENT" ] || CURRENT="1.67.2"

# Recorded version in the store (empty if metadata.json absent/unset).
RECORDED="$(python3 - "$CV_STORE/metadata.json" <<'PY'
import json,sys
try:
    with open(sys.argv[1]) as f: print(json.load(f).get("version",""))
except Exception: print("")
PY
)"
echo "recorded=$RECORDED current=$CURRENT"
```

If `RECORDED` is empty or older than `CURRENT`, look in `skills/migrate/references/migrations/` for any migration instruction files whose target version is greater than `RECORDED` and up to `CURRENT`, and apply them **in ascending version order** (each file describes the steps to reach that version). No real historical migrations exist yet, so typically there is nothing to apply — this is the hook for future upgrades. Then write the current version:

Note: version ordering here is agent-driven prose. When the first real migration file lands, compare and order versions with semver semantics (e.g. `sort -V` / a semver comparator), not a plain string compare — a naive string sort misorders e.g. `1.9.0` vs `1.10.0`.

```bash
python3 - "$CV_STORE/metadata.json" "$CURRENT" <<'PY'
import json,sys
with open(sys.argv[1],"w") as f:
    json.dump({"version": sys.argv[2]}, f, indent=2)
    f.write("\n")
PY
cat "$CV_STORE/metadata.json"
```

## Step 6: Report

Summarize for the user:

- the resolved slug and store path (`CV_STORE`),
- each source copied from, and how many files were copied vs. preserved as `.local-` conflicts,
- the registry union result (how many rows came from each side, dedup collisions),
- any migrations applied,
- the version written to `.codevoyant/metadata.json`.
