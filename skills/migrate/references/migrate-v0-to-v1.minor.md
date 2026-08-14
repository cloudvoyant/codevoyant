# Migrate store: v0 (legacy / unversioned) → v1.x (current layout)

<from>v0</from>
<to>v1.minor</to>

## What changed
Before codevoyant recorded a store version, `.codevoyant/` was a plain in-repo directory (or scattered across checkouts). The v1 layout makes the canonical store `~/.codevoyant/<project-slug>/` with the in-repo `.codevoyant` a gitignored symlink to it, shared across git worktrees. This migration relocates any legacy/unversioned codevoyant data (from the old real `.codevoyant/` and/or other user-supplied locations) INTO the canonical store, additively and non-destructively, and unions the plan registry.

## Selector
- `<from>v0</from>` — any store with no recorded version (`metadata.json` absent or `version` unset), i.e. the pre-versioning "v0" state.
- `<to>v1.minor</to>` — brings the store up to the current v1 layout (any 1.x minor). The dispatcher selects this migration whenever the recorded version is below v1 and the current codevoyant version is v1 or higher.

## Prerequisites
The store + symlink must already exist. `SKILL.md` Step 1 (`cv_init_store`) has run and exported `CV_STORE` (`~/.codevoyant/<slug>/`). Use `CV_STORE` as the copy DESTINATION below. If `.codevoyant` here is still an old real directory (not yet a symlink), treat that directory as one of the sources.

## Critical rules (apply throughout)
- **Never clobber.** Copy is additive: a plain file/dir is copied only if it is absent in the store; on a non-registry file conflict, keep the destination (store) copy and preserve the incoming one as `<name>.local-<UTC-timestamp>`.
- **Never touch `worktrees/`.** Git worktrees are absolute checkouts; never copy, move, or descend into a `worktrees/` subtree.
- **Union the registry, don't sideline it.** The plan registry `.codevoyant/README.md` is merged row-by-row (see Step B), never preserved as a `.local-` copy.

## Step A: Ask the user for the source location(s)

Prompt the user (interactively) for one or more source paths to copy existing codevoyant data FROM. Typical sources:

- an old real `.codevoyant/` directory in this repo (if `.codevoyant` was a plain dir before this skill ran),
- another checkout's store (e.g. `~/.codevoyant/<other-slug>/` or `/path/to/other-repo/.codevoyant/`).

Collect the answers into `SOURCES` (a list of absolute paths). If the user has no existing data to import (fresh init), `SOURCES` is empty — skip Steps A–B entirely; there is nothing to relocate. If `.codevoyant` here is still an old real dir, include its resolved path in `SOURCES`.

## Step B1: Copy data from each source (non-destructive)

For each `SRC` in `SOURCES`, copy every entry into `CV_STORE`, additively, skipping `worktrees/` and the registry `README.md` (the registry is handled by Step B2). Never overwrite an existing store file; on a conflict, keep the store copy and preserve the incoming one as `<name>.local-<UTC-timestamp>`.

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
      [ "$name" = "README.md" ] && [ "$dst" = "$CV_STORE" ] && continue   # top-level registry → Step B2
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

Note: `copy_tree`'s loop body runs in a subshell (the `find … | while` pipe), so a shell counter incremented inside it would be lost to the parent. Don't try to tally copied-vs-`.local-` counts with a loop variable. For the report, gather the counts by inspecting the result instead — e.g. after copying, count new files under `CV_STORE` and `find "$CV_STORE" -name '*.local-*'` for the conflict-preserved ones.

## Step B2: Union the plan registry (`.codevoyant/README.md`)

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

## Notes
- Idempotent: re-running against an already-migrated store copies nothing new (everything already present) and unions no new rows.
- Skip entirely when `SOURCES` is empty (fresh init) — the dispatcher still records the version.
- Never touch `worktrees/`.
