# Q2 2026 Quarterly Product Roadmap

**Horizon:** Quarter — 2026-03-21 to 2026-06-20 (13 weeks)
**Products:** Platform · Codevoyant
**Owner:** Platform team
**Updated:** 2026-03-21

---

## Timeline

```
Wk   1   2   3   4   5   6   7   8   9  10  11  12  13
     +---+---+---+---+---+---+---+---+---+---+---+---+
P1   [======= Solid Foundation ========]
P2               [=========== Framework Coverage + Harness Planning ===========]
P3                                       [===== Autonomous QA + Harness =====]
     +---+---+---+---+---+---+---+---+---+---+---+---+

     Phase 1            Phase 2                        Phase 3
     Skills · DX · TS   Lo-fi PRD · SvelteKit          Playwright e2e
                        Platform · Firebase            Claw harness build
                        Perf · Claw spike
```

---

## Autonomous Pipeline (end state)

```
  Planning          Eng Planning    Implementation   Deployment      QA
  ──────────────    ─────────────   ──────────────   ───────────     ───────────
  pm:plan           em:plan         dev:* skills     platform        playwright
  lo-fi PRD skill   spec:new        TypeScript       mise            e2e skill
                                    SvelteKit        Terraform
                                    Firebase         GHA
        │                 │               │               │               │
        └─────────────────┴───────────────┴───────────────┴───────────────┘
                                 claw harness (Phase 3)
                      remote execution · continuous dev loop · scheduling
```

---

## Strategic Bets

**Autonomous pipelines require reliable primitives.**
Solidifying pm, em, dev, ux, spec before expanding produces a compounding return — every framework skill and harness feature built on top is cheaper and more stable.

**Platform engineering (mise + Terraform + GHA) is a 2-quarter uncontested window.**
No incumbent in AI-assisted developer tooling owns this coherently. We move now or cede it.

**Continuous autonomous development is the product's north star.**
The claw harness is not a test runner — it's the runtime that enables always-on, human-absent development loops. Planning this quarter; build completes this quarter.

**Existing code is the fastest path to framework skills.**
`mise-lib-templates` and `mise-gcp-templates` contain extractable skill artifacts. Extract and solidify rather than build from scratch.

---

## Phase 1 — Weeks 1–4: Solid Foundation

**Focus:** Make the existing skill pipeline reliable before expanding it.
**Dependencies:** None — this phase is the foundation; no upstream gates.

```
  ┌─────────────────────────────────────────────────────┐
  │  [P0] Skills solidification          Codevoyant     │
  │  pm, em, dev, ux, spec skills fail non-             │
  │  deterministically. Every downstream feature        │
  │  depends on this being reliable.                    │
  ├─────────────────────────────────────────────────────┤
  │  [P1] DX & config management         Codevoyant     │
  │  Poor question-asking UX and absent settings        │
  │  management slows every session. Quick wins here    │
  │  compound across all skills.                        │
  ├─────────────────────────────────────────────────────┤
  │  [P1] TypeScript skill               Codevoyant     │
  │  Highest cross-cutting early leverage. Absorbed     │
  │  into Phase 1 rather than a standalone phase slot.  │
  └─────────────────────────────────────────────────────┘
```

---

## Phase 2 — Weeks 5–9: Framework Coverage + Harness Planning

**Focus:** Extend the pipeline to real technology stacks; begin claw harness architecture.
**Dependencies:** Phase 1 skills solidification must reach its "good enough" milestone (pass criteria defined in week 2) before framework skills build begins. Claw harness spike must complete by end of week 9 to gate Phase 3.

> **Phase 2 is at-risk for capacity overload.** Six items in scope. Most likely slip candidates: Performance & speed, Firebase NoSQL modeling. Mitigation: `mise-lib-templates` and `mise-gcp-templates` reduce effort for platform/Firebase items.

