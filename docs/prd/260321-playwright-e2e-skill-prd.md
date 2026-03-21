# 260321 Playwright E2E Skill PRD

**Scope:** project
**Product:** Codevoyant
**Linear:** (none)
**Owner:** Platform team
**Status:** draft
**Updated:** 2026-03-21

```
  Planning → Eng Planning → Implementation → Deployment → [QA]
                                                             │
                                                   [THIS] Playwright e2e skill
                                                   Autonomous test generation · execution · reporting
```

## Problem

The Codevoyant autonomous pipeline produces and deploys code without any automated quality gate: every QA step is manual, requiring a human to run tests, interpret results, and decide whether a build is safe to promote. This manual dependency breaks the autonomy guarantee — agents cannot safely ship to production without human intervention on the QA leg — making the pipeline unsuitable for unsupervised production use. As deployment frequency scales, the bottleneck grows proportionally worse.

## Goals

### Leading Indicators
> Adoption and activation signals — measurable within days/weeks of launch.
- Agent-initiated Playwright test runs per week: from 0 to 20 by 2026-05-01
  - Source: Zero autonomous test runs today (manual QA only); 20/week represents one run per working day across two active pipeline users, confirming the skill is being exercised in normal workflow.
- Skill invocation success rate (test suite runs to completion without skill-level error): from 0 % to 90 % by 2026-05-01
  - Source: A new skill with no baseline; 90 % is the minimum threshold for agents to rely on it without fallback to manual steps.
- Time from code change to test results available: from >30 min (manual) to <5 min by 2026-05-01
  - Source: Current manual QA cycle observed at 30–60 min; sub-5-minute feedback is the threshold that makes inline autonomous use practical.

### Lagging Indicators
> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.
- Proportion of pipeline deployments requiring no human QA intervention: from 0 % to 70 % by 2026-07-01
  - Source: Today every deployment requires manual sign-off; 70 % autonomous closure is the milestone that unlocks production-grade pipeline positioning.
- Regression escape rate (bugs reaching staging/production that existing tests should have caught): from baseline (unmeasured) to <5 % of deployments by 2026-07-01
  - Source: Absence of automated QA means regression escapes are not tracked; establishing a low-escape baseline is a key lagging outcome of the skill.
- Agent confidence score on QA leg (self-reported by agent at end of pipeline run, 1–5 scale): from N/A to ≥4.0 average by 2026-07-01
  - Source: Agents currently mark QA as blocked; a high confidence score indicates the skill provides actionable, interpretable output.

## Non-Goals

- Building a general-purpose browser-automation framework — the skill wraps Playwright, it does not replace it.
- Writing or maintaining application source code on behalf of QA findings — remediation is the responsibility of other pipeline skills (e.g., dev skill).
- Supporting non-Playwright test runners (Jest, Cypress, Vitest, etc.) in v1.
- Running tests against infrastructure that requires VPN, mTLS, or on-premise environments — cloud/localhost targets only in v1.
- Visual regression testing (screenshot diffing) — functional assertions only in v1.
- Load or performance testing.
- Managing Playwright browser binary installation outside of the standard `npx playwright install` path.
- Generating test scaffolding from scratch without any existing spec files to anchor against.

## Users

**Primary:** Claude Code agents operating inside the Codevoyant autonomous pipeline that need to validate a code change before promoting it to the next stage.

**Secondary:** Developers using Codevoyant interactively who want to delegate the "run and interpret tests" step to the agent rather than context-switching to a terminal.

## Requirements — Functional

**F1** [P0] Execute Playwright test suite
The skill must accept a target directory or test-file glob and execute the matching Playwright test suite via `npx playwright test`. Must support monorepo layouts where playwright.config.ts lives in a subdirectory.

**F2** [P0] Capture and surface structured summary
The skill must stream or capture stdout/stderr from the Playwright process and surface a structured summary (total, passed, failed, skipped, duration) to the invoking agent. Raw log must also be accessible for debugging.

**F3** [P0] Parse failing test details
The skill must parse Playwright's JSON reporter output to identify each failing test by name, file, line, and error message. Requires `--reporter=json` or merged reporter config.

**F4** [P0] Produce natural-language QA verdict
The skill must produce a natural-language QA verdict — PASS, FAIL, or BLOCKED — with a one-paragraph rationale the agent can include in its pipeline decision. BLOCKED = skill itself errored (e.g., Playwright not installed, port conflict).

**F5** [P0] Detect environment pre-condition failures
The skill must detect and surface environment pre-condition failures (missing browsers, missing .env, unreachable base URL) as BLOCKED rather than FAIL, with a remediation hint. Distinguishes infrastructure failure from test failure.

**F6** [P1] Headed/headless flag pass-through
The skill must support a `--headed` / `--headless` flag pass-through so agents can run headless by default and headed on explicit request.

**F7** [P1] Configurable retries
The skill must support retries via a configurable `--retries` parameter (default: 1) to reduce flaky-test false negatives. Maps to Playwright's `--retries` CLI flag.

