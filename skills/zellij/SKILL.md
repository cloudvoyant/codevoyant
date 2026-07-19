---
name: zellij
description: 'Zellij terminal multiplexer key binding cheatsheet. Triggers on: "zellij cheatsheet", "zellij shortcuts", "zellij keybindings", "zellij panes", "zellij floating pane", "how do I split panes in zellij", "zellij tabs", "zellij sessions", "zellij resize pane".'
license: MIT
compatibility: Works on Claude Code and any platform. No external tools required — a deterministic read-and-print reference.
argument-hint: '[query | cheatsheet]'
---

# zellij

Fast key reference for the [Zellij](https://zellij.dev) terminal multiplexer (**default** keybindings). Pass a query for the relevant shortcuts, or `cheatsheet` for the full terse table. **Deterministic** — print the matching table below verbatim; never fetch anything.

Zellij is **modal**: from Normal mode press `Ctrl-<key>` to enter a mode, then single keys act within it. `Enter` or `Esc` returns to Normal; `Ctrl-g` toggles Locked (passthrough). `Ctrl-<key> then n` means enter the mode first; `Alt-*` bindings work directly from Normal.

## Step 0: Parse query

```bash
QUERY="$*"   # everything after /zellij
```

## Step 1: Match query and print

Pick the **first** rule that matches `QUERY`. If `QUERY` is empty, or is `cheatsheet` / `cheat` / `sheet` / `all` / `everything` / `full`, print **the whole cheatsheet** (all tables below, in order) followed by the **Links** block. Otherwise print only the matching section.

---

### cheatsheet — full reference (no query, or `cheatsheet`/`all`)

Print every table below (Modes → Panes → Resize & Move → Tabs → Sessions), then the **Links** block. Written to fit one screen.

---

If query mentions **mode, modal, normal, lock, unlock**:

**Modes** — enter with `Ctrl-<key>`; `Enter`/`Esc` → Normal.

| Key | Mode |
|-----|------|
| `Ctrl-p` · `Ctrl-t` | Pane · Tab |
| `Ctrl-n` · `Ctrl-h` | Resize · Move |
| `Ctrl-s` · `Ctrl-o` | Scroll/Search · Session |
| `Ctrl-g` | Toggle Locked (passthrough) |

---

If query mentions **pane, split, floating, float, switch, focus, fullscreen, new pane**:

**Panes** — `Ctrl-p` then:

| Key | Action |
|-----|--------|
| `n` · `d` · `r` | New pane · split down · split right |
| `x` · `f` | Close pane · toggle fullscreen |
| `w` · `e` | Toggle floating panes · toggle embed/float this pane |
| `c` · `p` · `h/j/k/l` | Rename · focus next · move focus |

Direct (no mode): `Alt-n` new pane · `Alt-h/j/k/l` (or `Alt-←↓↑→`) move focus · `Alt-f` toggle floating · `Alt-[` `Alt-]` prev/next layout.

---

If query mentions **resize, move pane, grow, shrink, bigger, smaller**:

**Resize & Move**

| Key | Action |
|-----|--------|
| `Ctrl-n` then `h/j/k/l` | Resize: grow toward edge (`H/J/K/L` shrink; `+`/`-` overall) |
| `Ctrl-h` then `h/j/k/l` | Move pane in direction (`n`/`Tab` next slot, `p` back) |
| `Alt-=` / `Alt-+` · `Alt--` | Grow / shrink pane (direct, no mode) |

---

If query mentions **tab, tabs, new tab, rename, sync**:

**Tabs** — `Ctrl-t` then:

| Key | Action |
|-----|--------|
| `n` · `x` · `r` | New tab · close · rename |
| `h`/`l` (or arrows) · `1`–`9` | Prev / next tab · go to tab N |
| `Tab` · `s` · `b` | Toggle last two · sync input · break pane to new tab |

Direct: `Alt-i` / `Alt-o` move tab left / right.

---

If query mentions **session, sessions, detach, attach, quit, exit**:

**Sessions** — `Ctrl-o` then:

| Key | Action |
|-----|--------|
| `d` · `w` | Detach session · session manager |
| `Ctrl-q` | Quit Zellij (direct) |

CLI: `zellij attach <name>` (`-c` create if absent) · `zellij ls` list · `zellij kill-session <name>`.

---

If query mentions **scroll, search, copy mode**:

**Scroll / Search** — `Ctrl-s` then: `↑`/`↓` `PgUp`/`PgDn` scroll · `s` search (then `n`/`p` next/prev, `c`/`w`/`o` toggle case/wrap/whole-word) · `e` edit scrollback in `$EDITOR`.

---

Always end the printed output with the **Links** block:

```
Cheatsheet: https://zellijcheatsheet.dev/
Docs:       https://zellij.dev/documentation/introduction.html
```