```
  ┌─────────────────────────────────────────────────────┐
  │  [P0] Lo-fi PRD production skill     Codevoyant     │
  │  Most critical pipeline handoff — engineering       │
  │  agents fail without well-structured PRD input.     │
  │  Unlocks em:* and spec:* autonomous operation.      │
  ├─────────────────────────────────────────────────────┤
  │  [P1] SvelteKit skill                Codevoyant     │
  │  Primary in-repo stack. Agents cannot work          │
  │  autonomously without stack-specific coverage.      │
  ├─────────────────────────────────────────────────────┤
  │  [P1] Platform engineering skill   Platform/CV      │
  │  (mise, Terraform, GHA)                             │
  │  Deployment step is unmanned. Extractable from      │
  │  mise-lib-templates + mise-gcp-templates.           │
  ├─────────────────────────────────────────────────────┤
  │  [P1] Firebase NoSQL modeling skill Platform/CV     │
  │  Data modeling step is unmanned. mise-gcp-          │
  │  templates contains Firebase artifacts to extract.  │
  ├─────────────────────────────────────────────────────┤
  │  [P1] Performance & speed            Codevoyant     │
  │  Execution latency and memory issues erode trust.   │
  │  Parallel track — not serial after framework work.  │
  ├─────────────────────────────────────────────────────┤
  │  [P1] Claw harness architecture spike  Codevoyant   │
  │  OpenClaw integration design + build estimate.      │
  │  Gates Phase 3 build — must close by end of Wk 9.  │
  └─────────────────────────────────────────────────────┘
```

---

## Phase 3 — Weeks 10–13: Autonomous QA + Harness Build

**Focus:** Close the pipeline loop with autonomous testing and the continuous execution runtime.
**Dependencies:** Claw harness build-out requires the Phase 2 spike output (build estimate + OpenClaw integration design). Playwright e2e requires Phase 1 skills solidification to be stable — flaky underlying skills produce unreliable test generation.

```
  ┌─────────────────────────────────────────────────────┐
  │  [P0] Playwright e2e skill           Codevoyant     │
  │  QA step is entirely manual. Autonomous deployment  │
  │  without QA is unsafe and blocks production use.    │
  ├─────────────────────────────────────────────────────┤
  │  [P0] Claw harness build-out         Codevoyant     │
  │  Remote execution runtime + continuous dev loop     │
  │  + scheduling. Phase 2 spike de-risks the build.   │
  │  Requires stable skills (user constraint).          │
  └─────────────────────────────────────────────────────┘
```

---

## Not This Period

**TypeScript skill (standalone)**
Absorbed into Phase 1 as a cross-cutting item; standalone phase track adds no value given overlap.

**Additional new skill domains**
Phase 2 capacity is already at-risk; new domains would cascade delays into Phase 3.

**Eval/regression harness (separate from claw harness)**
Scope folded into claw harness — the runtime provides evaluation signal natively.

---

## Risks

**Solidification slippage cascades.**
If Phase 1 runs long, Phases 2 and 3 compress. Mitigation: define a "good enough" milestone (not perfection) — specific pass criteria to be defined by Week 2.

**Phase 2 capacity overload.**
Six items is aggressive. If two slip, Playwright e2e and claw harness both compress. Mitigation: extraction-first approach for platform/Firebase; monitor at week 6 checkpoint.

**Claw harness scope underestimated.**
OpenClaw integration may surface unknowns in the spike. Mitigation: spike must deliver a concrete build estimate before week 10; if over capacity, scope-cut to v1 runtime only (no scheduler).

**Performance & DX treated as serial.**
If deprioritized in Phase 2, becomes a user-trust drag invisible until churn. Mitigation: assign a dedicated owner separate from framework skills work.

---

## Assumptions

- Team can run Phase 1 and Phase 2 in parallel waves (solidification-then-framework, not strictly sequential)
- `mise-lib-templates` and `mise-gcp-templates` are accessible and contain extractable skill artifacts
- OpenClaw (or equivalent) is available for integration investigation in the Phase 2 spike
- No major model API changes during the quarter requiring skill rewrites

---

## Open Questions

