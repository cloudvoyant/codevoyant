# 260321 Lo-fi PRD Production Skill PRD

**Scope:** project
**Product:** Codevoyant
**Linear:** (none)
**Owner:** Platform team
**Status:** draft
**Updated:** 2026-03-21

```
  [Planning] → [Eng Planning] → Implementation → Deployment → QA
       │               │
       └───[THIS]───────┘
     Lo-fi PRD production skill
     Structures the handoff that unlocks em:* and spec:* autonomous operation
```

## Problem

Engineering agents (`em:plan`, `spec:new`) cannot operate autonomously because the structured handoff between the planning and execution layers is unreliable — existing `pm:prd` output is optimised for human readability and omits the machine-actionable precision (unambiguous acceptance criteria, explicit scope boundaries, traceable requirements) that engineering agents require to generate correct implementation plans without human clarification. When an agent receives an underspecified PRD it either halts to ask clarifying questions, proceeding with wrong assumptions, or produces a plan that requires substantial human rework before execution — breaking the autonomous pipeline and eliminating the core value proposition of the platform.

## Goals

### Leading Indicators
> Adoption and activation signals — measurable within days/weeks of launch.

- **lo-fi PRD skill invocation rate**: from 0 invocations/week to ≥ 5 invocations/week by end of Week 9 (4 weeks post-launch)
  - Source: skill invocation telemetry (session logs); baseline is zero because the skill does not exist today; target derived from the number of planned Phase 2 and Phase 3 feature PRDs that must flow through the pipeline
- **em:plan clarification-halt rate** (fraction of em:plan runs that pause for human input): from current baseline (to be measured in Week 5) to ≤ 15% of runs by end of Week 10
  - Source: em:plan session logs; current rate is expected to be >50% based on qualitative observation; owner to instrument and establish baseline in Week 5
- **spec:new human-edit rate before spec:go** (fraction of plans that require human edits before autonomous execution): from current baseline (to be measured in Week 5) to ≤ 20% of runs by end of Week 10
  - Source: spec session logs; baseline to be established in Week 5

### Lagging Indicators
> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.

- **Autonomous pipeline completion rate** (fraction of features where pm → em → spec → dev → qa completes without human intervention at the PRD handoff): from 0% to ≥ 60% of qualifying features by end of Phase 3 (Week 13)
  - Source: pipeline run logs; baseline is 0% because no feature has completed the full autonomous pipeline today
- **Human rework time at PRD handoff** (estimated hours a human spends correcting agent-produced plans that stem from underspecified PRD input): from current estimated baseline of >2 hours/feature (to be confirmed by PM in Week 5) to ≤ 20 minutes/feature by end of Q2 (Week 13)
  - Source: PM time-tracking and retrospective estimates; baseline to be confirmed by Week 5

## Non-Goals

- **Human-readable narrative PRDs** — the lo-fi PRD skill targets engineering agent consumption; long-form prose, executive summaries, and stakeholder-oriented context are out of scope for this skill (the existing `pm:prd` skill serves that use case)
- **Requirements elicitation from zero context** — the skill assumes the caller has a product brief or feature description as input; open-ended discovery conversations are handled by `pm:plan`, not this skill
- **Linear / Notion attachment and sync** — the lo-fi PRD is a local file artifact; pushing to Linear or Notion is deferred to a future integration pass (timeline: not this quarter) to keep the skill surface minimal
- **Validation of downstream agent output** — the skill produces a PRD; it does not verify that `em:plan` or `spec:new` acted on it correctly; that validation is the responsibility of the eval/harness work planned for later phases
- **Multi-feature or initiative-level PRDs** — the skill scopes to a single feature; initiative-level planning is handled by `em:plan` and `pm:plan`
- **Interactive clarification loops with the user** — the skill is designed to run with minimal back-and-forth; if the input is too ambiguous to produce a complete PRD, it fails fast with a structured error rather than entering a long clarification dialogue

## Users

**Primary:** Engineering agents (`em:plan`, `spec:new`) — these are the direct consumers of the lo-fi PRD; they parse its structured sections to generate implementation plans and task breakdowns without human mediation.

**Secondary:** Platform engineers and PMs who invoke the skill to produce the handoff artifact — they care that the skill is fast, predictable, and produces output that does not require manual cleanup before handing to an agent.

## Requirements — Functional

**F1** [P0] Accept input and produce structured PRD file
The skill accepts a feature description string or a Linear/GitHub/Notion issue URL as input and produces a structured lo-fi PRD file at `docs/prd/{YYMMDD}-{scope}-prd.md`. Same output path convention as `pm:prd`.