**F8** [P1] Test filter parameter
The skill must expose a `filter` parameter to run a named subset of tests (by test title substring or tag) without modifying the config file. Maps to Playwright's `--grep` CLI flag.

**F9** [P1] Machine-readable result artifact
The skill must write a machine-readable result artifact (JSON) to a configurable output path so downstream pipeline steps can consume test outcomes programmatically. Default path: `.codevoyant/qa/{timestamp}-results.json`.

**F10** [P2] Markdown report
The skill must emit a short Markdown report (test table + verdict) suitable for inclusion in a Linear comment or PR description.

**F11** [P0] Graceful timeout handling
The skill must handle graceful timeout: if the test run exceeds a configurable wall-clock limit (default: 10 min), kill the process and return BLOCKED with timeout details. Prevents pipeline hangs.

## Requirements — Non-Functional

**NF1** Skill invocation latency
Target: <3 s for test suites with ≤50 tests on a standard CI runner (time from skill call to first structured output line).

**NF2** Memory footprint
Target: <100 MB RSS (skill process overhead, excluding Playwright browsers).

**NF3** Compatibility
Target: Must work with Playwright 1.40+ and Node 20+.

**NF4** Error transparency
Target: All BLOCKED verdicts must include a human-readable cause string and at least one remediation step.

**NF5** Idempotency
Target: Running the skill twice against the same code and environment must produce identical verdict and result artifact.

**NF6** No side effects on source tree
Target: The skill must not modify any tracked files; output artifacts go to `.codevoyant/` only.

**NF7** Secrets hygiene
Target: The skill must not log environment variable values; variable names may appear in debug output.

## Acceptance Criteria

- [ ] Given a project with a passing Playwright suite, invoking the skill returns a PASS verdict and a result artifact where `summary.failed === 0`.
- [ ] Given a project where one test is intentionally broken, the skill returns a FAIL verdict, and the result artifact identifies the failing test by name, file path, and error message.
- [ ] Given a project where Playwright browsers are not installed, the skill returns a BLOCKED verdict (not FAIL) and includes a remediation hint (`npx playwright install`).
- [ ] Given a base URL that is not reachable, the skill returns a BLOCKED verdict (not FAIL) and identifies the unreachable URL.
- [ ] The skill completes a 50-test suite and returns structured output within 5 minutes on a MacBook Pro M-series or equivalent CI runner.
- [ ] The `--retries 2` parameter causes Playwright to retry each failing test up to 2 times before recording it as failed, verified by inspecting the result artifact's retry counts.
- [ ] The `filter` parameter limits execution to only tests whose titles match the provided substring, confirmed by `summary.total` equaling the matched subset count.
- [ ] The result JSON artifact is written to `.codevoyant/qa/{timestamp}-results.json` and is valid JSON parseable by `JSON.parse`.
- [ ] A wall-clock timeout of 30 seconds (configured via parameter) causes the skill to kill the Playwright process and return BLOCKED with "timeout" in the cause string when pointed at a suite that takes longer than 30 seconds.
- [ ] The skill does not modify any git-tracked file; `git diff --name-only` is empty after invocation.
- [ ] Two consecutive invocations against identical code and environment produce result artifacts with equal `summary` fields and the same verdict.
- [ ] The Markdown report generated by the skill (F10) renders a table with one row per test and a verdict section when viewed in a Markdown renderer.

## Open Questions

**Q1** Should the skill support Playwright's `--project` flag to target a specific browser project (chromium/firefox/webkit), or default to whatever the config specifies?
Owner: Platform team | Due: 2026-04-01

**Q2** What is the canonical location for `playwright.config.ts` discovery — walk up from target dir, or require explicit config path parameter?
Owner: Platform team | Due: 2026-04-01

**Q3** Should BLOCKED automatically trigger a retry of the environment-setup step (e.g., run `npx playwright install`) or only surface the hint and halt?
Owner: Platform team | Due: 2026-04-07

**Q4** Is there a preference for the JSON reporter format — Playwright's native JSON, or a normalised Codevoyant test-result schema shared with future test-runner skills?
Owner: Platform team | Due: 2026-04-07

**Q5** Does the pipeline need the Markdown report (F10) in v1, or can it be deferred to v1.1 in favour of shipping F1–F9 sooner?
Owner: Platform team | Due: 2026-03-28

## Dependencies

- Playwright 1.40+ must be present as a dev dependency in the target project (`npx playwright test` must resolve).
- Node 20+ runtime available in the agent execution environment.
- `.codevoyant/` directory writable by the agent process (created on first use if absent).
- Dev skill (or equivalent) must be available upstream to apply code changes before the QA skill is invoked.
- CI/CD pipeline orchestration layer must support wall-clock timeouts ≥10 minutes to accommodate the default test-run limit.
- Linear MCP (or equivalent) available if Markdown report auto-posting to Linear comments is enabled (F10).