| #   | Question                                                                                                     | Owner       | Due    |
| --- | ------------------------------------------------------------------------------------------------------------ | ----------- | ------ |
| 1   | What is the "good enough" milestone definition for skills solidification?                                    | PM          | Week 2 |
| 2   | Which specific artifacts in `mise-lib-templates` / `mise-gcp-templates` are candidates for skill extraction? | Engineering | Week 3 |
| 3   | Which OpenClaw capabilities are in scope for the Phase 2 architecture spike?                                 | Engineering | Week 5 |
| 4   | Is SvelteKit coverage sourced (existing community skill) or built net-new?                                   | Engineering | Week 4 |
| 5   | Firebase NoSQL modeling: what is the target modeling workflow (schema design, seeding, migration)?           | PM          | Week 5 |

---

## Failure Modes

### Skills solidification

- **Ships late:** All Phase 2 framework skills build on an unstable base; eval harness has nothing reliable to run against.
- **Underperforms:** Agents still fail non-deterministically; users lose trust in autonomous pipelines.
- **Rollback:** Revert per-skill via git; skills are versioned independently.

### DX & config management

- **Ships late:** Confusing question-asking persists into framework skill releases, compounding user friction.
- **Underperforms:** Users abandon multi-step flows; session dropout increases.
- **Rollback:** Feature-flag new question-asking patterns; fall back to previous prompt format per skill.

### TypeScript skill

- **Ships late:** No unblocking impact — absorbed into Phase 1; delay is low-risk.
- **Underperforms:** Agents produce non-idiomatic TypeScript; human review overhead remains high.
- **Rollback:** Remove TypeScript-specific prompt additions; revert to generic dev skill behavior.

### Lo-fi PRD production skill

- **Ships late:** Engineering agents (em:_, spec:_) cannot operate autonomously; pipeline stalls at planning handoff.
- **Underperforms:** PRDs are too vague for engineering agents; spec:\* requires heavy human editing.
- **Rollback:** Gate behind `--prd-mode=lofi` flag; default to existing pm:prd output.

### SvelteKit skill

- **Ships late:** Agents fall back to generic dev skill for SvelteKit work; in-repo autonomous development degrades.
- **Underperforms:** Agents produce non-idiomatic Svelte 5 code; runes usage incorrect; human review overhead high.
- **Rollback:** Disable SvelteKit skill; agents fall back to generic TypeScript/dev skill.

### Platform engineering skill (mise/Terraform/GHA)

- **Ships late:** Deployment step remains manual; pipeline cannot complete without human.
- **Underperforms:** Agents generate invalid Terraform or broken GHA workflows; CI fails on agent-produced config.
- **Rollback:** Feature-flag per tool (mise / Terraform / GHA independently); revert to manual workflow.

### Firebase NoSQL modeling skill

- **Ships late:** Data modeling step remains manual; Firebase-dependent features require a human architect.
- **Underperforms:** Agents produce schema designs that don't scale or violate Firebase best practices.
- **Rollback:** Disable Firebase skill; route to generic data modeling guidance in dev skill.

### Performance & speed

- **Ships late:** User-trust drag accumulates silently; likely visible as churn by Q3.
- **Underperforms:** Execution latency exceeds user tolerance; memory spikes crash long sessions.
- **Rollback:** No rollback needed — performance work is additive; revert specific optimizations that regress correctness.

### Claw harness architecture spike

- **Ships late:** Phase 3 build starts without a plan; scope ambiguity causes claw harness to slip or under-deliver.
- **Underperforms:** Spike output is too abstract to guide Phase 3; engineering re-plans during build.
- **Rollback:** Descope spike to a single integration PoC (OpenClaw connection only); defer scheduler design to next quarter.

### Playwright e2e skill

- **Ships late:** QA leg remains manual; autonomous deployment without QA is unsafe in production.
- **Underperforms:** Agents generate flaky tests; CI pass rate drops; trust in autonomous QA erodes.
- **Rollback:** Feature-flag Playwright skill; keep existing manual QA workflow as default.

### Claw harness build-out

- **Ships late:** Continuous autonomous development unavailable; Q3 roadmap items that depend on the runtime are blocked.
- **Underperforms:** Runtime is too fragile for real workloads; scheduling/remote execution fails non-deterministically.
- **Rollback:** Descope to v1 runtime only (remote execution, no scheduler); defer continuous dev loop to next quarter.
