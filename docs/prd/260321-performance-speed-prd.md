# 260321 Performance & Speed PRD

**Scope:** initiative
**Product:** Codevoyant
**Linear:** (none)
**Owner:** Platform team
**Status:** draft
**Updated:** 2026-03-21

```
  Planning → Eng Planning → Implementation → Deployment → QA
  ─────────────────────────────────────────────────────────
  [THIS] Performance & speed (cross-cutting)
  Reduces latency and memory usage across all skill executions
```

## Problem

Autonomous pipeline runs in Codevoyant suffer from high execution latency and excessive memory consumption, causing users to abort runs prematurely or avoid scheduling unattended workflows entirely. Skill chains that take minutes instead of seconds — and agents that exhaust available memory mid-run — destroy the trust required for users to delegate work to the pipeline and walk away. This problem must be addressed in parallel with framework development (Phase 2, Weeks 5–9) because each new framework capability compounds the performance deficit; a serial fix would arrive too late to prevent adoption erosion.

## Goals

### Leading Indicators
> Adoption and activation signals — measurable within days/weeks of launch.
- P95 single-skill execution time: from ~4,200 ms to ≤ 1,500 ms by end of Week 9
  - Source: Internal telemetry from skill execution spans; current median ~2,800 ms with a long tail spiking past 4 s on cold paths
- P95 end-to-end autonomous pipeline latency (5-skill chain): from ~28 s to ≤ 10 s by end of Week 9
  - Source: Benchmark suite run on representative user workflows (planning → spec → code → review → commit)
- Peak heap memory per pipeline run: from ~680 MB to ≤ 300 MB by end of Week 9
  - Source: Node.js heap snapshots captured during load testing; 680 MB baseline causes OOM crashes on 8 GB developer machines under concurrent runs
- Number of user-initiated pipeline aborts attributed to slowness: from 34 % of observed runs to ≤ 8 % by end of Week 9
  - Source: Telemetry event `pipeline.abort` tagged with `reason: timeout | slow`; sampled from 200 beta users over a 2-week window

### Lagging Indicators
> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.
- 30-day retention for users who have run at least one autonomous pipeline: from 41 % to ≥ 65 % by Week 16 (4 weeks post-launch)
  - Source: Cohort retention analysis; pipeline users who experience low latency are hypothesized to mirror CLI tool retention patterns where speed is the primary driver of habit formation
- Weekly active autonomous pipeline runs per retained user: from 1.2 runs/week to ≥ 3.5 runs/week by Week 16
  - Source: Product analytics; higher frequency is the primary signal that users trust the pipeline to run unattended
- Support tickets and community posts citing slowness or memory issues: from 18 % of all tickets to ≤ 4 % by Week 16
  - Source: Zendesk + Discord tag analysis; "slow", "hangs", "OOM", "timeout" tags tracked weekly

## Non-Goals

- Rewriting the Claude API client or changing model inference latency — network round-trip time to Anthropic APIs is outside scope
- Optimizing cold-start time for the Codevoyant CLI itself (installation, first-run bootstrap) — that is a separate DX initiative
- Adding distributed / multi-node execution or horizontal scaling infrastructure
- Reducing token usage or cost-per-run (a separate cost-optimization track)
- Improving performance of user-authored custom skills — the platform provides the runtime; skill author optimization is out of scope
- Changing the public skill API surface or breaking existing integrations to achieve performance gains
- Mobile or browser runtime performance — target environment is developer machines and CI runners only

## Users

**Primary:** Developers and engineering teams using Codevoyant autonomous pipelines on local machines or CI runners who require sub-second responsiveness to trust unattended execution.

**Secondary:** Platform engineers maintaining and extending the Codevoyant skill runtime who need clear performance budgets and profiling tooling to prevent regressions.

## Requirements — Functional

**F1** [P0] Concurrent skill execution
The skill runtime must execute skills concurrently when the dependency graph allows parallel execution, rather than sequentially. Current runtime serialises all skill invocations regardless of dependency; this is the single largest latency contributor.

**F2** [P0] Lazy skill module loading
The agent must lazily load skill modules — only importing and initialising a skill when it is first invoked in a session. Eager loading of all ~40 skills on startup accounts for ~1,100 ms; lazy loading eliminates this for pipelines that use a small subset.

**F3** [P1] Incremental context streaming between skills
Context passed between skills in a pipeline must be streamed incrementally rather than buffered in full before the next skill starts. Eliminates head-of-line blocking on large outputs (e.g., spec → code handoff with 20 k-token outputs).

**F4** [P1] Built-in pipeline benchmark harness
The platform must provide a built-in pipeline benchmark harness that runs a canonical 5-skill chain and reports P50/P95 latency and peak heap. Required to gate releases and catch regressions in CI; currently no automated performance gate exists.

**F5** [P1] Prompt memory release after consumption
Memory allocated by completed skills must be released promptly; the runtime must not retain full skill output in heap after a skill's downstream consumers have consumed it. Root cause of the 680 MB peak heap; outputs accumulate in the pipeline context object until the entire run completes.

