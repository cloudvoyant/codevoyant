# Flow directory resolution (local vs global)

Shared logic for locating flows. Every flow workflow (`new`, `go`, `status`, `list`, `save`) resolves storage the same way.

## Scopes

- **Local** (default) — flows live under the current project: `.codevoyant/flows/{slug}/`
- **Global** — flows live under the user's home, reusable across every project: `~/.codevoyant/flows/{slug}/`

A flow is a directory `{slug}/` containing `flow.md` and `implementation/step-N.md` files, in either scope.

## The `--global` flag

`--global` (alias `-g`) selects the global scope. Parse it out of the arguments in every workflow **before** reading the flow name, and strip it from the positional args.

Work from the **preserved argv** the dispatcher forwarded (each original argument is one array element — a multi-word step string like `/spec new {{objective}}` is a single element, and a quoted flag value like `feature="add OAuth"` stays attached to its flag). Never flatten argv into a string and re-split it: iterate `"$@"` directly.

This minimal loop below sets `GLOBAL` only — it is enough for `status`/`list`/`save`, which do not forward flags. `new`/`go` need the fuller argv walker in [Pass-through flags](#pass-through-flags-branch-and-any-other-unrecognized-flag) below, which sets `GLOBAL` **and** buckets `PASSTHROUGH_FLAGS`/`POSITIONALS`. The two must agree on how `--global` is detected: **if you change the `--global`/`-g` handling in one, change it in the other.**

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

This walker is the **superset** of the minimal `--global`-only loop under [The `--global` flag](#the-global-flag): it detects `--global`/`-g` identically and additionally buckets pass-through flags. `new`/`go` use this one; `status`/`list`/`save` use the minimal loop. Keep the `--global`/`-g` case in the two in sync.

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
- `PASSTHROUGH_FLAGS` is what `new` bakes into stored step commands (minus `--set`) and what `go` merges into each resolved step command at run time (see those workflows). At `go` time, run-time flags **override** any same-named flag baked into the step — the explicit run-time value wins, and a flag never appears twice (see go.md Step 2).

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

## Run instance (mutable run-state — for `go`, `status`, `doctor`)

A flow **definition** (`{FLOWS_DIR}/{slug}/` with `flow.md` + `implementation/step-N.md`) is a **read-only template**. `go` must never mutate it — mutating a *global* definition clobbers the shared template and lets concurrent/other-project runs overwrite each other's state.

All mutable run-state lives in a **run instance**, which is **always local to the current project**, regardless of whether the definition is local or global:

```
.codevoyant/runs/{slug}/
  run.md         # this run's resolved identity (slug, definition, branch/spec-slug/worktree) — written at go start
  progress.md    # a copy of the definition's Steps checklist; the ONLY place [ ] → [x] is flipped
  context.md     # the accumulating handoff log (persisted for resume)
```

`run.md` is the run instance's **identity record**. Because the definition and `progress.md` only ever hold `{{placeholders}}`, the resolved branch / spec-slug / worktree of a real run live nowhere in the definition — `run.md` (and `context.md`'s handoffs) are the only place they exist. `doctor` reads `run.md` as the authoritative "what is this run" anchor to distinguish a legitimately-interrupted `context.md` from one clobbered by a different run.

`run.md` uses these field names, and **`go` (backfill) and `doctor` (Check 1) must use the same ones** — one canonical name per identifier, no synonyms:

- `slug:` — the **flow's** own slug (the definition directory name); set at first run, never overwritten.
- `branch:` — receives a handoff `branch=` value.
- `spec-slug:` — receives a handoff `slug=` value (the resolved **spec** slug from a `spec new`/`spec go` step). Note the handoff token is `slug=` but the recorded field is `spec-slug:` precisely so it is never confused with the flow `slug:` above.
- `worktree:` — receives a handoff `worktree=` value.

Resolve it the same way in every workflow that runs or inspects a flow:

```bash
RUNS_DIR=".codevoyant/runs"          # always local — never under $HOME, even for a global definition
RUN_DIR="$RUNS_DIR/{slug}"           # {slug} is the resolved definition's directory name
```

- `{slug}` is the directory name of the resolved definition (from `FLOW_DIR`), so the run instance is stable whether the definition was found locally or globally.
- Step **implementations** are always read from the definition (`FLOW_DIR/implementation/step-N.md`), never copied into the run instance — only the checklist (`progress.md`) and the handoff log (`context.md`) are instance-local.
- Create on demand: `mkdir -p "$RUN_DIR"` (safe if it already exists).
- A run instance whose **definition is global** is expected and normal — it is not corruption or drift.
