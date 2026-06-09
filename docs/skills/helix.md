---
title: helix
---

# helix

Key binding reference for the Helix editor (hx) during spec execution workflows.

Helix is **selection-first**: select a region, then act on it — the opposite of Vim's verb-first approach.

## Usage

```
/helix               # 8-key spec quick-ref
/helix files         # file navigation
/helix search        # search and search-replace (selection-based)
/helix splits        # split window management
/helix buffers       # buffer switching
/helix all           # full reference
```

## Quick reference

| Key | Action |
|-----|--------|
| `Space f` | File picker (fuzzy, workspace root) |
| `Space b` | Buffer picker |
| `g a` | Go to alternate file |
| `Ctrl-w v` | Vertical split |
| `Space /` | Workspace grep |
| `%` → `s<pat>` → `c<rep>` | Select all → narrow → change |
| `:w` | Save |
| `g f` | Go to file under cursor |

**Search-replace:** `%` selects the whole file; `s<regex><Enter>` narrows to matches (multi-cursor); `c<text><Esc>` replaces all simultaneously.

## Guide integration

Pass `--helix` to `spec guide` to show Helix keys at each task step:

```
/spec guide --helix
/spec guide --vim --helix   # show both editors
```