**F6** [P1] Per-skill execution spans in structured logs
The runtime must expose per-skill execution spans (start time, end time, peak memory delta) in a structured log format consumable by existing observability tooling. Needed for continuous monitoring and to allow users to identify bottlenecks in their own pipelines.

**F7** [P2] Enforceable performance budget configuration
A performance budget configuration (max execution time per skill, max pipeline memory) must be enforceable at the project level; violations must surface as warnings in the run output. Allows teams to codify acceptable performance thresholds and catch regressions before they reach production.

**F8** [P2] Live progress indicator in autonomous mode
The CLI must display a live progress indicator showing which skill is executing and elapsed time when running in autonomous mode. User perception of speed is as important as actual speed; visibility reduces anxiety-driven aborts.

## Requirements — Non-Functional

**NF1** P95 single-skill execution time (excluding model API round-trip)
Target: ≤ 1,500 ms on a MacBook Pro M2 with 16 GB RAM.

**NF2** P95 end-to-end latency for canonical 5-skill autonomous pipeline
Target: ≤ 10 s on a MacBook Pro M2 with 16 GB RAM.

**NF3** Peak heap memory per autonomous pipeline run
Target: ≤ 300 MB measured via Node.js `process.memoryUsage().heapUsed`.

**NF4** No performance regression on single-skill runs
Target: Existing P95 must not increase by more than 5 % after changes land.

**NF5** Benchmark harness CI runtime
Target: Total CI benchmark job duration ≤ 3 minutes. Benchmark harness must run in CI on every PR targeting the runtime.

**NF6** Performance instrumentation overhead
Target: ≤ 2 % of measured skill execution time (instrumentation must not materially change the thing it measures).

**NF7** Reliability of the optimised runtime under concurrent pipeline runs
Target: Zero increase in error rate vs. baseline; measured over 1,000 synthetic pipeline runs in load test.

## Acceptance Criteria

- [ ] Benchmark harness runs against the canonical 5-skill pipeline (planning → spec → code → review → commit) and reports P50 and P95 latency and peak heap; results are committed to the repo as a baseline artifact
- [ ] P95 single-skill execution time for all built-in skills measures ≤ 1,500 ms in the benchmark harness on the reference hardware profile
- [ ] P95 end-to-end latency for the canonical 5-skill chain measures ≤ 10 s in the benchmark harness
- [ ] Peak heap memory during a canonical 5-skill run measures ≤ 300 MB in the benchmark harness
- [ ] Skills whose dependency graph allows parallel execution are verified to run concurrently via span timestamps in the structured log output
- [ ] Lazy loading is confirmed by a startup trace showing that skills not used in a given pipeline do not appear in the module load log
- [ ] The benchmark harness is integrated into CI and fails the build if P95 single-skill latency exceeds 1,500 ms or peak heap exceeds 300 MB
- [ ] Structured per-skill execution spans (start, end, memory delta) appear in the run log for every autonomous pipeline run and are parseable by the existing log consumer
- [ ] All existing skill integration tests pass without modification after the runtime changes land
- [ ] A load test of 50 concurrent pipeline runs produces zero increase in error rate compared to the pre-optimisation baseline

## Open Questions

**Q1** Should parallel skill execution be opt-in (declared in skill manifest) or opt-out (inferred from dependency graph automatically)? Automatic inference is faster for users but harder to make safe.
Owner: Platform team | Due: 2026-03-28

**Q2** What is the reference hardware profile for the benchmark harness in CI? GitHub-hosted runners (8 GB RAM, 4-core) differ meaningfully from a developer M2 MacBook — do we need two separate target thresholds?
Owner: Platform team | Due: 2026-03-28

**Q3** Streaming context between skills requires a protocol change; is there a compatibility window or do we do a hard cut-over? What is the migration path for third-party skill authors?
Owner: Platform team + DX | Due: 2026-04-04

**Q4** Do we instrument memory at the skill level using Node.js `process.memoryUsage()` snapshots (coarse, low overhead) or using `--heap-prof` / V8 sampling (precise, higher overhead)?
Owner: Platform team | Due: 2026-03-28

**Q5** Is the 680 MB baseline measured with or without the MCP server processes? Clarify scope of memory budget.
Owner: Platform team | Due: 2026-03-25

## Dependencies

- Node.js runtime version pinned in the project — parallel execution relies on `Promise.all` semantics and structured async context propagation; must confirm Node ≥ 20 is the minimum across all supported environments
- Existing skill manifest schema — lazy loading and dependency-graph inference require fields that may not exist today (`dependsOn`, `outputs`); schema changes must be backward-compatible
- CI infrastructure — benchmark harness requires a reproducible hardware environment; coordinate with whoever manages GitHub Actions runner configuration
- Observability / logging infrastructure — structured span output must be compatible with the log format consumed by existing dashboards and the `mem` tooling
- Phase 2 framework work — performance changes must not break in-flight framework PRs; the two tracks need a shared integration branch or clear merge sequencing agreement
