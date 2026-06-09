---
title: helix
---

# helix

Key binding reference for the Helix editor (`hx`). Ask in plain language — the skill returns the bindings most relevant to your query.

**Source:** [helix-editor.com/documentation](https://helix-editor.com/documentation) · [Keymap reference](https://docs.helix-editor.com/keymap.html)

Helix is **selection-first**: you select a region, then act on it — the opposite of Vim's verb-first model. Bindings are framed accordingly.

## Usage

```
/helix                         # 8-key quick-ref for spec workflows
/helix open a file             # file navigation bindings
/helix search and replace      # selection-based search/replace
/helix split the window        # split management
/helix switch between buffers  # buffer navigation
/helix everything              # full reference
```

## Examples

**`/helix how do I open a file`**
```
Space f      Fuzzy file picker (workspace root)
Space F      File picker from current directory
g a          Go to alternate (last) file
g f          Go to file under cursor
```

**`/helix search and replace`**
```
Space /                       Workspace grep
%                             Select whole file
s<pattern><Enter>             Narrow selection to all matches (multi-cursor)
c<replacement><Esc>           Replace all matches simultaneously

Full sequence: %s<pattern><Enter>c<replacement><Esc>

Note: Helix has no :s substitution command. Replace is always
selection-based — select first, then act.
```

**`/helix` (no args)**
```
Space f                      File picker (fuzzy)
Space b                      Buffer picker
g a                          Go to alternate file
Ctrl-w v                     Vertical split
Space /                      Workspace grep
% → s<pat> → c<rep>          Select all → narrow → change
:w                           Save
g f                          Go to file under cursor
```

## Guide integration

Pass `--helix` to `spec guide` to inject relevant bindings at each task step:

```bash
/spec guide --helix
/spec guide --vim --helix   # both editors side-by-side
```

Hint type is inferred from the task description — file creation tasks get file picker bindings, refactor tasks get the `%s...c` search-replace sequence.
