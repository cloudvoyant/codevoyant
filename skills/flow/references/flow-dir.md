# Flow directory resolution (local vs global)

Shared logic for locating flows. Every flow workflow (`new`, `go`, `status`, `list`, `save`) resolves storage the same way.

## Scopes

- **Local** (default) — flows live under the current project: `.codevoyant/flows/{slug}/`
- **Global** — flows live under the user's home, reusable across every project: `~/.codevoyant/flows/{slug}/`

A flow is a directory `{slug}/` containing `flow.md` and `implementation/step-N.md` files, in either scope.

## The `--global` flag

`--global` (alias `-g`) selects the global scope. Parse it out of the arguments in every workflow **before** reading the flow name, and strip it from the positional args.

Work from the **preserved argv** the dispatcher forwarded (each original argument is one array element — a multi-word step string like `/spec new {{objective}}` is a single element, and a quoted flag value like `feature="add OAuth"` stays attached to its flag). Never flatten argv into a string and re-split it: iterate `"$@"` directly.

```bash
GLOBAL=false
for a in "$@"; do
  case "$a" in --global|-g) GLOBAL=true ;; esac
done
FLOW_ROOT="$( [ "$GLOBAL" = true ] && echo "$HOME/.codevoyant" || echo ".codevoyant" )"
FLOWS_DIR="$FLOW_ROOT/flows"
```

- `~` always means the real home directory — use `"$HOME"` in bash, never a literal `~` inside quotes.
- Create the global root on demand: `mkdir -p "$HOME/.codevoyant/flows"` (safe if it already exists).

## Pass-through flags (`--branch` and any other unrecognized flag)

Flow recognizes exactly these **flow-control** flags: `--global`/`-g` (all verbs) and `--set key=value` (`go` only; parsed in `go.md`). **Every other flag must be preserved, not dropped** — for example `--branch feature/x`, which callers use to run a flow's steps on a separate branch.

While stripping the flow-control flags, collect all remaining flags (any element starting with `-`, plus its value element when the following element does not itself start with `-`) into an ordered list `PASSTHROUGH_FLAGS`, and leave the true positionals in `POSITIONALS`. Boolean flags (no value) are kept as-is; `--flag=value` forms are kept whole.

**Iterate the preserved argv, never a re-split string.** The block below walks `"$@"` — the array the dispatcher forwarded — so each element stays intact: a multi-word step command (`/spec new {{objective}}`) remains one `POSITIONALS` entry, and a flag value carried as one shell word (`feature="add OAuth"`) is not shredded. Do **not** write `set -- $ARGS` (or any unquoted re-split): that word-splits every step string and quoted value on whitespace and corrupts both `POSITIONALS` and `PASSTHROUGH_FLAGS`.

```bash
# Walk argv "$@" left→right; peel flow-control flags, bucket the rest into PASSTHROUGH_FLAGS,
# leave true positionals (flow name, steps, input) in POSITIONALS. Each "$@" element is
# preserved whole — no re-splitting.
GLOBAL=false
PASSTHROUGH_FLAGS=()   # e.g. (--branch feature/x)
POSITIONALS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --global|-g) GLOBAL=true; shift ;;
    --set) PASSTHROUGH_FLAGS+=("$1" "$2"); shift 2 ;;   # go.md re-reads --set; new.md drops it before baking
    --*|-*)
      if [ $# -ge 2 ] && [ "${2#-}" = "$2" ]; then       # next element is a value (does not start with -)
        PASSTHROUGH_FLAGS+=("$1" "$2"); shift 2
      else
        PASSTHROUGH_FLAGS+=("$1"); shift                 # boolean, --flag=value, or value-less trailing flag
      fi ;;
    *) POSITIONALS+=("$1"); shift ;;
  esac
done
```

- **`--set` handling is verb-specific.** `go.md` parses `--set key=value` out of `PASSTHROUGH_FLAGS` into `PARAMS` and forwards the remainder. For `new`, `--set` is **not** a step flag and must **not** be baked into stored steps: `new.md` explicitly drops any `--set key=value` pair from `PASSTHROUGH_FLAGS` before writing step commands (see new.md Step 2). For `status`/`list`, `--set` is inert and simply ignored.
- **Caveat — flag values starting with `-`.** The `[ "${2#-}" = "$2" ]` test treats any following element that starts with `-` as *not* this flag's value, so a legitimate value beginning with `-` (e.g. `--message "-n"`) is read as a value-less flag and the `-n` falls through to `POSITIONALS`. This is acceptable for the `--branch feature/x`-style forwarding flow actually uses; **flag values beginning with `-` are not supported** — pass them in `--flag=value` form (kept whole) if ever needed.
- `PASSTHROUGH_FLAGS` is what `new` bakes into stored step commands (minus `--set`) and what `go` appends to each resolved step command at run time (see those workflows).

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
