# Flow directory resolution (local vs global)

Shared logic for locating flows. Every flow workflow (`new`, `go`, `status`, `list`, `save`) resolves storage the same way.

## Scopes

- **Local** (default) — flows live under the current project: `.codevoyant/flows/{slug}/`
- **Global** — flows live under the user's home, reusable across every project: `~/.codevoyant/flows/{slug}/`

A flow is a directory `{slug}/` containing `flow.md` and `implementation/step-N.md` files, in either scope.

## The `--global` flag

`--global` (alias `-g`) selects the global scope. Parse it out of the arguments in every workflow **before** reading the flow name, and strip it from the positional args.

```bash
GLOBAL=false
case " $ARGS " in *" --global "*|*" -g "*) GLOBAL=true ;; esac
FLOW_ROOT="$( [ "$GLOBAL" = true ] && echo "$HOME/.codevoyant" || echo ".codevoyant" )"
FLOWS_DIR="$FLOW_ROOT/flows"
```

- `~` always means the real home directory — use `"$HOME"` in bash, never a literal `~` inside quotes.
- Create the global root on demand: `mkdir -p "$HOME/.codevoyant/flows"` (safe if it already exists).

## Pass-through flags (`--branch` and any other unrecognized flag)

Flow recognizes exactly these **flow-control** flags: `--global`/`-g` (all verbs) and `--set key=value` (`go` only; parsed in `go.md`). **Every other flag must be preserved, not dropped** — for example `--branch feature/x`, which callers use to run a flow's steps on a separate branch.

While stripping the flow-control flags, collect all remaining flags (any token starting with `-`, plus its value token when the following token does not itself start with `-`) into an ordered list `PASSTHROUGH_FLAGS`, and remove them from the positional args. Boolean flags (no value) are kept as-is; `--flag=value` forms are kept whole.

```bash
# Walk the args left→right; peel flow-control flags, bucket the rest into PASSTHROUGH_FLAGS,
# leave true positionals (flow name, steps, input) in POSITIONALS.
GLOBAL=false
PASSTHROUGH_FLAGS=()   # e.g. (--branch feature/x)
POSITIONALS=()
set -- $ARGS
while [ $# -gt 0 ]; do
  case "$1" in
    --global|-g) GLOBAL=true; shift ;;
    --set) PASSTHROUGH_FLAGS+=("$1" "$2"); shift 2 ;;   # go.md re-reads --set from PASSTHROUGH; harmless elsewhere
    --*|-*)
      if [ $# -ge 2 ] && [ "${2#-}" = "$2" ]; then       # next token is a value (not another flag)
        PASSTHROUGH_FLAGS+=("$1" "$2"); shift 2
      else
        PASSTHROUGH_FLAGS+=("$1"); shift                 # boolean or --flag=value
      fi ;;
    *) POSITIONALS+=("$1"); shift ;;
  esac
done
```

- `--set` is a special case for `go`: `go.md` parses `--set key=value` into `PARAMS` itself, so it consumes those from `PASSTHROUGH_FLAGS` before forwarding. For `new`/`status`/`list`, `--set` is not meaningful and simply rides along in `PASSTHROUGH_FLAGS` (or is ignored) — this shared rule does not need per-verb branches.
- `PASSTHROUGH_FLAGS` is what `new` bakes into stored step commands and what `go` appends to each resolved step command at run time (see those workflows).

## Resolving a flow by name (for `go`, `status`, `save`)

When the user names an existing flow to run/inspect, resolve which scope holds it:

1. **If `--global` was passed:** look only in `~/.codevoyant/flows/{slug}/`.
2. **Otherwise:** look in **local first** (`.codevoyant/flows/{slug}/`), then fall back to **global** (`~/.codevoyant/flows/{slug}/`).
3. If found in exactly one scope, use it. If found in **both** and `--global` was not given, prefer local but note: `ℹ Using local flow '{slug}' (a global flow with the same name also exists — pass --global to run that one).`
4. If found in neither: error `Flow '{slug}' not found (looked in local and global). Run /flow new {slug} first.`

Set `FLOW_DIR` to the resolved `{FLOWS_DIR}/{slug}/` and use it for the rest of the workflow.

## Creating a flow (for `new`)

`new` does not search — it writes to the scope selected by `--global`:

```
FLOW_DIR = {FLOWS_DIR}/{slug}/     # global if --global, else local
```
