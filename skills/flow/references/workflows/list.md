# Workflow: flow list

List every saved flow across both scopes — local (`.codevoyant/flows`) and global (`~/.codevoyant/flows`) — so the user can discover what they can run.

## Step 0: Parse arguments

```
--global / -g → list ONLY global flows
--local       → list ONLY local flows
(neither)     → list both scopes
```

## Step 1: Enumerate flows

Resolve the two roots per `references/flow-dir.md`:
- Local:  `.codevoyant/flows`
- Global: `$HOME/.codevoyant/flows`

For each scope in play, list its immediate subdirectories that contain a `flow.md`:

```bash
# local
[ -d .codevoyant/flows ] && for d in .codevoyant/flows/*/; do [ -f "$d/flow.md" ] && echo "local $d"; done
# global
[ -d "$HOME/.codevoyant/flows" ] && for d in "$HOME"/.codevoyant/flows/*/; do [ -f "$d/flow.md" ] && echo "global $d"; done
```

For each flow found, read its `flow.md` and extract:
- **slug** (directory name)
- **status** (Metadata → Status)
- **step counts** — `done` = number of `[x]` lines, `total` = total step lines
- **parameters** — the token names from the Parameters section (or "—")

## Step 2: Render the table

Print a table grouped by scope. If a scope has no flows, show a `(none)` row for it.

```
Flows

  SCOPE   NAME              STEPS   STATUS     PARAMS
  local   ship-feature      2/4     Active     {{input}}
  local   nightly-audit     3/3     Complete   —
  global  release-train     0/6     Active     {{input}}, {{env}}

  local: .codevoyant/flows   ·   global: ~/.codevoyant/flows
```

If both scopes are empty:
```
No flows found.

Create one:  /flow new <name> "<step 1>" "<step 2>" ...
Store it globally (reusable across projects):  /flow new <name> ... --global
```

## Step 3: Footer

Remind the user how to act on a flow:
```
Run:     /flow go <name> [ --global ]
Inspect: /flow status <name> [ --global ]
```
