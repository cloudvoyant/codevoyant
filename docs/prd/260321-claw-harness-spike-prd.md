# 260321 Claw Harness Architecture Spike PRD

**Scope:** project
**Product:** Codevoyant
**Linear:** (none)
**Owner:** Platform team
**Status:** draft
**Updated:** 2026-03-21

```
  Planning → Eng Planning → Implementation → Deployment → QA
       │           │               │               │        │
       └───────────┴───────────────┴───────────────┴────────┘
                          [THIS] Claw harness spike
                  Architecture design for remote execution runtime
                  OpenClaw integration · scheduling design · build estimate
```

## Problem

Codevoyant has no continuous remote execution runtime, so autonomous development workflows — where an AI agent runs, observes, and reacts to code execution over an extended period — cannot be sustained beyond a single session. Without a concrete architecture for integrating a remote execution layer (such as OpenClaw) and a validated build estimate, the Phase 3 claw harness build cannot begin, and the platform remains limited to single-shot, developer-supervised task execution rather than always-on autonomous development.

## Goals

### Leading Indicators
> Adoption and activation signals — measurable within days/weeks of launch.
- Spike outputs reviewed and approved by engineering leads: from 0 of 3 outputs complete to 3 of 3 (design doc, build estimate, PoC) by 2026-04-18 (end of week 9)
  - Source: Phase 3 gate requirement; no Phase 3 work can be scoped or staffed without these outputs
- OpenClaw integration design doc circulated for technical review: from 0 reviewers to ≥ 2 engineering leads sign-off by 2026-04-18
  - Source: Architectural decisions of this scope require multi-engineer sign-off before build begins

### Lagging Indicators
> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.
- Phase 3 claw harness build started on schedule (week 10 or earlier): from 0% Phase 3 work started to sprint planning complete and first tickets in-progress by 2026-04-25
  - Source: Roadmap dependency — Phase 3 is blocked on Phase 2 spike outputs; schedule slip here cascades directly to autonomous development availability
- Reduction in developer-supervised execution sessions required per autonomous task: from 100% of autonomous tasks requiring active developer supervision to a target of ≤ 20% requiring intervention by end of Phase 3 (measured after harness ships)
  - Source: The spike's design quality directly determines how effectively Phase 3 eliminates the supervision bottleneck

## Non-Goals

- Building any production claw harness code (that is Phase 3 work)
- Implementing OpenClaw integration end-to-end
- Designing or building a regression test runner (the harness is a remote execution runtime, not a test runner)
- Defining the full Phase 3 feature set beyond what is needed to size the build estimate
- Evaluating alternative execution runtimes beyond OpenClaw unless a blocking constraint is discovered
- Changes to existing plugin, skill, or agent-kit interfaces

## Users

**Primary:** Platform engineers on the Codevoyant team who will use the spike outputs to scope and execute Phase 3 build work.

**Secondary:** AI agents (e.g., Claude-backed autonomous developers) that will eventually run on the claw harness runtime once Phase 3 ships; their capability requirements inform the integration design.

## Requirements — Functional

**F1** [P0] OpenClaw integration design document
Produce an integration design document describing how OpenClaw connects to the Codevoyant runtime, including session lifecycle, tool invocation protocol, and state persistence across remote execution cycles. Core spike output; gates Phase 3.

**F2** [P0] Phase 3 build estimate
Produce a build estimate covering Phase 3 claw harness work, broken down by component (harness core, OpenClaw adapter, session manager, observability hooks) with week-level granularity. Must be specific enough to staff Phase 3 sprints.

**F3** [P0] Proof-of-concept remote execution cycle
Produce a proof-of-concept (PoC) demonstrating at minimum one complete remote execution cycle: agent issues a tool call, OpenClaw executes it in a remote environment, result is returned and persisted. PoC validates the critical integration path before full build.

