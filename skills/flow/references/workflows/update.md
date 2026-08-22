# Workflow: flow update

Edit an existing flow definition — `flow.md` and/or its `implementation/step-N.md` files — from either:

- `<!-- > … -->` / `<!-- >> … -->` **annotations** you added inline to the definition files, or
- a **chat instruction** describing the change in plain language ("add a step that runs /pr review", "drop step 2", "bake --branch feature/x into every step").

Then validate the edited definition with `/flow doctor`. This is the edit loop for flow definitions — the same annotation convention as `/spec update`, `/pr update`, and `/ed update`.

- **Markdown output: soft-wrap prose, never hard-wrap** — when this workflow writes a `.md` artifact, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

## Step 0: Parse arguments

```
--global / -g    → target the flow in ~/.codevoyant/flows (see references/flow-dir.md)
FLOW_NAME        = first non-flag positional arg (required)
INSTRUCTION      = remaining positional text (optional — a plain-language change request)
--target <file>  = restrict edits to one definition file, e.g. flow.md or implementation/step-2.md (optional)
```

If `FLOW_NAME` is missing, error: "Usage: /flow update <name> ['change request'] [--target <file>] [--global]. A flow name is required."

## Step 1: Resolve the flow

Resolve `FLOW_DIR` per `references/flow-dir.md` (local-first, then global; `--global` forces global). If not found in any scope, error: "Flow '{FLOW_NAME}' not found (looked in local and global). Run /flow new {FLOW_NAME} first."

If `--target` was given, resolve the target file relative to `FLOW_DIR` and verify it exists; if it does not, error: `✗ {target} not found under {FLOW_DIR}.`

## Step 2: Collect the edits

1. **Annotations** — scan the definition files (or the `--target` file) for HTML-comment annotations, checking for `<!-- >>` (major: add, expand, rewrite) **before** `<!-- >` (minor: fix, rephrase, tighten). The instruction is the text between the marker and the closing `-->`; multi-line comments are allowed. A bare `>` line is an ordinary blockquote, **not** an annotation — leave it alone.
2. **Chat instruction** — if `INSTRUCTION` is non-empty, treat it as an additional change request over the whole definition (or the `--target` file).

If there are no annotations and no instruction: `Nothing to update — add <!-- > … --> / <!-- >> … --> notes to {FLOW_DIR}/flow.md, or pass a change request: /flow update {FLOW_NAME} "…".` and exit.

## Step 3: Apply the edits

Launch the **flow-updater** agent (`agents/flow-updater.md`) via the Agent tool with `subagent_type: flow-updater`, `model-tier: standard`, `run_in_background: false`, substituting:

- `{FLOW_NAME}` — the flow slug
- `{FLOW_DIR}` — the resolved definition directory
- `{TARGET}` — the `--target` file (or "all files")
- `{INSTRUCTION}` — the chat change request (or "(none)")
- `{ANNOTATIONS}` — the list of `file:line` annotation locations found in Step 2 (or "(none)")

The agent applies every edit, removes consumed annotations, propagates changes across `flow.md` ↔ `implementation/step-N.md` (the Two-File Contract), preserves `{{placeholders}}` and baked flags verbatim, and reports applied/skipped. Wait for it to finish.

## Step 4: Validate

Run `/flow doctor {FLOW_NAME} [--global]` (diagnose only, no `--fix`). Confirm the definition passes the checks (step-file drift, schema drift, placeholder coherence). If doctor reports FAILs, fix them before reporting done. Report the doctor summary.

## Step 5: Report

```
✓ Updated flow '{FLOW_NAME}' ({scope}).

  Changes applied:
    {file}:{line} — {description}
    ...

  Validation: /flow doctor {FLOW_NAME} — {PASS | N issue(s)}
```

If any annotations were skipped, list them with reasons.
