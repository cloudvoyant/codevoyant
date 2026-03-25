# Feature Architecture Template

Use for `docs/architecture/{feature-slug}.md`.
If a section is unknown, write `[spike needed]` — never omit it.

---

# {Feature Name} Architecture

**Status:** decided | proposal | spike-needed
**Updated:** {YYYY-MM-DD}
**Author:** {name or team}

## Context
{What system/feature this is in, why it was designed or reconsidered}

## Design Decision
{The chosen architecture. If exploring: options listed with trade-offs.}

## Data Model
{Entities, relationships, storage. ASCII diagram if non-trivial.}

## System Boundaries
```
+------------------+    +-------------------+
|  This feature    |--->|  Dependency       |
+------------------+    +-------------------+
```

## API Surface
{New or modified interfaces. Method, path/name, request/response shape. N/A if internal only.}

## Key Decisions

| Decision | Type | Rationale |
|---|---|---|
| {decision} | ONE-WAY (!) / TWO-WAY | {why} |

## Failure Modes

| Failure | Trigger | Mitigation |
|---|---|---|
| {class} | {condition} | {rescue action} |

## Open Questions
- {unknown that needs resolving}

## Out of Scope
- {explicitly deferred concern}