**F2** [P0] Machine-parseable Problem section
The PRD must contain a machine-parseable Problem section: one sentence naming the user, one sentence naming the pain, one sentence naming the downstream consequence for the pipeline. Enforced by a structured output schema — free-form prose is rejected at quality checkpoint.

**F3** [P0] Functional requirements table with acceptance conditions
The PRD must contain a Requirements — Functional table with columns: #, Requirement, Priority (P0/P1/P2), Acceptance Condition. Acceptance Condition is a column separate from the Requirement text; it must be verifiable without human judgment.

**F4** [P0] Binary or measurable acceptance conditions
Every acceptance condition in the functional requirements table must be binary pass/fail or contain a measurable threshold (no subjective language: "appropriate", "reasonable", "fast enough"). Quality checkpoint must block write if any AC is non-verifiable.

**F5** [P0] Non-functional requirements table with numeric targets
The PRD must contain a Requirements — Non-Functional table with columns: #, Requirement, Target; every NFR target must include a unit and a numeric threshold. e.g., "p95 skill execution time < 30 s under normal load"; unitless targets are blocked.

**F6** [P0] Acceptance criteria in structured pattern
The PRD must contain an Acceptance Criteria checklist where every item follows the Given / When / Then or Condition / Action / Observable-result pattern. Items that omit condition or observable result are flagged and must be rewritten before the file is written.

**F7** [P0] Non-Goals section with rationale
The PRD must contain a Non-Goals section with at least one entry; each entry must include a one-phrase rationale. An empty Non-Goals section blocks the write step.

**F8** [P1] Dependencies labeled by direction
The PRD must contain a Dependencies section where every dependency is labeled as `upstream`, `downstream`, or `external`. Unlabeled dependencies block the write step.

**F9** [P0] Quality checkpoint before write
The skill must run a structured quality checkpoint before writing the file, emit a machine-readable Quality Checkpoint block, and block the write if any P0 criterion fails. Quality checkpoint output must be visible in the session before the file is written.

**F10** [P1] Single-invocation completion
The skill must complete from input to file-written in a single invocation without requiring the user to answer clarifying questions, provided the input contains sufficient context (feature description ≥ 2 sentences or a parseable ticket URL). If context is insufficient, the skill emits a structured `INSUFFICIENT_CONTEXT` error with a list of missing fields rather than entering a dialogue loop.

**F11** [P1] `--agent` flag for pipeline automation
The skill must support a `--agent` flag that suppresses all interactive output and emits only the output file path on stdout upon completion; this is the invocation mode used by `pm:plan` when delegating PRD generation. Used for pipeline automation; must exit non-zero if quality checkpoint blocks.

**F12** [P2] `--bg` flag for background execution
The skill must support a `--bg` flag for background execution with a completion notification. Consistent with other skills in the platform.

**F13** [P1] `agent-context` front-matter block
The output PRD must include an `agent-context` front-matter block containing: skill version, source input type (string/linear/github/notion), and a machine-readable list of open questions with owners and due dates. Enables `em:plan` and `spec:new` to detect unresolved questions before attempting autonomous execution.

## Requirements — Non-Functional

**NF1** Skill execution time (local input)
Target: p95 < 30 s on a standard developer machine with Claude Sonnet (input to file written, excluding external API calls for ticket fetch).

**NF2** Skill execution time (URL-seeded)
Target: p95 < 60 s when seeded from a Linear/GitHub/Notion URL (including ticket fetch).

**NF3** Quality checkpoint false-positive rate
Target: ≤ 5% of invocations across a 20-PRD evaluation set (blocks a PRD that a human expert would judge as valid).

**NF4** Quality checkpoint false-negative rate
Target: ≤ 10% of invocations across a 20-PRD evaluation set (passes a PRD that is rejected by `em:plan` or `spec:new` as underspecified).

**NF5** Output file size
Target: ≤ 4 KB for a single-feature PRD; larger output is a signal of over-writing and triggers a warning.

**NF6** `--agent` flag suppression correctness
Target: 100% of `--agent` invocations emit only the output file path on stdout (no prose, no quality checkpoint prose).

**NF7** Backward compatibility with `pm:prd` output path convention
Target: Output files must be valid inputs to any tool that already consumes `docs/prd/*.md` files.

## Acceptance Criteria

