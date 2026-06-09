---
name: vim
description: 'Vim and Neovim key binding reference for coding workflows. Triggers on: "vim keys", "vim shortcuts", "how do I open a file in vim", "vim search replace", "vim splits".'
license: MIT
compatibility: Works on Claude Code and any platform. No external tools required.
argument-hint: '[files|search|splits|buffers|all]'
---

# vim

Quick key reference for Vim/Neovim during spec execution. No context → 8-key spec quick-ref. Pass a context for a focused table.

## Step 0: Parse context

```bash
CONTEXT="${1:-default}"
```

## Step 1: Print reference

**Default / no context — spec workflow quick-ref:**

| Key | Action |
|-----|--------|
| `:e <path>` | Open file by path (Tab to complete) |
| `Ctrl-^` | Toggle alternate (last) file |
| `gf` | Go to file under cursor |
| `Ctrl-w v` | Vertical split |
| `/<pattern>` | Search forward |
| `:%s/pat/rep/gc` | Search-replace with confirm |
| `:w` | Save |
| `:x` | Save and quit (only writes if changed) |

---

If `CONTEXT=files`:

| Key | Action |
|-----|--------|
| `:e <path>` | Open file (Tab-completes paths) |
| `:Ex` | Open netrw file explorer |
| `:Sex` | Open netrw in a horizontal split |
| `Ctrl-^` | Toggle alternate (last) file |
| `gf` | Go to filename under cursor |
| `Ctrl-w gf` | Go to filename under cursor in new tab |

**With Telescope/fzf-lua (neovim):** `<leader>ff` (find files), `<leader>fg` (live grep) — key depends on your config.

---

If `CONTEXT=search`:

| Key | Action |
|-----|--------|
| `/<pattern>` | Search forward |
| `?<pattern>` | Search backward |
| `n` / `N` | Next / previous match |
| `*` | Search word under cursor |
| `:%s/pat/rep/g` | Replace all in file (no confirm) |
| `:%s/pat/rep/gc` | Replace all with confirm per match |
| `:s/pat/rep/g` | Replace in current line only |
| `Ctrl-r Ctrl-w` | Paste word under cursor into `:` command |

---

If `CONTEXT=splits`:

| Key | Action |
|-----|--------|
| `Ctrl-w v` | Vertical split |
| `Ctrl-w s` | Horizontal split |
| `Ctrl-w h/j/k/l` | Move to left/down/up/right split |
| `Ctrl-w =` | Equalise split sizes |
| `Ctrl-w _` | Maximise current split height |
| `Ctrl-w \|` | Maximise current split width |
| `:q` | Close current split |

---

If `CONTEXT=buffers`:

| Key | Action |
|-----|--------|
| `:ls` | List open buffers |
| `:b<N>` | Switch to buffer N |
| `:bn` / `:bp` | Next / previous buffer |
| `Ctrl-^` | Toggle last buffer |
| `:bd` | Delete (close) current buffer |
| `:bufdo` | Run command on all open buffers |

---

If `CONTEXT=all`:

Print all tables above in order: Default, Files, Search, Splits, Buffers.
