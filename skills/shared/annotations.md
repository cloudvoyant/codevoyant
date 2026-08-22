# annotations — the shared annotation contract

One annotation syntax works across the spec and docs skills. An annotation is an HTML comment a human writes directly in a plan file (spec) or a doc file (docs). It never collides with real markdown blockquotes.

## Marker forms

- `<!-- @agent: guidance -->` — guidance for the authoring agent. The agent follows it when filling the block below (docs) or planning the phase (spec). It does not demand a specific edit; it constrains how the agent authors.
- `<!-- @edit: instruction -->` — a concrete change the update agent must apply to the line or block the comment is attached to (inline suffix) or the block immediately below (standalone).

## Where they work

- **spec** — write annotations in `plan.md` and `implementation/phase-*.md`. Run `/spec update <plan>` to apply them. The `@edit` form is equivalent to the minor `<!-- > … -->` annotation; the `@agent` form is guidance the planner/updater must honour.
- **docs** — write annotations in any doc under `docs/` (or a scaffolded template). Run `/docs update` to apply them. `@agent` is the same marker retcon fills in templates; `@edit` requests a specific rewrite.

## Scanning order

An update agent scans `<!-- @edit` (concrete edits) before `<!-- @agent` (guidance), so an edit request wins over general guidance on the same line. A bare `>` line is a blockquote, not an annotation.

## Never in committed prose

Annotations are author-time only. The authoring/update agent deletes each marker after applying it; no annotation survives into a finished doc or an executed plan.