- [ ] Given a feature description of ≥ 2 sentences, when the skill is invoked, then a PRD file is written to `docs/prd/{YYMMDD}-{scope}-prd.md` within 30 seconds and the file contains all required sections (Problem, Goals, Non-Goals, Users, Requirements — Functional, Requirements — Non-Functional, Acceptance Criteria, Open Questions, Dependencies)
- [ ] Given a Linear issue URL as input, when the skill fetches and parses the ticket, then the PRD Problem section accurately reflects the issue description with no fabricated context
- [ ] Given a PRD where any acceptance condition in the Functional Requirements table contains subjective language ("appropriate", "reasonable", "fast"), when the quality checkpoint runs, then the write step is blocked and the subjective terms are listed in the checkpoint output
- [ ] Given a PRD where the Non-Goals section is empty, when the quality checkpoint runs, then the write step is blocked with the message: "Non-Goals section is required; add at least one entry with a rationale"
- [ ] Given a PRD where a dependency has no directionality label, when the quality checkpoint runs, then the write step is blocked and the unlabeled dependency is identified by name
- [ ] Given a valid PRD input that passes all quality checkpoint criteria, when the skill completes, then `em:plan` seeded with the output file produces an implementation plan without halting for human clarification (verified manually on a reference feature)
- [ ] Given a valid PRD input that passes all quality checkpoint criteria, when the skill completes, then `spec:new` seeded with the output file produces a task plan without halting for human clarification (verified manually on a reference feature)
- [ ] Given the `--agent` flag, when the skill completes successfully, then stdout contains only the output file path (e.g., `docs/prd/260321-my-feature-prd.md`) and no other prose
- [ ] Given the `--agent` flag and a quality checkpoint block, when the skill exits, then the exit code is non-zero and stderr contains the blocking checkpoint item(s)
- [ ] Given a feature description that is fewer than 2 sentences and no ticket URL, when the skill is invoked, then it emits a structured `INSUFFICIENT_CONTEXT` error listing the missing fields and exits without writing a partial file
- [ ] Given any PRD produced by the skill, when a human expert reviews it against the template, then all required sections are present, all NFR targets include a unit and numeric threshold, and all acceptance conditions are binary or threshold-based

## Open Questions

**Q1** What is the baseline em:plan clarification-halt rate today? Must be instrumented before Week 5 to set a valid target.
Owner: Platform team (engineering) | Due: Week 5

**Q2** What is the baseline human rework time at the PRD handoff? PM estimate required to validate the lagging indicator target.
Owner: PM | Due: Week 5

**Q3** Should the lo-fi PRD format be versioned (e.g., `lofi-prd/v1`) so that `em:plan` can version-gate its parser? Or is the section structure sufficient as a stable contract?
Owner: Engineering | Due: Week 6

**Q4** Is the `agent-context` front-matter block (F13) YAML or a fenced JSON block? Decision affects how `em:plan` and `spec:new` parse it.
Owner: Engineering | Due: Week 6

**Q5** Does the quality checkpoint false-positive and false-negative rate (NF3, NF4) need to be validated against a synthetic evaluation set before ship, or is qualitative expert review sufficient for v1?
Owner: PM + Engineering | Due: Week 7

**Q6** Is there a maximum PRD complexity threshold beyond which the lo-fi PRD skill should refuse and delegate to `pm:prd` + human review? If so, what is the signal (e.g., > N requirements, > M acceptance criteria)?
Owner: PM | Due: Week 6

## Dependencies

- **upstream** — `pm:plan` skill: lo-fi PRD skill is expected to be invoked inline from `pm:plan` when delegating PRD generation; the calling convention (`--agent` flag, structured stdout) must be agreed before Week 6
- **upstream** — Skills solidification (Phase 1, P0): the quality checkpoint and structured output patterns built in this skill depend on a stable skill execution environment; if Phase 1 solidification slips, the lo-fi PRD skill's reliability targets (NF3, NF4) are at risk
- **downstream** — `em:plan` skill: the primary consumer of the lo-fi PRD output; acceptance criteria F6 and F7 are only verifiable if `em:plan` is available as a test harness
- **downstream** — `spec:new` skill: the secondary consumer; acceptance criteria reference `spec:new` behavior as a verification gate
- **external** — Linear API (via `mcp__linear-server`): required for ticket-seeding invocations (F1); if the Linear MCP server is unavailable, the skill must degrade gracefully and accept string input only
- **external** — GitHub API: required for GitHub issue URL seeding (F1); same graceful degradation requirement as Linear
- **external** — Notion API (via `mcp__claude_ai_Notion`): required for Notion page URL seeding (F1); same graceful degradation requirement
