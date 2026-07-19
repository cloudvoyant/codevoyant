---
name: hx
description: 'Helix editor key binding reference. Triggers on: "hx keys", "hx cheatsheet", "helix keybindings", "helix cheatsheet", "helix shortcuts", "how do I select in helix", "helix splits", "helix search", "helix command palette", "hx navigation".'
license: MIT
compatibility: Works on Claude Code and any platform. No external tools required — a deterministic read-and-print reference.
argument-hint: '[query | cheatsheet]'
---

# hx

Fast key reference for the [Helix](https://helix-editor.com) editor. Pass a natural-language query for the relevant bindings, or `cheatsheet` for the full terse table. **Deterministic** — print the matching table below verbatim; never fetch anything.

Helix is **selection-first**: a motion *moves and selects*, then a verb (`d` `c` `y`) acts on the current selection — the reverse of vim's verb→motion. `g` is the goto prefix, `m` the match/surround prefix, `Space` the leader menu.

## Step 0: Parse query

```bash
QUERY="$*"   # everything after /hx
```

## Step 1: Match query and print

Pick the **first** rule that matches `QUERY`. If `QUERY` is empty, or is `cheatsheet` / `cheat` / `sheet` / `all` / `everything` / `full`, print **the whole cheatsheet** (all tables below, in order, followed by the Docs line). Otherwise print only the matching section.

---

### cheatsheet — full reference (no query, or `cheatsheet`/`all`)

Print every table below (Modes → Navigation → Selection → Change/Copy/Paste/Delete → Edit/Undo → Search → Files & pickers → Splits → Command palette), then the **Docs** line. It is written to fit one screen.

---

If query mentions **mode, normal, insert, select, extend**:

**Modes** — `Esc` always returns to Normal.

| Key | Mode |
|-----|------|
| `i` `a` · `I` `A` · `o` `O` | Insert before/after · line start/end · open line below/above |
| `v` | Select (extend) — motions extend the selection |
| `:` | Command mode |
| `Space` | Leader menu (pickers, LSP, windows) |

---

If query mentions **nav, move, motion, cursor, goto, jump, scroll, word**:

**Navigation**

| Key | Action |
|-----|--------|
| `h j k l` | Left / down / up / right |
| `w b e` (`W B E`) | Next/prev/end of word (WORD = whitespace-delimited) |
| `f<c>` `t<c>` (`F` `T` back) | Find / till char |
| `gg` `ge` | File top / end · `G<n>` goto line n |
| `gh` `gl` `gs` | Line start / line end / first non-blank (no `0`/`$` in Helix) |
| `Ctrl-b` `Ctrl-f` · `Ctrl-u` `Ctrl-d` | Page up/down · half-page up/down |
| `mm` · `Ctrl-o` `Ctrl-i` | Matching bracket · jumplist back/forward |

---

If query mentions **select, selection, cursor(s), multi, text object, extend**:

**Selection** (Helix selects *first*, then you act)

| Key | Action |
|-----|--------|
| `v` | Extend mode — motions grow the selection |
| `x` | Select current line; repeat extends downward |
| `miw` `mi(` `ma"` | Match textobject: inside/around word, pair, quotes (`mi`/`ma` + object) |
| `%` | Select whole file |
| `s` `S` | Select regex matches in selection / split on regex |
| `;` `,` | Collapse to one cursor / keep only primary selection |
| `C` `Alt-C` | Add cursor below / above |

---

If query mentions **copy, paste, yank, delete, cut, change, replace, move line, duplicate**:

**Change / Copy / Paste / Delete**

| Key | Action |
|-----|--------|
| `y` · `p` `P` | Yank · paste after / before |
| `d` (`Alt-d`) · `c` | Delete (delete without yank) · change (delete + insert) |
| `r<c>` · `R` | Replace each selected char / replace selection with yank |
| `J` · `>` `<` | Join lines · indent / unindent |

Note: Helix has **no default binding** to move or duplicate lines up/down — select with `x` then `d`/`y`/`p`, or bind your own.

---

If query mentions **undo, redo, edit, insert, case, increment, indent**:

**Edit / Undo**

| Key | Action |
|-----|--------|
| `u` `U` | Undo / **redo** (redo is `U`, not `Ctrl-r`) |
| `o` `O` · `~` | Open line below/above · switch case |
| `Ctrl-a` `Ctrl-x` | Increment / decrement number |
| `.` | Repeat last **insert** only — Helix has **no** vim dot-repeat |

---

If query mentions **search, find, replace, grep, next match**:

**Search**

| Key | Action |
|-----|--------|
| `/` `?` · `n` `N` | Search forward / for prev pattern · next / prev match |
| `*` | Search using the current selection |

(Multi-cursor "replace" = `s` to select matches, then `c` to change all.)

---

If query mentions **file, open, picker, buffer, fuzzy, symbol, palette, space**:

**Files & pickers** (all under `Space`)

| Key | Action |
|-----|--------|
| `Space f` `Space b` | File picker / buffer picker |
| `Space /` `Space s` | Global search / symbol picker (LSP) |
| `Space '` · `Space ?` | Reopen last picker · **command palette** (search all commands + keys) |

---

If query mentions **split, window, pane, vertical, horizontal**:

**Splits** (window mode: `Ctrl-w` or `Space w`)

| Key | Action |
|-----|--------|
| `Ctrl-w v` `Ctrl-w s` | Vertical / horizontal split |
| `Ctrl-w h/j/k/l` · `Ctrl-w w` | Move between windows · cycle |
| `Ctrl-w q` | Close window |

---

If query mentions **palette, command, colon, run command, `?`**:

**Command palette:** `Space ?` opens a fuzzy search over **every command and its keybinding** — the fastest way to discover a key. `:` enters command mode (`:w`, `:q`, `:vsplit`, …).

---

If query mentions **how, why, grammar, vim, difference, differences, learn**:

**Selection-first grammar & vim differences**

- **Select, then act.** A motion moves *and* selects (`w` selects the next word); the verb (`d`/`c`/`y`) then acts on that selection. So "delete word" is `w d`, not `dw`.
- **`g` = goto prefix** (`gg`, `ge`, `gh`, `gl`, `gs`), **`m` = match/surround** (`mm`, `miw`, `ms`), **`Space` = leader** (pickers/LSP/windows).
- **No `0`/`$`** — use `gh`/`gl`. **`x` selects a line**, it does not delete a char. **Redo is `U`.**
- **No dot-repeat:** `.` replays the last *insert* only, not arbitrary changes.

---

Always end the printed output with the **Docs** line:

`Docs: https://docs.helix-editor.com/keymap.html`
