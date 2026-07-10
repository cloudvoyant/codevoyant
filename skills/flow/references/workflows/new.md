# Workflow: flow new

Create a new named flow — a `{flows-dir}/{slug}/flow.md` checklist plus one `implementation/step-N.md` agent-prompt file per step. Stored locally by default, or under `~/.codevoyant/flows` with `--global`.

## Step 0: Parse arguments

```
--global / -g     → store under ~/.codevoyant/flows (see references/flow-dir.md); else local .codevoyant/flows
--branch, etc.    → any other flag → PASSTHROUGH_FLAGS (see references/flow-dir.md); after dropping --set → BAKED_FLAGS, baked onto every step command
FLOW_NAME         = first positional arg (POSITIONALS[0]; required; error if missing)
STEPS             = remaining positionals (POSITIONALS[1..]; each is one step command string)
```

Resolve `FLOWS_DIR` and parse flags per `references/flow-dir.md`, iterating the **preserved argv** (`"$@"`) the dispatcher forwarded — never re-split a flattened string, or multi-word step commands and quoted values are corrupted. Parsing sets `GLOBAL`, fills `PASSTHROUGH_FLAGS` with every non-flow-control flag (e.g. `--branch feature/x`), and leaves the flow name + step strings in `POSITIONALS` (each step is one element). Read `FLOW_NAME`/`STEPS` from `POSITIONALS`.

**Drop `--set` from the flags `new` bakes.** `--set key=value` is a `go`-time parameter binding, not a step flag — appending it to a stored step (like `--branch`) is never intended. Before using `PASSTHROUGH_FLAGS` below, remove any `--set` element and its following `key=value` value element, so only real forwarded flags (e.g. `--branch feature/x`) get baked in. Call the filtered result `BAKED_FLAGS`.

If `FLOW_NAME` is missing, error: "Usage: /flow new <name> [steps...] [--global]. A flow name is required."

If `STEPS` is empty, prompt the user:

```
Enter each step as a skill command. One per line. Empty line = done.
Example:
  /dev explore "how to build X"
  /spec new "plan it"
  /spec go
  /dev explore "review the code"
```

Collect lines until an empty line is entered. Each non-empty line is one step command.

If still no steps after prompting, error: "A flow must have at least one step."

## Step 1: Resolve slug and create directory

- `slug` = `FLOW_NAME` lowercased, spaces replaced with hyphens
- `FLOW_DIR = {FLOWS_DIR}/{slug}/` (global if `--global`, else local — from Step 0)
- If `--global`, first `mkdir -p "$HOME/.codevoyant/flows"`.
- If `FLOW_DIR/flow.md` already exists: ask "Flow '{slug}' already exists in {scope}. Replace it or cancel? (replace/cancel)"
  - If cancel: exit without changes.
  - If replace: proceed (overwrite all files).
- Create `FLOW_DIR/` and `FLOW_DIR/implementation/` directories.

## Step 1.5: Detect parameters

Scan every step command for `{{placeholder}}` tokens (double-brace, e.g. `{{feature}}`, `{{input}}`). Collect the unique set as `PARAMS`.

- `{{input}}` is the conventional default parameter — the bare text a user passes to `/flow go <name> <text>`. If any step uses `{{input}}`, keep it first in the list.
- These are recorded in flow.md so users know what to supply at run time. They are **not** resolved now — they are filled in at `/flow go` time (see `go.md`).

## Step 1.6: Make steps flow-safe (author for chaining)

Steps run as subagents at `go` time and **cannot prompt the user**, so write each step to run without interaction:

- **Pass each step's input inline or as a `{{param}}`.** A step that would otherwise ask (e.g. `/spec new` with no objective, or `/dev explore` with no topic) should carry its input in the command — give distinct steps distinct params (`/dev explore {{topic}}`, `/spec new {{objective}}`), not one shared `{{input}}`, when they need different values.
- **Avoid step forms that pause.** A bare-name `/spec new {{name}}` scaffolds an intent file and stops — use a descriptive objective (or an intent already filled) instead.
- **Chain producer → consumer explicitly.** When one step produces an artifact the next consumes (e.g. `/dev explore` writes `.codevoyant/explore/{slug}/`, then `/spec new` should plan *from* it), write the consumer step to consume that artifact — don't rely on the consumer's interactive picker. The producer's artifact path is threaded forward in flow context so the consumer subagent can find it.
- Anything a step still can't resolve at run time surfaces to the user via `NEEDS_INPUT` (see `go.md`) — a fallback, not the plan. If you find yourself relying on it, add a `{{param}}` instead.

## Step 2: Write flow.md

Use `references/flow-template.md` as the template. Fill in:
- `{TITLE}` = `FLOW_NAME` (original casing)
- `{slug}` = computed slug
- `{local|global}` = the scope from Step 0
- `{timestamp}` = current ISO timestamp
- `{Status}` = `Active`
- **Parameters** section: one bullet per token in `PARAMS` (`` - `{{name}}` — {short description you infer from how the step uses it} ``). If `PARAMS` is empty, replace the list with `_none_`.
- Steps checklist: one line per step, numbered, all unchecked `[ ]` — keep `{{placeholders}}` verbatim (do not substitute), and **bake `BAKED_FLAGS` into each step command** when non-empty (see below).

Each step line format:
```
N. [ ] {step-command-string}{ BAKED_FLAGS, space-joined, when non-empty}
```

When `BAKED_FLAGS` is non-empty, append it (space-separated) to every step command as it is written here — e.g. a step `/spec new {{objective}}` created with `--branch feature/x` is written as `1. [ ] /spec new {{objective}} --branch feature/x`. Bake the flags at write time so the stored checklist matches the step files produced in Step 3; do not defer this. (`--set` was already removed from `BAKED_FLAGS` in Step 0.)

Write to `FLOW_DIR/flow.md`.

## Step 3: Write step implementation files

For each step N (1-based), create `FLOW_DIR/implementation/step-N.md` using `references/step-template.md`.

Fill in:
- `{N}` = step number
- `{step-command}` = the step command string, with `{{placeholders}}` left **verbatim** (they are resolved at run time by `go.md`), and with the same `BAKED_FLAGS` appended that Step 2 baked into the flow.md line (e.g. a step `/spec new {{objective}}` created with `--branch feature/x` is stored as `/spec new {{objective}} --branch feature/x`). Use the identical flag string for step N here and in flow.md so the two never diverge. This bakes run-on-a-branch (and any other forwarded flag) into the flow definition.
- `{flow-name}` = slug
- `{total}` = total number of steps
- Leave the `## Parameters` and `## Flow context so far` sections as their template placeholders — `go.md` fills them in at run time.

Because the flags were baked into the flow.md step lines in Step 2 and into the step files here using the same `BAKED_FLAGS` string, the stored checklist and the step files stay in sync — there is nothing left to reconcile afterward.

## Step 4: Report

```
✅ Flow "{slug}" created with {N} steps ({scope}).

  {FLOW_DIR}/flow.md

  Parameters: {comma-separated PARAMS, or "none"}

To run:    /flow go {slug}{ --global if global}{ "<input>" if it has {{input}}}
To review: /flow status {slug}{ --global if global}
To list:   /flow list
```
