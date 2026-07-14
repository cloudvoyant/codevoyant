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

All mutable run-state lives in a **run instance**, which is **always local to the current project**, regardless of whether the definition is local or global. Run instances live **flat under `.codevoyant/flows/`** — the *same* directory that holds flow **definitions** — with each instance named `{flow-slug}-{plan-slug}`. So instances and definitions are **siblings**: a definition is `.codevoyant/flows/{flow-slug}/` (holds `flow.md` + `implementation/`), while a run instance is `.codevoyant/flows/{flow-slug}-{plan-slug}/` (holds `run.md` + `progress.md` + `context.md`). They are told apart by **content**, not name (see *Resolving / discovering instances* below):

```
.codevoyant/flows/{flow-slug}-{plan-slug}/
  run.md         # this run's resolved identity (flow slug, definition, branch/spec-slug/worktree) — written at go start
  progress.md    # a copy of the definition's Steps checklist; the ONLY place [ ] → [x] is flipped
  context.md     # the accumulating handoff log (persisted for resume)
  archive/       # prior completed instances that shared this same {plan-slug}
```

`{flow-slug}` is the resolved definition's directory name. `{plan-slug}` is the run's resolved **spec-plan slug** — the value this run's step-1 `/spec new` produces and hands off as `slug=`. If a flow ever produces no plan slug, fall back to the run's **branch slug** — hence the name is "{flow-slug}-{branch-or-plan-slug}". Sanitize the slug the same way the plan/branch naming already does (lowercase, hyphens). Spec plans live at `.codevoyant/plans/{name}/` while a flow's runs live at `.codevoyant/flows/{flow-slug}-{name}/` — so a spec plan and a flow run may share the same `{name}` without colliding. Because each instance dir carries the `{plan-slug}` in its name, **two concurrent runs of the same flow that resolve different plan slugs never share `progress.md`/`context.md`/`run.md`** — the collision that a single flow-slug-keyed directory caused is gone.

**Naming-collision edge case (documented, not guarded).** Because instances (`{flow-slug}-{plan-slug}`) sit beside definitions (`{flow-slug}`) in `.codevoyant/flows/`, an instance directory could *in theory* collide with a **local flow definition literally named `{flow-slug}-{plan-slug}`** (e.g. a flow whose slug is `autospec-my-feature`). This is a documented edge case, not a guarded one: definitions contain `flow.md` and instances contain `progress.md` + a `run.md` whose `slug:` field is the flow's own slug, so the two are always distinguishable by **content**. Discovery below relies on that content distinction rather than the name alone, so no heavy guard is needed.

### Bootstrapping: provisional id, then adopt to the plan-slug

The plan slug does not exist until step 1 (`/spec new`) has run, but the instance (`progress.md`, `run.md`) must exist from the very start of `go`. Reconcile this with a **provisional-then-adopt** scheme:

1. **At run start**, `go` mints a start timestamp `RUN_ID` and seeds the instance under a provisional directory. The provisional is **namespaced by flow-slug** (`{flow-slug}-_pending-{RUN_ID}`) so it is discoverable as this flow's instance and never collides with another flow's provisional:
   ```bash
   FLOW_STATE_ROOT=".codevoyant/flows"          # always local — never under $HOME, even for a global definition
   RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"          # unique per run, sortable
   RUN_DIR="$FLOW_STATE_ROOT/{flow-slug}-_pending-$RUN_ID"   # provisional instance dir, namespaced by flow-slug
   mkdir -p "$RUN_DIR"
   ```
   `run.md` records `instance: {flow-slug}-_pending-{RUN_ID}` and `adopted: false` — these fields track *this* run's actual directory, so they hold `…-_pending-…`/`false` only for a fresh provisional run. A **completed → re-seed** re-seeds in place under an already-adopted `{flow-slug}-{plan-slug}/` (or legacy `.codevoyant/runs/{flow-slug}/`) dir, so it writes `instance: {basename}` / `adopted: true` instead — it keeps the identity it already earned, and step 2's adoption below is a no-op for it (see go.md Step 1).
