# annotations — the shared annotation contract

One annotation syntax works across the spec and docs skills. An annotation is an HTML comment a human writes directly in a plan file (spec) or a doc file (docs). It never collides with real markdown blockquotes.

## Marker forms

The named forms are aliases on top of the legacy two-form system. The mapping is:

- `<!-- @edit: instruction -->` — a concrete change applied to the attached block. It maps to the **minor** `<!-- > … -->` mechanism: a standalone comment whose instruction applies to the block immediately below it.
- `<!-- @agent: guidance -->` — guidance for the authoring agent. It has **no mechanical effect** and never produces a line-level edit; it constrains how the agent authors the block below (docs) or plans the phase (spec). It has no legacy equivalent.
- `<!-- @user: hint -->` — a hint or open question left for the **human**, not the agent. No agent processes or deletes it; the user resolves it (a decision, a confirmation, a follow-up) and then removes the marker. `@user` is the explicit human-facing form for decisions the scaffold/retcon currently leaves as `<!-- TODO: ... -->`; a workflow may leave `@user` in place of a TODO when it wants the human's decision called out explicitly.
- `content <!-- >> instruction -->` — the **major** inline form is the line-level edit: an inline suffix applying to that specific line. It has no `@`-named alias; write it as the bare `<!-- >>` form.

## Where they work

- **spec** — write annotations in `plan.md` and `implementation/phase-*.md`. Run `/spec update <plan>` to apply them. `@edit` is the minor `<!-- > … -->` annotation; `@agent` is guidance with no mechanical effect.
- **docs** — write annotations in any doc under `docs/` (or a scaffolded template). Run `/docs update` to apply them. `@agent` is the same marker retcon fills in templates; `@edit` requests a specific rewrite.

## Scanning order

An update agent scans `<!-- @edit` (concrete edits) before `<!-- @agent` (guidance), so an edit request wins over general guidance on the same line. A bare `>` line is a blockquote, not an annotation. `<!-- @user` markers are never agent-processed — an agent leaves them in place for the human.

## Never in committed prose

Annotations are author-time only. The authoring/update agent deletes each `@agent`/`@edit` marker after applying it; no annotation survives into a finished doc or an executed plan. `@user` is the exception: it persists until the human resolves it and removes it.
