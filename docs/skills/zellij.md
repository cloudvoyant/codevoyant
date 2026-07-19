---
title: zellij
---

# zellij

Key binding cheatsheet for the [Zellij](https://zellij.dev) terminal multiplexer (default keybindings). Ask in plain language for the relevant shortcuts, or run `cheatsheet` for the full terse table. Deterministic — it prints a pre-baked reference, so results are instant.

**Source:** [Zellij docs](https://zellij.dev/documentation/introduction.html) · [Cheatsheet](https://zellijcheatsheet.dev/)

## Usage

```
/zellij cheatsheet      # full terse cheatsheet (fits one screen)
/zellij panes           # split / switch / floating panes
/zellij resize          # resize & move panes
/zellij tabs            # tab management
/zellij sessions        # detach / attach / quit
/zellij modes           # the modal Ctrl-<key> map
```

## Examples

**`/zellij panes`**
```
Ctrl-p then n/d/r    New pane / split down / split right
Ctrl-p then f        Toggle fullscreen
Ctrl-p then w        Toggle floating panes
Alt-n · Alt-h/j/k/l  New pane · move focus (direct, no mode)
```

**`/zellij sessions`**
```
Ctrl-o then d        Detach session
Ctrl-q               Quit Zellij
zellij attach <name> Attach (-c to create) · zellij ls to list
```

## Grounding

Bindings are Zellij's **default preset**, verified against the shipped default config and cross-checked with the docs and community cheatsheet. The skill states the modal model up front: press `Ctrl-<key>` to enter a mode (Pane/Tab/Resize/Move/Scroll/Session), act with single keys, then `Enter`/`Esc` to return to Normal; `Alt-*` bindings work directly.
