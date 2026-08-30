# requirements-guidance — how requirements must read

The single rule set for every requirement the skills write: docs templates' `## Requirements` sections, spec plan.md `## Requirements`, and plan/pm templates that reference this file. Requirements state domain/business purpose (what/why), never design or implementation (how).

> **Markdown output: soft-wrap prose, never hard-wrap** — when a skill writes a `.md` artifact per this guidance, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

## The rules

| Rule | Name | Check |
| --- | --- | --- |
| R1 | no-impl-terms | Functional requirements contain no endpoint/route names, class/function names, table names, SQL, UI widgets, or file paths. Identifiers belong in Design/Implementation. Untouchables (code blocks, quoted identifiers) stay exact. |
| R2 | survive-change | "Would this wording need to change if the implementation did?" If yes, rewrite. "The pipeline reads from S3, transforms with Spark, writes to BigQuery" fails; "orders are available to consumers within 25 hours of placement" passes. |
| R3 | fit-criterion | Every Functional requirement names an observable outcome or measurable success condition. "The feature works correctly" fails by format. |
| R4 | smells | No subjective language, ambiguous adverbs/adjectives, superlatives, totality terms ("always", "never"), comparative phrases ("faster", "better") without a baseline. |
| R5 | invariant | Functional requirements do not state implementation invariants. How a class operates internally ("the encoder caches tokens") is an invariant — it belongs in Implementation, never in Functional. |
| R6 | source | Domain claims carry `Source: {citation or evidence}` or are marked `[ASSUMPTION — unvalidated]`. A requirement with neither is flagged, not silently accepted. |
| R7 | verbs | Requirements use the template's prescribed verbs (must / returns / rejects / produces / reports / accepts). "Should", "would", "can" as requirement verbs fail (STE banned modals). |

## Per-template verb table

| Template | Functional verbs | Non-Functional emphasis |
| --- | --- | --- |
| api | must, returns, rejects | rate limits, latency, idempotency, security |
| auth | must, rejects | token lifetime, storage, transport, revocation |
| library | must, returns | API surface, error handling, performance |
| data-pipeline | must, produces | throughput, freshness SLO, retry/backoff — numbers |
| ml-model | must, returns, accepts | latency, throughput, accuracy targets, hardware — numbers, not vibes |
| experiment | must, reports | runtime, resource budget, reproducibility — numbers |
| frontend | must (render/handle) | responsiveness, accessibility, performance |
| generic | must, returns, rejects | performance, security, reliability, operability |

## Good vs slop, per case

**Services / APIs.** Slop: "Given I visit /login and press the login button…" (procedural UI restatement). Good: "When a returning user signs in, they reach their dashboard without re-entering credentials. Source: {evidence}". Slop: "Must create a SessionService class". Good: "Must issue a session on valid credentials and reject expired or tampered tokens".

**Libraries / SDKs.** Slop: "The SDK exposes paginate() using a cursor token" (API design, belongs in an ADR/Design). Good: "Callers can retrieve a stable page of results so multi-page reads never miss or duplicate records — Source: {evidence}".

**Data pipelines.** Slop: "Reads from S3, transforms with Spark, writes to BigQuery". Good: "Orders are available to consumers within 25 hours of placement; late arrivals are included in the next run. Source: {evidence}".

**ML models.** Slop: "Uses a 24-layer transformer trained with Adam" (architecture trivia). Good: "Returns accurate toxicity labels for English text; used for content moderation, not user scoring. Source: {evidence}" — intended use + out-of-scope, model-card style.

**Infra / CI.** Slop: "Deploys Terraform ECS Fargate behind an ALB" (mechanism). Good: "99% of Get calls complete in under 100 ms, measured across backends over 1 minute. Source: {evidence}" — SLO language, few and defensible, never absolutes.

## How gates apply

Docs review Step 3c runs R1–R7 as executable checks over `## Requirements` sections (LANGUAGE-style finding contract, severity REQUIREMENTS). Spec planning runs the SCOPE=requirements agent over plan.md Requirements (BLOCK when the objective is entirely a deliverable list — ask "What changes for users or the business if this ships successfully?"). Judgments are by intent, not blind substring matching — the same rule as the code-completeness blocklist.
