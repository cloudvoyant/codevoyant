---
name: vim
description: 'Vim and Neovim key binding reference. Triggers on: "vim keys", "vim shortcuts", "how do I open a file in vim", "vim search replace", "vim splits", "vim buffers", "how do I navigate in vim".'
license: MIT
compatibility: Works on Claude Code and any platform. No external tools required.
argument-hint: '[query]'
---

# vim

Quick key reference for Vim/Neovim. Pass any natural-language query and get the relevant bindings. No query → 8-key spec workflow quick-ref.

## Step 0: Parse query

```bash
QUERY="$*"   # everything after /vim
```

## Step 1: Match query and print reference

**No query — spec workflow quick-ref:**

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

If query mentions **how, why, explain, fundamentals, motion, motions, grammar, learn**:

### Motions & Fundamentals

Vim is a **language**: you compose `operator + count + motion/text-object`. Learn the pieces and you can express edits you've never memorized.

**Modes:** `Normal` (navigate/command — press `Esc` to return here), `Insert` (`i a o`), `Visual` (`v` char, `V` line, `Ctrl-v` block), `Command-line` (`:`).

**Operators** (verbs): `d` delete · `c` change (delete + insert) · `y` yank (copy) · `>`/`<` indent · `=` auto-indent · `gu`/`gU` lower/upper.

**Motions** (where the verb acts): `w`/`b`/`e` word fwd/back/end · `0`/`^`/`$` line start/first-nonblank/end · `gg`/`G` file top/bottom · `}`/`{` paragraph · `f<c>`/`t<c>` to char · `%` matching bracket.

**Text objects** (act on a region around the cursor): `iw`/`aw` inner/a word · `i"`/`a"` inside/around quotes · `ip`/`ap` paragraph · `it`/`at` tag · `i(` `i{` `i[` inside brackets.

**Counts** multiply: `3w` three words · `2dd` delete 2 lines · `d3w` delete 3 words · `c2j` change this + 2 lines down.

**Grammar examples:**
| You want | You type | Read as |
|----------|----------|---------|
| Delete a word | `diw` | delete inner word |
| Change inside quotes | `ci"` | change inside `"` |
| Delete to end of line | `D` (= `d$`) | delete to `$` |
| Yank a paragraph | `yap` | yank a paragraph |
| Delete 3 lines | `3dd` | 3 × delete-line |
| Indent a block | `>i{` | indent inside `{}` |

**Dot & repeat:** `.` repeats the last change · `;`/`,` repeat last `f`/`t` forward/back. Compose small edits, then `.` your way through the rest.

**Why it's fast:** you never reach for the mouse or arrow keys — your edit *is* a sentence. `caw` ("change a word") is one thought, not three keystrokes you think about.

---

If query mentions **opening files, navigating, netrw, explorer, fuzzy find**:

| Key | Action |
|-----|--------|
| `:e <path>` | Open file (Tab-completes paths) |
| `:Ex` | Open netrw file explorer |
| `:Sex` | Open netrw in a horizontal split |
| `Ctrl-^` | Toggle alternate (last) file |
| `gf` | Go to filename under cursor |
| `Ctrl-w gf` | Go to filename under cursor in new tab |

**With Telescope/fzf-lua (neovim):** `<leader>ff` (find files), `<leader>fg` (live grep) — key depends on config.

---

If query mentions **search, find, replace, substitute, grep**:

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

If query mentions **split, window, pane, vertical, horizontal**:

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

If query mentions **buffer, switch, tab, list buffers**:

| Key | Action |
|-----|--------|
| `:ls` | List open buffers |
| `:b<N>` | Switch to buffer N |
| `:bn` / `:bp` | Next / previous buffer |
| `Ctrl-^` | Toggle last buffer |
| `:bd` | Delete (close) current buffer |
| `:bufdo` | Run command on all open buffers |

---

If query is broad, unrecognised, or says **all / everything / full**:

Print all tables above in order.

---

## Navigation hints (compact)

Terse drill for `--vim` consumers. **Lead with navigation and selection** — the goal is to move precisely and select by *structure*, then let one operator do the edit. Learn to move and select well and the edits fall out for free.

**Navigate (move by meaning, not arrow-key by arrow-key):**
`w b e` word fwd/back/end · `0 ^ $` line start/first-word/end · `f<c> t<c>` jump to/before char (`;`/`,` repeat) · `{ }` paragraph · `%` matching bracket · `gg G` file top/bottom · `Ctrl-d Ctrl-u` half-page · `/pat` `n` `N` search & step · `*` word under cursor · `gd` def · `Ctrl-o Ctrl-i` jump back/forward. Prefer a motion over holding `h j k l`.

**Select (Visual + text objects — select the *thing*, not char-by-char):**
`v` char · `V` line · `Ctrl-v` block · then extend with any motion above. Best leverage is text objects: `iw`/`aw` word · `i"`/`a"` quotes · `i(` `i{` `i[` inside brackets · `ip`/`ap` paragraph · `it`/`at` tag. e.g. `vi{` select inside braces · `vap` select a paragraph · `viw` select a word.

**Then operate (verb + what you navigated/selected):** `d` delete · `c` change · `y` yank · `>` `<` indent — compose them: `ciw` change word · `di{` delete inside braces · `yap` yank paragraph · `d$` to end of line · `>ip` indent paragraph. `u` undo · `Ctrl-r` redo · `.` repeat last change · `p` paste.
`:w` save · `:x` save+quit · `Esc` back to Normal.

*Grammar:* `operator + count + motion/text-object`. Master motions and text objects and you can express edits you never memorized — that's the drill.
