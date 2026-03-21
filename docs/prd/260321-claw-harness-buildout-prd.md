# 260321 Claw Harness Build-Out PRD

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
                          [THIS] Claw harness
           Remote execution runtime · continuous dev loop · scheduling
           Enables always-on, human-absent autonomous development
```

## Problem

AI coding agents running inside Codevoyant sessions can only do work when a human opens a terminal and starts a session — there is no way to execute skills or run development tasks remotely, on a schedule, or in a continuous loop. This means autonomous development is bounded by human availability: pipelines stall when no one is watching, feedback cycles require a developer to be present, and the platform cannot compound value across idle time. As skill coverage expands and the pipeline matures, the absence of a remote execution runtime becomes the ceiling on how autonomous the platform can actually be.

## Goals

### Leading Indicators
> Adoption and activation signals — measurable within days/weeks of launch.

- Remote skill executions triggered without a local terminal session: from 0 to ≥50 per week within 2 weeks of launch
  - Source: Platform has no remote execution capability today; any non-zero usage is net new signal
- Time from harness deployment to first successful remote skill execution (activation time): from unmeasured (manual only) to ≤15 minutes for a new harness instance
  - Source: Developer experience benchmarks from Phase 2 architecture spike; if setup takes >15 min, adoption will be blocked by ops overhead
- Phase 3 build confidence (architecture spike output used in build): spike deliverable covers remote execution and scheduler design, gates build start; target 100% spike coverage of P0 build tasks
  - Source: Phase 2 architecture spike is the explicit de-risking step; PRD is blocked without it

### Lagging Indicators
> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.

- Autonomous development sessions completed without human intervention: from 0 to ≥10 per week by end of Q2 2026 (week 13)
  - Source: North-star metric for the platform — "always-on autonomous development" is the stated long-term product direction; this is the first measurable proxy
- Skill execution success rate in remote/unattended context: from unmeasured to ≥85% success rate (non-error termination) on scheduled runs by end of Q2 2026
  - Source: Reliability is the primary user trust lever for autonomous pipelines; sub-85% failure rates cause abandonment of autonomous flows based on analogous CI adoption patterns
- Developer hours reclaimed per week (proxy: tasks completed during off-hours): from 0 to ≥5 task completions per week during hours 20:00–08:00 local by end of Q2 2026
  - Source: "Always-on" value is only realized when the runtime does work humans cannot; off-hours completion is the clearest proxy

## Non-Goals

- Eval/regression harness as a separate product — evaluation signal is provided natively by the runtime; a standalone eval harness is out of scope this quarter
- New skill development — the claw harness build requires skills to be stable; this PRD assumes Phase 1 solidification is complete before build starts
- Multi-tenant or multi-user orchestration — v1 targets single-workspace remote execution; multi-user scheduling is a future quarter item
- Custom scheduler UI or dashboard — scheduling in v1 is configuration-driven (no visual interface)
- OpenClaw feature development — Codevoyant integrates with OpenClaw as a consumer; changes to OpenClaw internals are out of scope
- Continuous dev loop and scheduler (if capacity constrained) — v1 scope may be cut to remote execution only; continuous loop and scheduler are explicitly deferrable per roadmap constraint
- Replacing or modifying the existing local session model — the claw harness is additive; local sessions continue to work unchanged

## Users

Platform engineers and AI-assisted development teams who want Codevoyant skills to run autonomously on a remote host without requiring an active local terminal session. Secondary: individual developers who want to schedule recurring skill executions (e.g., nightly spec reviews, daily CI triage) against their codebase.

## Requirements — Functional

**F1** [P0] Remote skill invocation
The harness must accept a skill invocation (skill name + arguments) via a remote API or CLI trigger and execute it against a specified repository without a local terminal session. Core remote execution capability; everything else depends on this.

**F2** [P0] Repository authentication
The harness must authenticate to the target repository and have read/write access sufficient to run skills that produce commits, PRs, or file changes. Skills like dev:commit, spec:execute write to the repo; auth must be scoped correctly.

**F3** [P0] Execution output persistence
The harness must capture and persist execution output (stdout, stderr, skill result) per run, accessible after the run completes. Required for debugging, audit, and evaluation signal.

**F4** [P0] Execution status reporting
The harness must report execution status (queued, running, succeeded, failed) in a queryable form (log file, API endpoint, or status command). Operators must be able to tell whether a remote run succeeded without being present.

**F5** [P0] OpenClaw integration
The harness must integrate with OpenClaw (or equivalent remote execution tool identified in the Phase 2 spike) as the execution substrate. Phase 2 architecture spike defines the integration surface; this PRD assumes spike output is available before build starts.

**F6** [P1] GitHub Actions trigger
The harness must support triggering skill executions from a GitHub Actions workflow. GHA is the primary CI/CD surface for the platform; remote trigger via GHA enables event-driven execution.

**F7** [P1] Configurable retry behavior
The harness must support configurable retry behavior (max attempts, backoff) for failed executions. Remote execution is inherently less reliable than local; retries prevent transient failures from silently dropping work.

**F8** [P1] Scheduled execution
The harness must support scheduled execution of a skill against a repository (cron-style schedule, minimum granularity: hourly). Enables always-on development loop; explicitly deferrable to v2 if capacity constrained.

**F9** [P1] Continuous dev loop mode
The harness must support a continuous dev loop mode where a successful skill execution can trigger a subsequent skill in a defined sequence. Closes the autonomous pipeline loop (PRD → spec → execute → commit → CI); deferrable to v2 if capacity constrained.

**F10** [P1] Local `claw run` command
The harness must provide a local command (`claw run`) to invoke a skill remotely for testing and one-off use. Developer ergonomics; teams need a way to trigger remote execution manually without writing a GHA workflow.

**F11** [P2] Structured execution logs
The harness must emit structured logs per execution in a parseable format (JSON or equivalent). Enables downstream tooling, alerting, and evaluation dashboards in future quarters.

**F12** [P0] Environment variable injection
The harness must support environment variable injection at execution time (API keys, tokens) without hardcoding secrets in config. Skills require model API keys and potentially repo tokens; secrets must not appear in config files or logs.

## Requirements — Non-Functional

**NF1** Remote skill execution startup latency
Target: ≤60 seconds for cold start; ≤15 seconds for warm/cached execution environment (from trigger to first skill instruction executing).

**NF2** Execution reliability
Target: ≥95% of triggered runs reach a terminal state (succeeded or failed with logged reason) — no silent hangs (under normal, non-degraded infrastructure conditions).

**NF3** Secrets handling
Target: Zero secret exposure in any persisted artifact; environment variables and tokens must not appear in execution logs or persisted output; enforced by log scrubbing at the harness layer.

**NF4** Concurrent execution capacity
Target: ≥5 simultaneous remote skill executions per harness instance without queue starvation.

**NF5** Execution timeout
Target: Configurable timeout per run; default ≤10 minutes; execution killed and logged on timeout. Long-running skills must not hang indefinitely.

**NF6** Harness deployment
Target: ≤30 minutes from zero to first successful remote execution on a fresh instance; a new instance must be deployable from scratch by a platform engineer following documented steps.

**NF7** Observability
Target: ≥30 days of execution history retained; queryable by skill name, status, and timestamp.

## Acceptance Criteria

- [ ] A skill can be triggered remotely (via CLI command or GHA workflow step) without an active local terminal session and executes to completion on the remote host
- [ ] Execution output (stdout, stderr, exit code) is captured and retrievable after the run completes
- [ ] Execution status is queryable in real time (queued / running / succeeded / failed) via a status command or log endpoint
- [ ] Secrets (API keys, tokens) passed as environment variables do not appear in any persisted log or output artifact
- [ ] A remote execution triggered while the target repository has an uncommitted change set completes without corrupting the working tree
- [ ] A failed execution (skill error, timeout, infrastructure fault) is logged with a reason code and does not silently disappear
- [ ] Retry behavior (attempt count, backoff) is configurable per invocation and behaves as configured
- [ ] A new harness instance can be deployed and run its first successful remote skill execution within 30 minutes, following documented steps
- [ ] At least one full pipeline sequence (trigger → remote execution → skill output committed to repo) is demonstrated end-to-end in a staging environment before production launch
- [ ] If scheduler (F8) is in scope: a cron-scheduled skill execution fires within ±2 minutes of its scheduled time across 5 consecutive runs
- [ ] If continuous dev loop (F9) is in scope: a two-skill sequence (skill A triggers skill B on success) completes end-to-end without manual intervention

## Open Questions

**Q1** What is the exact OpenClaw API surface available for integration? (Session management, execution substrate, auth model)
Owner: Engineering | Due: Week 9 (Phase 2 spike output)

**Q2** What is the Phase 2 spike's concrete build estimate for the harness? If it exceeds capacity, which scope items (scheduler, continuous loop) are cut first?
Owner: Platform team | Due: Week 9

**Q3** What is the target hosting environment for the harness runtime — GCP, GHA-hosted runner, or self-hosted?
Owner: Engineering | Due: Week 9

**Q4** Does the harness need to support multiple concurrent workspace/repository targets, or is single-workspace sufficient for v1?
Owner: PM | Due: Week 10

**Q5** What is the definition of "skills are stable enough" to begin harness build? (Specific pass criteria from Phase 1 solidification)
Owner: PM | Due: Week 4

**Q6** Are there licensing or usage constraints on OpenClaw that affect how the harness can be distributed or deployed?
Owner: Engineering | Due: Week 9

## Dependencies

- **Phase 1 — Skills solidification (P0, Weeks 1–4):** Harness build must not begin until skills are stable; explicit user constraint — eval harness only makes sense once skills are in good shape
- **Phase 2 — Claw harness architecture spike (P1, Weeks 5–9):** Spike output gates Phase 3 build start; must deliver concrete build estimate, OpenClaw integration design, and hosting recommendation before week 10
- **OpenClaw (or equivalent remote execution tool):** External dependency; availability for integration must be confirmed in Phase 2 spike
- **Phase 3 — Playwright e2e skill (P0, Weeks 10–13):** Parallel Phase 3 item; claw harness and Playwright skill are independent builds but both required to close the autonomous pipeline loop
- **GitHub Actions integration (F6):** Depends on GHA workflow permissions and repo-level secret configuration; platform engineering must provision before acceptance testing
- **Secrets management infrastructure:** Harness requires a secrets store (environment variable injection at runtime); platform must provide this before F12 can be implemented and tested