2. **On the first handoff that resolves a concrete `slug=`** (the spec-plan slug — the same value that fills `spec-slug:`), `go` **adopts** the instance: it renames the provisional directory to `{flow-slug}-{plan-slug}/` (using that spec slug) and flips `adopted: true`. Two guards keep this correct:
   - **Already adopted → no-op.** Adoption only runs while `adopted: false`. A run that is already adopted (a normal run past its first `slug=`, or an in-place re-seed that started adopted) skips the move — in particular when `TARGET_DIR` *is* this run's own current `RUN_DIR`, that is already-adopted, not a collision.
   - **Atomic claim (no TOCTOU).** Do not `[ ! -e "$TARGET_DIR" ]` then `mv`: a concurrent run could create `TARGET_DIR` in between and `mv` would then nest the provisional dir *inside* it. Claim the slug atomically with `mkdir "$TARGET_DIR"` (fails iff it already exists) and only move the provisional contents in on a successful claim:
   ```bash
   PLAN_SLUG="{resolved spec slug}"
   TARGET_DIR="$FLOW_STATE_ROOT/{flow-slug}-$PLAN_SLUG"
   if [ "$(sed -n 's/^adopted: *//p' "$RUN_DIR/run.md")" = "true" ]; then
     :                                             # already adopted — no move
   elif mkdir "$TARGET_DIR" 2>/dev/null; then      # atomic claim: succeeds iff TARGET_DIR did not exist
     mv "$RUN_DIR"/* "$RUN_DIR"/.[!.]* "$TARGET_DIR"/ 2>/dev/null   # move contents (incl. dotfiles)
     rmdir "$RUN_DIR" 2>/dev/null
     RUN_DIR="$TARGET_DIR"                          # adopt; update RUN_DIR for the rest of the run
   fi
   ```
   If the claim is lost — `mkdir` fails because `TARGET_DIR` already exists (a prior/other run of the same flow already claimed that plan slug) — **do not overwrite it**: keep the provisional name, leave `adopted: false`, and note it: `ℹ Kept provisional run dir '{flow-slug}-_pending-{RUN_ID}' — '{flow-slug}-{plan-slug}' already exists (not clobbering).` Preserving is mandatory: overwriting is exactly the bug this layout fixes.
3. A run that **never** resolves a spec slug simply lives out its life under `{flow-slug}-_pending-{RUN_ID}/`. That is still collision-free because `RUN_ID` is unique per run.

Adoption happens **once** — only while `adopted: false`. After adoption, `RUN_DIR` points at `{flow-slug}-{plan-slug}/` for the remainder of the run and on every resume (see below).

### Identity record (`run.md`)

`run.md` is the run instance's **identity record**. Because the definition and `progress.md` only ever hold `{{placeholders}}`, the resolved branch / spec-slug / worktree of a real run live nowhere in the definition — `run.md` (and `context.md`'s handoffs) are the only place they exist. `doctor` reads `run.md` as the authoritative "what is this run" anchor to distinguish a legitimately-interrupted `context.md` from one clobbered by a different run.

`run.md` uses these field names, and **`go` (backfill) and `doctor` (Check 1) must use the same ones** — one canonical name per identifier, no synonyms:

- `slug:` — the **flow's** own slug (the definition directory name); set at first run, never overwritten. This is the **authoritative discovery filter**: `status`/`doctor` confirm a candidate instance really belongs to flow `X` by checking its `run.md` has `slug: X` (see *Resolving / discovering instances*).
- `instance:` — the current instance directory **basename** under `.codevoyant/flows/` (`{flow-slug}-_pending-{RUN_ID}` before adoption, `{flow-slug}-{plan-slug}` after). Lets `doctor`/`status` confirm which directory a `run.md` belongs to.
- `adopted:` — `false` until the provisional dir has been renamed to `{flow-slug}-{plan-slug}`, then `true`.
- `branch:` — receives a handoff `branch=` value.
- `spec-slug:` — receives a handoff `slug=` value (the resolved **spec** slug from a `spec new`/`spec go` step). Note the handoff token is `slug=` but the recorded field is `spec-slug:` precisely so it is never confused with the flow `slug:` above. This is the same value used as the `{plan-slug}` in the adopted `{flow-slug}-{plan-slug}/` directory name.
- `worktree:` — receives a handoff `worktree=` value.

