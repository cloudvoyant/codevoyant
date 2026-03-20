---
description: "Use when planning architecture for a project or feature. Triggers on:
  \"dev plan\", \"architecture plan\", \"plan architecture\", \"design architecture\",
  \"technical design\", \"system design for\". Produces docs/architecture/README.md
  (system overview) and docs/architecture/{feature}.md (feature-specific)."
argument-hint: "[feature-name|description] [--update-overview] [--bg] [--silent]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: claude-opus-4-6
---

Plan software architecture for a project or feature. Writes to `docs/architecture/`.

## Step 0: Parse Args

Extract:
- `FEATURE_NAME` = first non-flag argument (slugify for filename)
- `UPDATE_OVERVIEW = true` if `--update-overview` present (always updates README.md)
- `BG_MODE`, `SILENT` as standard

If no `FEATURE_NAME`: ask "What are we designing architecture for?" (free text).

Derive:
- `FEATURE_SLUG` = lowercase, hyphens (e.g. "auth refresh flow" → "auth-refresh-flow")
- `FEATURE_FILE = docs/architecture/{FEATURE_SLUG}.md`
- `OVERVIEW_FILE = docs/architecture/README.md`

Create output dir:
```bash
mkdir -p docs/architecture/
```

## Step 0.5: System Audit

```bash
git log --oneline -10
ls docs/architecture/ 2>/dev/null || echo "(no architecture docs yet)"
```

If `OVERVIEW_FILE` exists, read it — use as context so the feature doc doesn't duplicate the overview.

## Step 1: Gather Design Context

Ask:
1. "What scope are we designing?" — options: New feature | Refactor existing system | Cross-cutting concern (auth, logging, etc.) | Greenfield project
2. "What do you know about the design already?" — free text; may be empty ("I need you to research and propose")
3. "Confidence level?" — Already decided (document it) | Exploring options | Spike needed (too many unknowns)

## Step 2: Parallel Research

Launch two background agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

**Agent R1 — Codebase Scan:** Glob/Grep for files, patterns, and systems relevant to this feature. Note existing architecture decisions, naming conventions, and test coverage. Return structured findings.

**Agent R2 — Existing Architecture Docs:** Read all files in `docs/architecture/`. Identify: what the current system looks like, what decisions are already recorded, what this feature touches. Flag gaps or contradictions with proposed design.

Wait for both agents. Synthesize: highlight what's new vs. what integrates with existing decisions.

## Step 3: Architecture Design

Based on context and research, produce the architecture document content:

### Sections (required):

**Context** — what system/feature this is in, why now

**Design Decision** — the architectural choice made (or top 2-3 options if exploring). For each option: trade-offs, complexity, reversibility.

**Data Model** — entities, relationships, storage. ASCII diagram if schema is non-trivial.

**System Boundaries** — what this feature owns vs. delegates. ASCII component diagram:
```
+------------------+    +------------------+
|  This feature    |--->|  Dependency A    |
+------------------+    +------------------+
        |
        v
+------------------+
|  Storage / Queue |
+------------------+
```

**API Surface** — new or modified interfaces (method, path/name, request/response shape). Mark N/A if internal only.

**Key Decisions** — table of one-way vs two-way doors:
| Decision | Type | Rationale |
|---|---|---|
| {decision} | ONE-WAY (!) / TWO-WAY | {why this path} |

**Failure Modes** — top 3 ways this can fail, with mitigation:
| Failure | Trigger | Mitigation |
|---|---|---|
| {class} | {condition} | {rescue action} |

**Open Questions** — unknowns that need resolution before implementation starts

**Out of Scope** — explicitly deferred design concerns

### Design principles:
- Boring by Default: name any existing library or pattern that could be reused instead of building
- If a section is unknown: write `[spike needed]`, not omit it
- Decisions table: every one-way door must have a rationale

## Step 4: Confirmation

Show a one-paragraph summary of the design. AskUserQuestion:
```
question: "Does this architecture look right?"
header: "Design Review"
options:
  - label: "Looks good — write the docs"
    description: "Write feature doc and update overview"
  - label: "Revise the design"
    description: "I'll describe what to change"
  - label: "Mark as exploratory"
    description: "Write as a proposal, not a decision"
```

Loop on revisions until "Looks good" or "Mark as exploratory".

## Step 5: Write Feature Doc

Write `{FEATURE_FILE}` using the template at `references/feature-architecture-template.md`.

If "Mark as exploratory": prepend `> **Status: Proposal** — not yet decided` to the doc.

## Step 6: Update Overview

If `docs/architecture/README.md` does not exist OR `--update-overview` was passed:
- Read existing overview (if any)
- Add or update the entry for this feature in the component list
- Write updated `docs/architecture/README.md` using `references/architecture-overview-template.md`

If README.md exists and `--update-overview` was NOT passed, ask:
```
AskUserQuestion:
  question: "Update the architecture overview (README.md)?"
  header: "Overview"
  options:
    - label: "Yes — add this feature to the overview"
    - label: "No — feature doc only"
```

## Step 7: Report + Notify

Report:
```
Architecture docs written:
  {FEATURE_FILE}
  {OVERVIEW_FILE (if updated)}
```

If `BG_MODE=true` and `SILENT=false`:
```bash
npx @codevoyant/agent-kit notify --title "dev:plan complete" --message "Architecture doc written: {FEATURE_FILE}"
```
