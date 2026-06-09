---
title: vim
---

# vim

Key binding reference for Vim and Neovim during spec execution workflows.

## Usage

```
/vim               # 8-key spec quick-ref
/vim files         # file navigation
/vim search        # search and search-replace
/vim splits        # split window management
/vim buffers       # buffer switching
/vim all           # full reference
```

## Quick reference

| Key | Action |
|-----|--------|
| `:e <path>` | Open file (Tab to complete) |
| `Ctrl-^` | Toggle alternate file |
| `gf` | Go to file under cursor |
| `Ctrl-w v` | Vertical split |
| `/<pattern>` | Search forward |
| `:%s/pat/rep/gc` | Search-replace with confirm |
| `:w` | Save |
| `:x` | Save and quit |

## Guide integration

Pass `--vim` to `spec guide` to show relevant Vim keys at each task step:

```
/spec guide --vim
/spec guide --vim --helix   # show both editors
```
