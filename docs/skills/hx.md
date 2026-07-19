---
title: hx
---

# hx

Key binding reference for the [Helix](https://helix-editor.com) editor. Ask in plain language for the bindings most relevant to your query, or run `cheatsheet` for the full terse table. Deterministic — it prints a pre-baked reference, so results are instant.

**Source:** [Helix keymap](https://docs.helix-editor.com/keymap.html)

## Usage

```
/hx cheatsheet          # full terse cheatsheet (fits one screen)
/hx select              # selection & multi-cursor bindings
/hx move lines          # copy / paste / delete bindings
/hx search              # search bindings
/hx splits              # window / split management
/hx command palette     # <space>? and command mode
/hx how does it work    # selection-first grammar + vim differences
```

## Examples

**`/hx select`**
```
v            Extend mode — motions grow the selection
x            Select current line (repeat extends down)
miw mi( ma"  Match textobject: inside/around word, pair, quotes
%            Select whole file
C  Alt-C     Add cursor below / above
```

**`/hx command palette`**
```
Space ?      Command palette — fuzzy search every command + its key
:            Command mode (:w, :q, :vsplit, …)
```

## Grounding

Every binding is Helix's **default** keymap, verified against the official keymap page. The skill also flags the gotchas for vim users: selection precedes the verb, `.` is insert-repeat only (no dot-repeat), redo is `U`, there is no `0`/`$` (use `gh`/`gl`), and `x` selects a line rather than deleting a char.