**F4** [P1] Harness execution model documentation
Document the harness execution model — distinguishing it from a regression test runner — including how always-on autonomous sessions are initiated, sustained, interrupted, and resumed. Required to prevent scope confusion in Phase 3 planning.

**F5** [P1] External dependencies and unknowns log
Identify and document all external dependencies, API constraints, and unknowns discovered during the spike that affect the Phase 3 build. Feeds open-questions resolution before Phase 3 starts.

**F6** [P1] Harness–agent-kit interface contract
Define the interface contract between the claw harness and the Codevoyant agent-kit, specifying what the harness exposes and what it consumes. Interface must be stable enough for parallel Phase 3 workstreams.

**F7** [P1] Security and sandboxing requirements
Document security and sandboxing requirements for remote execution environments, including what isolation guarantees OpenClaw provides and what gaps remain. Security constraints may affect Phase 3 scope.

## Requirements — Non-Functional

**NF1** PoC remote execution round-trip latency
Target: ≤ 10 seconds for a representative tool call (e.g., shell command execution) in the PoC environment.

**NF2** Design doc readability
Target: Reviewable by an engineer unfamiliar with OpenClaw internals; must include a sequence diagram covering the nominal execution cycle.

**NF3** Build estimate confidence
Target: Estimates carry explicit confidence ranges (e.g., ±20%) and list assumptions; no single line item left unestimated.

**NF4** PoC reproducibility
Target: Any platform engineer can run the PoC locally following the documented setup steps with no undocumented prerequisites.

## Acceptance Criteria

- [ ] Integration design document is committed to `docs/architecture/` (or equivalent) and covers: OpenClaw connection model, session lifecycle (start / run / suspend / resume / terminate), tool invocation protocol, and state persistence strategy
- [ ] Build estimate document is committed and includes component-level breakdowns, week-level duration estimates, staffing assumptions, confidence ranges, and a list of spike-discovered risks that affect the estimate
- [ ] PoC code is committed and demonstrates a full remote execution cycle: agent-initiated tool call → OpenClaw remote execution → result returned and persisted; README documents how to run it
- [ ] Design doc explicitly distinguishes the claw harness from a regression test runner and defines the always-on autonomous execution model
- [ ] ≥ 2 platform engineers have reviewed and approved the integration design doc (sign-off recorded in Linear or as PR approvals)
- [ ] All open questions discovered during the spike are logged with owners and resolution dates
- [ ] Interface contract between claw harness and agent-kit is defined and reviewed

## Open Questions

**Q1** Does OpenClaw support stateful session resumption across disconnects, or must the harness implement this itself?
Owner: Platform team | Due: 2026-04-04

**Q2** What are OpenClaw's rate limits and concurrency constraints for remote execution environments at our expected agent load?
Owner: Platform team | Due: 2026-04-04

**Q3** Should the harness expose a streaming execution log to the agent in real time, or is polling sufficient for Phase 3?
Owner: Platform team | Due: 2026-04-11

**Q4** Are there licensing or data-residency constraints on what code/data can be sent to OpenClaw remote environments?
Owner: Platform team | Due: 2026-04-04

**Q5** Does Phase 3 require multi-agent concurrent sessions on the same harness instance, or is single-agent sufficient for the initial build?
Owner: Platform team | Due: 2026-04-11

**Q6** What observability tooling (logs, traces, metrics) does OpenClaw natively expose, and what must the harness layer add?
Owner: Platform team | Due: 2026-04-11

## Dependencies

- **OpenClaw** — external remote execution runtime; API access and documentation required before spike can begin; any breaking changes to OpenClaw's API during the spike window would invalidate integration design work
- **agent-kit** — the claw harness interface contract must align with existing agent-kit conventions; agent-kit maintainers must review the interface definition
- **Phase 3 planning** — this spike gates Phase 3 entirely; spike must complete by end of week 9 (2026-04-18) to allow Phase 3 sprint planning the following week
- **Security / infra review** — remote execution sandboxing requirements (F7) may require input from an infra or security reviewer outside the platform team
