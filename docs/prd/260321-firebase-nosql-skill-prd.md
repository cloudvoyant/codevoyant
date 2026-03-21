# 260321 Firebase NoSQL Modeling Skill PRD

**Scope:** project
**Product:** Platform / Codevoyant
**Linear:** (none)
**Owner:** Platform team
**Status:** draft
**Updated:** 2026-03-21

```
  Planning → Eng Planning → [Implementation] → Deployment → QA
                                    │
                            [THIS] Firebase NoSQL skill
                            Firestore schema · security rules · indexing
```

## Problem

Claude Code agents working on Firebase-backed features have no skill coverage for data modeling, so every Firestore schema design, security rules file, and index configuration must be authored or reviewed by a human architect before it can be used. This blocks fully autonomous feature development on Firebase-dependent projects and makes the data modeling step the last consistently manual handoff in the pipeline.

## Goals

### Leading Indicators

> Adoption and activation signals — measurable within days/weeks of launch.

- Firebase NoSQL skill invocation rate (sessions that use the skill at least once): from 0 to ≥ 60% of Firebase-related agent sessions by 2026-06-13
  - Source: Roadmap assumption that data modeling is the last unmanned step; if the skill ships, adoption in Firebase sessions should be near-total within the first two weeks
- Skill-produced artifact acceptance rate (agent output accepted without human schema correction): from 0% to ≥ 70% on first attempt by 2026-06-13
  - Source: Acceptance rate on first attempt is the primary proxy for "idiomatic output without human correction" — the stated product goal from the roadmap

### Lagging Indicators

> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.

- Human-absent data modeling sessions (Firebase features shipped with zero schema correction by a human): from 0% to ≥ 50% of Firebase feature completions by 2026-07-31
  - Source: The roadmap's stated goal is that the data modeling step is "unmanned"; this measures whether it is actually unmanned end-to-end, not just skill-invoked
- Recurrence rate (teams that use the skill on a second feature within 30 days): from 0% to ≥ 40% by 2026-07-31
  - Source: Recurrence indicates the skill produced trustworthy output, not just output that was accepted once and then bypassed

## Non-Goals

- Relational or SQL data modeling (out of scope; covered or to be covered by a separate skill)
- Firebase Authentication, Firebase Storage, or Firebase Hosting configuration
- Firebase Realtime Database (RTDB) — this skill covers Firestore only
- Data migration tooling or runtime seeding scripts
- Firestore emulator setup or local development environment configuration
- Cost estimation or quota analysis for Firestore usage
- Automatic schema evolution or migration planning for existing live collections
- Support for any GCP data product other than Firestore (BigQuery, Spanner, etc.)

## Users

Primary: Claude Code agents acting autonomously as software engineers on projects that use Firestore as the primary data store, requiring correct schema design without human review. Secondary: human engineers who invoke the skill directly to generate a starting-point data model and iterate from it.

## Requirements — Functional

**F1** [P0] Collection hierarchy from feature description
Given a feature description or entity list, the skill produces a Firestore collection hierarchy with named collections, document structure (field names, types, and cardinality), and rationale for top-level vs. subcollection placement. Core deliverable; no other requirements are useful without this.

**F2** [P0] Composite index definitions
The skill produces Firestore composite index definitions (in `firestore.indexes.json` format) for all query patterns implied by the feature description. Agents currently emit invalid or missing indexes; this is a common failure mode.

**F3** [P0] Security rules generation
The skill produces Firestore security rules (in `firestore.rules` format) that match the access patterns described in the feature, using role or UID-based rules as appropriate. Security rules are always required; omitting them blocks deployment.

**F4** [P1] Denormalization recommendations
The skill surfaces a denormalization recommendation when a query pattern cannot be served efficiently by normalized collections alone, explaining the trade-off. Firebase NoSQL idiom; agents trained on relational patterns frequently miss this.

**F5** [P1] Document size risk flagging
The skill flags document size risk (approaching the 1 MiB Firestore document limit) when the proposed schema contains unbounded array or map fields. Scaling anti-pattern; should be caught at design time, not in production.

**F6** [P1] Extraction from mise-gcp-templates
The skill extracts and formalizes artifacts from `mise-gcp-templates` as its canonical reference examples, rather than synthesizing examples from scratch. Roadmap explicitly states extraction-first; net-new synthesis risks non-idiomatic output.

