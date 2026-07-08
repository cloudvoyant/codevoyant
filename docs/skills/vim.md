---
title: vim
---

# vim

Key binding reference for Vim and Neovim. Ask in plain language — the skill returns the bindings most relevant to your query.

**Source:** [vim.org](https://www.vim.org/docs.php) · [Neovim docs](https://neovim.io/doc/)

## Usage

```
/vim                         # 8-key quick-ref for spec workflows
/vim open a file             # file navigation bindings
/vim search and replace      # search/substitute bindings
/vim split the window        # split management
/vim switch between buffers  # buffer navigation
/vim everything              # full reference
```

## Examples

**`/vim how do I open a file`**
```
:e <path>   Open file (Tab-completes paths)
:Ex         Open netrw file explorer
Ctrl-^      Toggle alternate (last) file
gf          Go to filename under cursor
```

**`/vim search and replace`**
```
/<pattern>          Search forward (n/N to navigate)
:%s/pat/rep/gc      Replace all with confirm per match
:%s/pat/rep/g       Replace all without confirm
Ctrl-r Ctrl-w       Paste word under cursor into : command
```

**`/vim` (no args)**
```
:e <path>        Open file by path (Tab to complete)
Ctrl-^           Toggle alternate (last) file
gf               Go to file under cursor
Ctrl-w v         Vertical split
/<pattern>       Search forward
:%s/pat/rep/gc   Search-replace with confirm
:w               Save
:x               Save and quit (only writes if changed)
```

## Guide integration

Pass `--vim` to inject Vim hints into guided sessions — `spec guide`, `ed new guide`, and `ed assist`:

```bash
/spec guide --vim
/ed new guide "assignment 2" --vim
/ed assist .codevoyant/guides/assignment-2/guide.md --vim
```

The hints **drill navigation and selection** — how to move with motions (`w b e`, `f<c>`, `{ }`, `gg G`, `/pat`, `gd`) and select by structure with text objects (`viw`, `vi{`, `vap`), then compose an operator (`ciw`, `di{`, `yap`). The goal is to teach transferable motions, not just the handful of keys for the task at hand.
