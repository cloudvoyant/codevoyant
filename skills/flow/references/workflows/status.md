# Workflow: flow status

Print the current checklist state of a named flow.

## Step 0: Parse arguments

```
--global / -g → look under ~/.codevoyant/flows (see references/flow-dir.md)
FLOW_NAME = first non-flag positional arg (required)
```

If `FLOW_NAME` is missing, error: "Usage: /flow status <name> [--global]. A flow name is required."

Resolve the **definition** `FLOW_DIR` per `references/flow-dir.md` (local-first, then global; `--global` forces global). If not found in any scope, error: "Flow '{FLOW_NAME}' not found (looked in local and global). Run /flow new {FLOW_NAME} first."

Then resolve the **run instance** per `references/flow-dir.md` → *Run instance* (always local). Run instances live **flat under `.codevoyant/flows/`**, beside the definitions, each named `{flow-slug}-{plan-slug}` (one per run); `status` reports the **most recent** one. Because `.codevoyant/flows/` mixes definitions and instances — and one flow slug can be a hyphen-prefix of another (`auto` vs `auto-review`) — discovery must **not** trust the `{flow-slug}-*` glob alone. Two filters (see `references/flow-dir.md` → *Resolving / discovering instances*): a candidate must (1) contain a `progress.md` (definitions hold `flow.md`, so they're excluded), and (2) have a `run.md` recording `slug: {flow-slug}` (rejects a hyphen-prefixed neighbour's instances). Also treat a legacy `.codevoyant/runs/{flow-slug}/progress.md` sitting directly under the original run-state dir as a candidate. Pick the newest by mtime and set `RUN_DIR` to it:

```bash
FLOW_STATE_ROOT=".codevoyant/flows"              # instances live flat here, beside definitions
LEGACY_RUNS_DIR=".codevoyant/runs/{flow-slug}"   # legacy: original pre-PR run-state root
RUN_DIR=""
newest=0
# legacy: progress.md directly under the original .codevoyant/runs/{flow-slug}/ dir
[ -f "$LEGACY_RUNS_DIR/progress.md" ] && { RUN_DIR="$LEGACY_RUNS_DIR"; newest=$(stat -f %m "$LEGACY_RUNS_DIR/progress.md" 2>/dev/null || stat -c %Y "$LEGACY_RUNS_DIR/progress.md"); }
# instances: flat {flow-slug}-* dirs holding progress.md whose run.md slug == {flow-slug}
for d in "$FLOW_STATE_ROOT"/{flow-slug}-*/; do
  [ -f "$d/progress.md" ] || continue                                          # excludes definitions
  [ "$(sed -n 's/^slug: *//p' "$d/run.md" 2>/dev/null)" = "{flow-slug}" ] || continue   # excludes prefix-colliding flows
  m=$(stat -f %m "$d/progress.md" 2>/dev/null || stat -c %Y "$d/progress.md")
  [ "$m" -ge "$newest" ] && { newest=$m; RUN_DIR="${d%/}"; }
done
```

If `RUN_DIR` is empty (no matching instance found), the flow has not been run locally and status reflects the definition (all steps pending).

## Step 1: Read and display flow state

Read the **definition** `FLOW_DIR/flow.md` for the title, scope, and Parameters. For the live checklist and Status, prefer the **run instance**:

- If `RUN_DIR` is set (a `progress.md` was found) → read the **Steps checklist** and **Status** from `RUN_DIR/progress.md` (this is the most recent run's progress). Note `(run instance: {RUN_DIR})` in the output so the user sees which run — e.g. `.codevoyant/flows/autospec-add-oauth-login` or a provisional `.codevoyant/flows/autospec-_pending-…`.
- Otherwise → read the checklist and Status from the definition `FLOW_DIR/flow.md` (all steps pending; the flow has not been run locally).

Extract and print:

1. **Flow title** (from the definition's `# Flow: {TITLE}` heading)
2. **Scope** (local or global — the definition's resolved location / Metadata)
3. **Status** (from the run instance if present, else the definition's Metadata)
4. **Parameters** (from the definition's Parameters section, if any)
5. **Steps checklist** — print each step line as-is from the chosen source, preserving `[ ]` or `[x]` markers and any `{{placeholders}}`

Then print a summary line:

```
{done}/{total} steps complete
```

Where `done` = count of `[x]` lines, `total` = total step lines.

## Example output

```
Flow: ship-feature
Scope: global
Status: Active
Parameters: {{input}} — the feature to ship

1. [x] /spec new {{input}}
2. [x] /spec go
3. [ ] /git commit
4. [ ] /pr open

2/4 steps complete
```
