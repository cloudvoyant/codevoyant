---
name: helix
description: 'Helix editor key binding reference for coding workflows. Triggers on: "helix keys", "helix shortcuts", "hx open file", "helix search replace", "helix splits", "space f helix".'
license: MIT
compatibility: Works on Claude Code and any platform. No external tools required.
argument-hint: '[files|search|splits|buffers|all]'
---

# helix

Quick key reference for Helix (hx) during spec execution. Helix is selection-first: you select a region, then act on it. This is the opposite of Vim's verb-first approach.

## Step 0: Parse context

```bash
CONTEXT="${1:-default}"
```

## Step 1: Print reference

**Default / no context — spec workflow quick-ref:**

| Key | Action |
|-----|--------|
| `Space f` | File picker (fuzzy, workspace root) |
| `Space b` | Buffer picker |
| `g a` | Go to alternate (last) file |
| `Ctrl-w v` | Vertical split |
| `Space /` | Workspace grep (global search) |
| `%` → `s<pat>` → `c<rep>` | Select all → narrow to matches → change |
| `:w` | Save |
| `g f` | Go to file under cursor |

**Search-replace detail:** `%` selects the whole file. `s<regex><Enter>` narrows selection to each match (multi-cursor). `c<replacement><Esc>` replaces all simultaneously. No `:s` substitution command exists in Helix.

---

If `CONTEXT=files`:

| Key | Action |
|-----|--------|
| `Space f` | Fuzzy file picker |
| `Space F` | File picker from current file's directory |
| `:e <path>` | Open file by path |
| `g a` | Alternate (last) file |
| `g f` | Go to file under cursor |
| `Ctrl-w gf` | Go to file under cursor in new split |

---

If `CONTEXT=search`:

| Key | Action |
|-----|--------|
| `/` | Search forward |
| `?` | Search backward |
| `n` / `N` | Next / previous match |
| `*` | Search word under primary cursor |
| `Space /` | Global workspace grep |
| `%` | Select whole file |
| `s<pattern><Enter>` | Select all matches of pattern (from selection) |
| `c<text><Esc>` | Change selection to text |
| `r<char>` | Replace each selected char with char |

**Full search-replace:** `%s<pattern><Enter>c<replacement><Esc>`

---

If `CONTEXT=splits`:

| Key | Action |
|-----|--------|
| `Ctrl-w v` | Vertical split |
| `Ctrl-w s` | Horizontal split |
| `Ctrl-w h/j/k/l` | Move to left/down/up/right split |
| `Ctrl-w q` | Close split |
| `Ctrl-w f` | Go to file under cursor in new split |

---

If `CONTEXT=buffers`:

| Key | Action |
|-----|--------|
| `Space b` | Buffer picker (fuzzy) |
| `g n` | Next buffer |
| `g p` | Previous buffer |
| `g a` | Alternate (last) buffer |
| `:bc` | Close current buffer |
| `:bonly` | Close all other buffers |

---

If `CONTEXT=all`:

Print all tables above in order: Default, Files, Search, Splits, Buffers.
