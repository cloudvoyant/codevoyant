---
name: helix
description: 'Helix editor key binding reference. Triggers on: "helix keys", "helix shortcuts", "hx open file", "helix search replace", "helix splits", "helix buffers", "space f helix", "how do I navigate in helix".'
license: MIT
compatibility: Works on Claude Code and any platform. No external tools required.
argument-hint: '[query]'
---

# helix

Quick key reference for Helix (hx). Pass any natural-language query and get the relevant bindings. No query → 8-key spec workflow quick-ref.

Helix is **selection-first**: select a region, then act on it — the opposite of Vim's verb-first approach. Hints are framed accordingly.

## Step 0: Parse query

```bash
QUERY="$*"   # everything after /helix
```

## Step 1: Match query and print reference

**No query — spec workflow quick-ref:**

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

**Search-replace detail:** `%` selects the whole file. `s<regex><Enter>` narrows selection to each match (multi-cursor). `c<replacement><Esc>` replaces all simultaneously. There is no `:s` substitution command in Helix.

---

If query mentions **opening files, navigating, fuzzy, picker, file explorer**:

| Key | Action |
|-----|--------|
| `Space f` | Fuzzy file picker (workspace root) |
| `Space F` | File picker from current file's directory |
| `:e <path>` | Open file by path |
| `g a` | Alternate (last) file |
| `g f` | Go to file under cursor |
| `Ctrl-w gf` | Go to file under cursor in new split |

---

If query mentions **search, find, replace, grep, substitute, rename**:

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

**Full search-replace sequence:** `%s<pattern><Enter>c<replacement><Esc>`

---

If query mentions **split, window, pane, vertical, horizontal, side by side**:

| Key | Action |
|-----|--------|
| `Ctrl-w v` | Vertical split |
| `Ctrl-w s` | Horizontal split |
| `Ctrl-w h/j/k/l` | Move to left/down/up/right split |
| `Ctrl-w q` | Close split |
| `Ctrl-w f` | Go to file under cursor in new split |

---

If query mentions **buffer, switch, tab, cycle**:

| Key | Action |
|-----|--------|
| `Space b` | Buffer picker (fuzzy) |
| `g n` | Next buffer |
| `g p` | Previous buffer |
| `g a` | Alternate (last) buffer |
| `:bc` | Close current buffer |
| `:bonly` | Close all other buffers |

---

If query is broad, unrecognised, or says **all / everything / full**:

Print all tables above in order.