**F7** [P2] Diff-style recommendations on existing schemas
The skill accepts an optional existing schema as input and produces a diff-style recommendation (what to change and why) rather than always generating from scratch. Supports iteration workflows; not required for initial ship.

**F8** [P2] Human-readable modeling summary
The skill outputs a summary of modeling decisions and trade-offs in a human-readable section alongside the generated artifacts. Improves auditability for human-in-the-loop review without requiring it.

## Requirements — Non-Functional

**NF1** Skill latency
Target: ≤ 30 seconds at p95 for a feature description of ≤ 500 words (time from invocation to first artifact output).

**NF2** Output validity — indexes
Target: 100% of outputs on the standard test fixture set. Generated `firestore.indexes.json` must parse and pass `firebase deploy --only firestore:indexes --dry-run` without error.

**NF3** Output validity — security rules
Target: ≥ 95% of outputs on the standard test fixture set. Generated `firestore.rules` must pass `firebase emulators:exec --only firestore` rule evaluation for the access patterns described.

**NF4** Zero-interaction invocability
Target: Verified by automated harness run with no human turn in the transcript. Skill must be invocable by an agent without any human prompt beyond the feature description (zero required interactive questions).

**NF5** Versioned template references
Target: Verified by code review at merge. Extracted `mise-gcp-templates` artifacts must be versioned and referenced by a pinned path, not inlined, so updates to templates propagate automatically.

## Acceptance Criteria

- [ ] Given a feature description for a multi-entity Firebase feature (e.g., a task management app with users, projects, and tasks), the skill produces a valid `firestore.indexes.json` that passes a dry-run deploy against a Firebase project without modification
- [ ] Given the same feature description, the skill produces `firestore.rules` that correctly enforces at minimum: authenticated-only reads, owner-only writes, and a role-based exception — as validated by the Firebase Rules Playground or emulator
- [ ] The skill produces a Firestore collection hierarchy with document field types for all entities in the feature description, and the hierarchy matches Firebase idiomatic patterns (subcollections for one-to-many relationships that require independent querying)
- [ ] When a feature description includes an unbounded list (e.g., "a post can have unlimited comments"), the skill flags the document size risk and recommends a subcollection instead of an array field
- [ ] When a feature description implies a query pattern that requires a composite index, the composite index appears in the generated `firestore.indexes.json`
- [ ] The skill runs to completion in an automated agent session with no human turn beyond the initial feature description input, producing all three artifact types (schema, indexes, rules)
- [ ] All generated artifacts are derived from or validated against extracted `mise-gcp-templates` Firebase examples, and the extraction source is documented in the skill's reference directory
- [ ] A regression test fixture (feature description → expected outputs) is added to the skill test suite and passes on the CI harness

## Open Questions

**Q1** Which specific Firebase artifacts exist in `mise-gcp-templates` and are they production-quality enough to use as canonical references?
Owner: Engineering | Due: 2026-04-04 (Week 3)

**Q2** What is the target modeling workflow scope for v1: schema design only, or schema + seeding + migration? (Roadmap notes this is unresolved)
Owner: PM | Due: 2026-04-11 (Week 5)

**Q3** Is there an existing Firebase rules validation tool that can run headlessly in CI, or do we need to instrument the Firebase emulator?
Owner: Engineering | Due: 2026-04-11 (Week 5)

**Q4** If `mise-gcp-templates` extraction is harder than expected (the stated slip risk), what is the minimum viable artifact set to ship a useful v1 skill?
Owner: PM + Engineering | Due: 2026-04-11 (Week 5)

**Q5** Does the skill need to support both Firestore Native mode and Datastore mode, or Native only?
Owner: Engineering | Due: 2026-04-04 (Week 3)

## Dependencies

- `mise-gcp-templates` repository: must be accessible and contain extractable Firebase Firestore artifacts (collection templates, security rules examples, index patterns); this is gated — the Phase 2 roadmap extraction question (due Week 3) must resolve before implementation begins
- Skills solidification (Phase 1): the skill framework itself must be stable before a new skill can be reliably built on top of it; Phase 1 completion gates Phase 2 Firebase work
- Firebase CLI / emulator tooling: required for NF2 and NF3 acceptance criteria validation in CI; must be available in the CI environment
- Platform engineering skill (Phase 2, same phase): Firebase deployment configuration overlaps with GCP/GHA artifacts; coordination required to avoid duplicating or conflicting Terraform/GHA output