### Resolving / discovering instances

The run instance is **always local**, whether the definition is local or global. There are two access patterns:

- **`go` creating or resuming a run** uses the bootstrap scheme above: on a fresh run it mints `{flow-slug}-_pending-{RUN_ID}`; on a **resume** it must reattach to the same run's directory rather than mint a new one — locate the existing instance (the adopted `{flow-slug}-{plan-slug}/` if it exists, else the newest `{flow-slug}-_pending-*/`) that is not `Complete`, and set `RUN_DIR` to it. **Pre-adoption resume is best-effort by recency:** with several non-`Complete` `{flow-slug}-_pending-*/` dirs and no plan slug yet to key on, newest-mtime may reattach to the wrong provisional run. When the invocation carries identifying params (`--set`/input or `--branch`), prefer the provisional whose `run.md`/`context.md` matches; otherwise use newest-mtime and surface the ambiguity (see go.md Step 0.5).
- **`status`/`doctor` discovering instances — CRITICAL disambiguation.** `.codevoyant/flows/` mixes definitions and instances, and one flow slug can be a hyphen-prefix of another (e.g. `auto` vs `auto-review`). So discovery must **not** rely on the `{flow-slug}-*` name glob alone. Two filters, applied in order:
  1. **Content filter — must be an instance, not a definition.** Candidate = an entry under `.codevoyant/flows/` matching `{flow-slug}-*` that contains a `progress.md`. Definition dirs contain `flow.md`, not `progress.md`, so they are excluded automatically.
  2. **Authoritative slug filter — must belong to *this* flow.** Confirm each candidate's `run.md` records `slug: {flow-slug}` (the flow's own slug field). This rejects `auto-review-{plan}/` instances when discovering flow `auto` — the glob `auto-*` would match `auto-review-…` but its `run.md` says `slug: auto-review`, not `slug: auto`, so it is filtered out.

  ```bash
  # every instance directory of flow {flow-slug} = an immediate {flow-slug}-* dir that
  # (1) has a progress.md (so it's an instance, not a definition), AND
  # (2) whose run.md records slug: {flow-slug} (so it's THIS flow, not a hyphen-prefixed neighbour)
  for d in "$FLOW_STATE_ROOT"/{flow-slug}-*/; do
    [ -f "$d/progress.md" ] || continue                                   # excludes definitions (they hold flow.md)
    [ "$(sed -n 's/^slug: *//p' "$d/run.md" 2>/dev/null)" = "{flow-slug}" ] || continue  # excludes prefix-colliding flows
    echo "$d"
  done
  ```
  A provisional `{flow-slug}-_pending-{RUN_ID}/` is also an instance (it has `progress.md` and a `run.md` with `slug: {flow-slug}`). `status` picks the **newest** matching directory by mtime (the current run); `doctor` inspects **every** one.

### Back-compat with legacy `.codevoyant/runs/{flow-slug}/` instances

The **original** pre-PR layout put the state files **directly** under `.codevoyant/runs/{flow-slug}/` (a single dir keyed by flow-slug only, no plan subdir). Treat that as a valid **legacy instance**: if `.codevoyant/runs/{flow-slug}/progress.md` exists directly (not in a subdir), discovery must include `.codevoyant/runs/{flow-slug}/` itself as an instance so `status`/`doctor` still find and report it (clearly labeled legacy) — never crash on it. `go` leaves legacy instances untouched and always creates *new* runs under the `.codevoyant/flows/{flow-slug}-…` provisional/adopted scheme; there is no automatic migration. (The unreleased intermediate layouts have no back-compat and leave no references.)

### Invariants

- `{flow-slug}` is the directory name of the resolved definition (from `FLOW_DIR`), so instances are named stably whether the definition was found locally or globally.
- Step **implementations** are always read from the definition (`FLOW_DIR/implementation/step-N.md`), never copied into the run instance — only the checklist (`progress.md`) and the handoff log (`context.md`) are instance-local.
- Create directories on demand with `mkdir -p` (safe if they already exist).
- A run instance whose **definition is global** is expected and normal — it is not corruption or drift.
