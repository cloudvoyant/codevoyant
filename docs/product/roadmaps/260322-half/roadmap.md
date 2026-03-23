# Half-Year Product Roadmap — 2026-03-22

**Horizon:** Half-year — 2026-03-22 to 2026-09-22 (26 weeks)
**Products:** Codevoyant (open-source coding agent ecosystem)
**Owner:** Platform team
**Updated:** 2026-03-22

---

## Strategic Goal

Build the most capable open-source autonomous coding workflow system, use it to develop Codevoyant's own products at high velocity, and refine the tooling through that real usage into a complete open-source product that rivals and surpasses Augment Code. The flywheel is: better tools produce better products, which stress-test and improve the tools. By September 2026, a developer should be able to assign a multi-feature product increment to Codevoyant, walk away, and return to a working, tested, deployable result -- with persistent memory, parallel agent orchestration, and interactive monitoring that no competitor matches.

---

## Timeline

```
Wk   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26
     +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
P1   [======= Foundation ========]
P2               [=========== Framework + Harness Planning ==========]
P3                                       [===== Autonomous QA + Harness Build =====]
P4                                                                       [====== Autonomous Runtime + Memory ======]
P5                                                                                               [=== Dogfood + Open Source ===]
     +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+

     Phase 1 (Q2)           Phase 2 (Q2)              Phase 3 (Q2)            Phase 4 (Q3)               Phase 5 (Q3)
     Skills · DX · TS       Lo-fi PRD · SvelteKit     Playwright e2e          Session mgmt TUI          Dogfood: first product
                             Platform · Firebase       Claw harness build      Parallel agent dashboard   Open source packaging
                             Perf · Claw spike                                 Persistent memory          Augment Code parity push
                                                                               Workflow engine
```

---

## Capability Tiers

### Tier 1 -- Core Capabilities (must-have for the period)

**Reliable Autonomous Coding Pipeline (Phases 1-3, Wks 1-13)**

- What it enables: Agents can execute the full product development lifecycle -- plan, spec, implement, test -- without human intervention for well-scoped features. This is the load-bearing foundation; everything else depends on it.
- Why now:
  - User evidence: 66% of developers spend more time fixing AI output than they save -- [Stack Overflow 2025](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/). The "almost right" problem is the #1 barrier to autonomous workflows.
  - Research source: [User Problems research](.codevoyant/research/coding-agent-ecosystem-staged-dev/user-problems.md) -- constraint drift and inconsistent standards are a 1.5x frustration multiplier.
  - Competitive signal: OpenCode (120K stars) and Aider (39K stars) both lack structured workflow pipelines; Codevoyant's pm/em/spec/dev skill chain is structurally differentiated.
- Key bets:
  - Skills solidification (pm, em, dev, ux, spec) reaches "reliable enough for unattended execution" by Week 4
  - Lo-fi PRD skill closes the planning-to-engineering handoff gap that currently breaks autonomous pipelines
  - Framework skills (SvelteKit, Platform Engineering, Firebase) extend coverage to the primary tech stack
  - Playwright e2e skill provides the QA gate required before any agent-produced code ships

**Claw Harness: Continuous Autonomous Development Runtime (Phase 3, Wks 10-13)**

- What it enables: Remote execution of multi-step development workflows. A developer assigns work, the claw harness executes plan-implement-test-deploy cycles continuously, and the developer reviews results. This is the "walk away and come back to working code" capability.
- Why now:
  - Research source: [Staged Development Strategy](.codevoyant/research/coding-agent-ecosystem-staged-dev.md) -- "the claw harness is not a test runner, it's the runtime that enables always-on, human-absent development loops"
  - Competitive signal: OpenClaw requires 32GB RAM and complex setup; ComposioHQ is an orchestration layer without its own agent; neither provides an opinionated software development runtime -- [KDnuggets](https://www.kdnuggets.com/openclaw-explained-the-free-ai-agent-tool-going-viral-already-in-2026)
  - User evidence: Developers describe agents as "many incompetent team members whose random work output requires extensive review" -- the claw harness addresses this with structured workflow primitives and quality gates
- Key bets:
  - Phase 2 architecture spike (Wk 5-9) de-risks OpenClaw integration decisions before build
  - v1 ships with remote execution and continuous dev loop; scheduler deferred if capacity-constrained
  - Git worktree isolation per agent prevents the merge chaos that kills parallel development
  - Built-in quality gates (lint, type-check, test) at each pipeline step, not just at the end

**Persistent Project Memory (Phase 4, Wks 14-19)**

- What it enables: Agents remember architecture decisions, code patterns, user preferences, and project context across sessions. Returning to a project after days away does not require re-explaining everything. This is the single highest-value capability gap in the market.
- Why now:
  - Research source: Persistent memory achieves 26% higher response accuracy vs stateless approaches -- [Mem0 Research](https://arxiv.org/pdf/2504.19413)
  - User evidence: Session memory loss is "universally lamented" and "a fundamental architecture problem" -- [Oracle Developers Blog](https://blogs.oracle.com/developers/agent-memory-why-your-ai-has-amnesia-and-how-to-fix-it)
  - Competitive signal: Augment Code's Context Engine (semantic indexing of 1M+ files, cross-session persistence) is their primary moat. Their Context Engine MCP validates the market -- but it's fully closed-source. An open equivalent is the single most strategically powerful thing Codevoyant can build. -- [Competitive research](.codevoyant/research/coding-agent-ecosystem-staged-dev/competitive.md)
  - Competitive signal: Mastra Code markets "observational memory that never compacts" as a differentiator, confirming market demand -- [Mastra Blog](https://mastra.ai/blog/announcing-mastra-code)
- Key bets:
  - Extends the existing mem:* system (learn, find, list, index) rather than building from scratch
  - Automatic context loading based on active files/features -- not just manual memory queries
  - Decision history: every significant agent choice is logged with rationale, queryable later
  - Cross-agent memory sharing: when parallel agents work on the same project, one agent's discoveries inform the others
  - [DESIGN DECISION] Build as an open-source MCP server (like Augment's Context Engine MCP, but open). This positions Codevoyant's memory layer as shared infrastructure any coding agent can use -- not just our own

**Parallel Agent Orchestration and Monitoring (Phase 4, Wks 14-19)**

- What it enables: An orchestrator that is itself a Codevoyant agent — with a TUI as its primary interface — dispatches and monitors 3-5 coding agents in parallel. Because the orchestrator is an agent, it can be tested with the same skill harness as any other agent, integrated into workflow pipelines natively, and extended with skills. The TUI is the surface, not the product; the agent is the product. A single developer operates like a team lead managing multiple engineers, in the terminal, over SSH, without a GUI.
- Why now:
  - Research source: [Ideation research](.codevoyant/research/coding-agent-ecosystem-staged-dev/ideation.md) -- "parallel agent execution is the acknowledged single biggest productivity unlock but tooling is fragmented"
  - User evidence: Developers are building DIY solutions (tmuxcc, Conduit, agent-deck) to monitor parallel agents -- [GitHub tmuxcc](https://github.com/nyanko3141592/tmuxcc), [Conduit](https://getconduit.sh/). The workaround ecosystem proves the demand. All of them are passive dashboards -- none is itself an agent that can intervene, re-plan, or spawn new work.
  - Competitive signal: ComposioHQ agent-orchestrator offers pluggable parallel orchestration but is an orchestration layer only, not integrated with a coding agent. Augment's Intent provides multi-agent orchestration but is macOS Apple Silicon only and GUI-only -- no terminal interface, no testable agent primitive.
  - Architectural advantage: framing the orchestrator as an agent means workflow orchestration can be tested and validated in the skill harness before a web dashboard is ever needed. It also defers the decision of whether to build a web UI -- the TUI is fully functional and the upgrade path exists when the time is right.
- Key bets:
  - [DESIGN DECISION] The orchestrator is a Codevoyant agent, not a standalone tool. It speaks the same skill language (plan -> spec -> implement -> test), uses the same memory layer, and is testable with the same e2e harness. The TUI is its primary interactive surface.
  - TUI renders real-time state: all running agents, current task, progress, and token burn -- but the orchestrator agent drives the state, not the TUI
  - Session management: list, search, resume, and branch past sessions (addresses the gap that spawned coding_agent_session_search)
  - Intervention controls: pause, redirect, or terminate individual sub-agents from the TUI -- mediated through the orchestrator agent, not direct process signals
  - The agent-as-orchestrator pattern enables future web dashboard as a thin client over the same agent API, with zero re-architecture

### Tier 2 -- Growth Capabilities (high value, pursue if bandwidth)

**Workflow Engine: Declarative Development Pipelines (Phase 4, Wks 17-22)**

- What it enables: Define multi-step development workflows as declarative YAML (PRD -> spec -> implement -> test -> deploy) that the claw harness executes. Moves from "agents run skills" to "agents execute entire development processes."
- Why now:
  - Research source: [Staged Development Strategy](.codevoyant/research/coding-agent-ecosystem-staged-dev.md) -- Stage 3 "Enhanced Agent Intelligence" identifies the workflow engine as the bridge from fast agents to smart agents
  - Competitive signal: No open-source competitor offers declarative development pipelines. OpenClaw has workflow primitives but they are generic (not software-development-specific). This is genuine white space.
  - [DESIGN DECISION] Prioritize the workflow engine over agent specialization framework. Workflows create immediate leverage for dogfooding; role specialization is valuable but can be approximated with system prompts in v1
- Key bets:
  - YAML-defined pipelines with conditional steps, quality gates, and rollback rules
  - Built-in pipeline templates for common patterns (greenfield feature, bug fix, refactor, migration)
  - Pipeline execution feeds into the monitoring TUI -- each step is visible and interruptible
  - Pipeline results produce structured artifacts (diffs, test reports, deployment URLs) for human review

**Agent Specialization Framework (Phase 4-5, Wks 19-24)**

- What it enables: Define agent "roles" (architect, implementer, reviewer, tester) with distinct system prompts, tool access, and quality criteria. The multi-agent team pattern that OpenClaw supports but without the infrastructure overhead.
- Why now:
  - Research source: [Staged Development Strategy](.codevoyant/research/coding-agent-ecosystem.md) -- "Agent specialization framework: define agent roles with distinct system prompts, tool access, and quality criteria"
  - User evidence: Context pain increases with experience -- 52% of seniors vs 41% of juniors report AI missing contextual relevance. Specialized agents with narrower scope produce more contextually appropriate output.
  - Competitive signal: Augment's Intent uses a Coordinator -> parallel Implementors -> Verifier pattern. This three-tier model is architecturally sound. Build the open-source equivalent.
- Key bets:
  - Role definitions as portable configuration (YAML or JSON) -- not hardcoded
  - Inter-agent communication protocol: architect output feeds directly into implementer context
  - Quality criteria per role: reviewer agents enforce standards that implementer agents may miss
  - [DESIGN DECISION] Start with 4 built-in roles (architect, implementer, reviewer, tester) and make custom roles possible. Do not over-engineer the role framework before real usage reveals what matters

**Product Scaffolding Skills (Phase 5, Wks 20-26)**

- What it enables: Agents can scaffold entire product repositories (SvelteKit + database + auth + CI/CD + deployment) in one command, then immediately begin building features. Reduces "new product" setup from days to minutes.
- Why now:
  - Research source: [Staged Development Strategy](.codevoyant/research/coding-agent-ecosystem-staged-dev.md) -- Stage 2 "Product Scaffolding Skills" enables the "say 'build me a publishing platform' and agents handle it" workflow
  - [DESIGN DECISION] Scope scaffolding skills to the stacks we actually use (SvelteKit, Firebase/PostgreSQL, mise) rather than trying to be framework-agnostic from day one. Dogfooding validates the patterns before generalizing
- Key bets:
  - Project bootstrap skill: scaffold from template with SvelteKit, database, auth, CI/CD, deploy config
  - Database modeling skill: extend Firebase NoSQL to cover SQLite and PostgreSQL with schema design, seeding, and migration
  - Auth scaffolding skill: standard patterns (OAuth, magic link, session management) as agent-executable templates
  - These skills directly accelerate building the first dogfood product (likely Readership)

**Dogfood: First Revenue Product Build (Phase 5, Wks 21-26)**

- What it enables: Use the autonomous coding pipeline, claw harness, memory, orchestration, and workflow engine to build the first Codevoyant product at high velocity. This simultaneously proves the tooling and generates revenue potential.
- Why now:
  - Research source: [Staged Development Strategy](.codevoyant/research/coding-agent-ecosystem.md) -- "each stage creates leverage for the next. Skills make agents useful. Orchestration makes agents powerful. Products prove the value."
  - Research source: Teams using open-source tools report 73% faster development cycles -- [Index.dev](https://www.index.dev/blog/open-source-tools-for-developers). Dogfooding validates this claim with our own data.
  - [DESIGN DECISION] Which product to build first is an open question, but Readership (publishing platform) has the lowest technical risk per the staged development research. Defer this decision to Week 16 when the tooling is more mature and a targeted pm:explore can inform the choice.
- Key bets:
  - The product is built almost entirely by Codevoyant agents, with human review and strategic direction
  - Document the development process publicly as a case study -- this is the most powerful marketing asset possible
  - Every friction point discovered during dogfooding becomes a tooling improvement, creating the feedback loop
  - Target: functional MVP by Week 26 that demonstrates the full autonomous pipeline

**Open Source Packaging and Community (Phase 5, Wks 22-26)**

- What it enables: Package Codevoyant as a cohesive open-source product with documentation, onboarding, and community infrastructure that can compete with OpenCode (120K stars) and Aider (39K stars) for developer mindshare.
- Why now:
  - Research source: OpenCode has 120K+ GitHub stars and 5M monthly developers; Aider has 39K stars and 4.1M installs -- open-source coding agent demand is massive and proven -- [OpenCode](https://opencode.ai/)
  - Competitive signal: Augment Code is fully closed-source with pricing backlash (two model changes in 6 months, sunsetting completions). The open-source alternative that matches their memory/context capabilities without the enterprise tax would be strategically devastating.
  - [WEAK EVIDENCE -- recommend pm:explore for community-building strategy specifically]
- Key bets:
  - Codevoyant website and documentation site (VitePress, already scaffolded)
  - Cross-agent compatibility testing (Claude Code, OpenCode, Codex CLI, Aider) -- per the portable-agent-skills plan
  - GitHub presence, contributor guidelines, and issue templates
  - [DESIGN DECISION] Position Codevoyant as "the skill and orchestration layer for any coding agent" -- not as a replacement for Claude Code or OpenCode, but as the layer that makes them dramatically more capable

### Tier 3 -- Future Capabilities (invest lightly, validate direction)

**AstralCloud Foundation Research (Wks 23-26, research only)**

- What it enables: Validated architecture and technical design for the deployment platform that will eventually close the full build-deploy-monitor loop.
- Why now:
  - Research source: Railway raised $100M Series B on "push code, get a running app" -- validates container-first DX as a business model -- [The Software Scout](https://thesoftwarescout.com/fly-io-vs-railway-2026-which-developer-platform-should-you-deploy-on/)
  - Research source: Platform engineering IDPs reduce cognitive load by 40-50% -- [Platform Engineering](https://platformengineering.org/blog/platform-engineering-tools-2026)
  - [ASSUMPTION -- unvalidated]: Whether developers would pay more for integrated agent + deployment vs separate tools. No precedent found for this specific combination.
- Key bets:
  - Run dev:explore on container runtime abstraction (Docker/Podman wrapper with mise/devbox integration)
  - Research the "extract from product deployments" approach -- by Wk 26, Readership will have a deployment target to extract patterns from
  - Do NOT build AstralCloud this period. Research and architecture only. The products must come first.

**Inter-Agent Communication Protocol (Wks 20-26, design only)**

- What it enables: Agents pass context, findings, and artifacts to each other directly. The architect agent's output feeds into the implementer; the implementer's changes feed into the reviewer. Currently this handoff is mediated through files; a protocol makes it structured and reliable.
- Why now:
  - Research source: [Staged Development Strategy](.codevoyant/research/coding-agent-ecosystem-staged-dev.md) -- identified as part of Stage 3 "Enhanced Agent Intelligence"
  - [ASSUMPTION -- unvalidated]: The value of structured inter-agent communication vs. the current file-mediated approach is unproven. Real usage during dogfooding will reveal whether this is essential or nice-to-have.
- Key bets:
  - Design the protocol during dogfooding; do not build until pain is validated
  - Likely pattern: structured JSON messages with type, sender role, artifact references, and priority
  - Consider whether MCP is the right transport or whether a simpler approach suffices
- [PREREQUISITE NOTE] The orchestrator agent (Tier 1, Wks 14-19) currently assumes a hub-and-spoke model: all sub-agent communication is mediated through the orchestrator, not peer-to-peer. This sidesteps the need for a formal inter-agent protocol in Phase 4. If the Agent Specialization Framework (Tier 2) requires direct role-to-role handoffs (architect -> implementer), this protocol becomes a prerequisite for that capability, not just a Tier 3 future item. Revisit at Week 18 once the orchestrator's real communication patterns are known.

---

## What We Are NOT Doing

- **Building AstralCloud this period.** The deployment platform is a Q4 2026+ initiative. This period is about building the tools that make AstralCloud possible and extracting deployment patterns from real product builds. Premature platform investment diverts resources from the tooling flywheel.

- **Competing as a coding agent.** Codevoyant is not a replacement for Claude Code, OpenCode, or Aider. It is the skill, orchestration, and memory layer that makes any of them dramatically more capable. This positioning avoids a direct fight with well-funded incumbents and instead becomes the layer they all want to integrate with.

- **Pursuing enterprise features.** SOC 2, SAML, team management, and multi-tenant isolation are not relevant until there is a product generating revenue and enterprise customers requesting them. Premature enterprise investment is a classic startup mistake. *Deferred to H1 2027 at earliest; revisit when a revenue product and enterprise demand exist.*

- **Building a GUI/IDE integration.** Terminal-first, TUI-first. Augment's Intent is GUI-only (macOS Apple Silicon). We go where they are not: terminal-native, cross-platform, works over SSH. The orchestrator agent architecture means a web dashboard is a thin client upgrade when the time comes -- not a rebuild. GUI is deferred until the agent primitive and TUI are proven.

- **Supporting every framework from day one.** Scaffolding and framework skills target SvelteKit, Firebase/PostgreSQL, and mise specifically. Generalization happens after dogfooding validates the patterns.

- **Revenue optimization.** No pricing strategy, monetization model, or business development this period. The focus is on building the best tool. Revenue follows from products built with the tool, not from the tool itself. *Revisit in H2 2026 once a dogfood product exists as the basis for a value proposition.*

---

## Risks

**Phase 1-3 (Q2 roadmap) slippage cascades into Phases 4-5.**
The entire second half depends on a working autonomous pipeline. If skills solidification or the claw harness slip, Phases 4-5 compress or defer. Mitigation: the Q2 roadmap already has explicit milestones, checkpoints, and scope-cut paths defined.

**Persistent memory is architecturally harder than expected.**
Building an open-source equivalent of Augment's Context Engine is ambitious. Semantic indexing of large codebases, efficient retrieval, and cross-session persistence are non-trivial. Mitigation: build incrementally on the existing mem:* system; start with decision history and automatic context loading before attempting full semantic indexing.

**Dogfood product choice is wrong.**
Picking the wrong first product wastes the second half's primary validation opportunity. Mitigation: defer the decision to Week 16 with a targeted pm:explore; use the "lowest technical risk" heuristic (currently Readership) as the default.

**Parallel agent orchestration introduces non-determinism.**
Multiple agents working on the same codebase create merge conflicts, race conditions, and inconsistent state. Mitigation: git worktree isolation is mandatory; the orchestrator must prevent agents from touching the same files; quality gates catch conflicts before merge.

**Open-source community building is a different skill than product building.**
Developer community engagement, contributor experience, and open-source governance require dedicated attention. If treated as an afterthought, the open-source positioning fails. Mitigation: start community infrastructure in Phase 5 but recognize this may need dedicated investment in the next half.

**Augment Code ships an open-source component.**
Augment's Context Engine MCP is already available as a standalone tool. If they open-source more of their stack, Codevoyant's differentiation narrows. Mitigation: move fast on the memory layer; our advantage is that the entire system is open-source, not just one component. Augment's $252M raised and $20M ARR with 188 employees creates structural pressure against full open-sourcing.

---

## Assumptions

- The Q2 2026 quarterly roadmap (Phases 1-3) executes on schedule or within 2 weeks of plan
- A single developer (or very small team) can execute this roadmap with heavy agent assistance from the tooling built in earlier phases
- OpenClaw or equivalent is viable for integration in the claw harness
- Claude Code, OpenCode, and Codex CLI APIs remain stable enough for cross-agent skill portability
- No major model capability regressions during the period

---

## Open Questions

- Which revenue product should be built first during dogfooding? Current default is Readership (lowest technical risk) but needs validation via pm:explore by Week 16.
- What is the minimum viable persistent memory system? Full semantic indexing (Augment-level) or decision history + automatic context loading?
- How does the claw harness interact with the orchestrator agent? Does the orchestrator dispatch claw harness sessions, or does claw harness become a capability the orchestrator agent invokes as a skill?
- Should Codevoyant adopt OpenClaw's Lane Queue model wholesale or build a lighter-weight alternative?
- What is the realistic capacity model for one developer executing Phases 4-5 while the tooling from Phases 1-3 is still maturing?
- How should Codevoyant's open-source memory layer be positioned relative to Augment's Context Engine MCP?
- Is the portable-agent-skills standard gaining traction with other tools? Cross-agent compatibility is only valuable if other agents adopt it.

---

## Suggested PRDs

- **Persistent Project Memory System** -- Architecture and implementation plan for the open-source memory layer (MCP server, decision history, automatic context loading, cross-agent memory sharing). This is the single most strategically important PRD.
- **Orchestrator Agent + TUI** -- The orchestrator as a first-class Codevoyant agent with a TUI as its primary surface. Session management, sub-agent dispatch, real-time state rendering, intervention controls, token cost tracking. Architecture covers the agent primitive first, TUI rendering second — web dashboard deferred as a thin client upgrade.
- **Workflow Engine: Declarative Development Pipelines** -- YAML pipeline definition, built-in templates, quality gates, integration with claw harness and monitoring TUI.
- **Agent Specialization Framework** -- Role definitions, inter-agent communication, quality criteria per role, built-in roles (architect, implementer, reviewer, tester).
- **Product Scaffolding Skills** -- Project bootstrap, database modeling, auth scaffolding for the dogfood product build.
- **Open Source Packaging and Community Launch** -- Documentation site, cross-agent testing, GitHub presence, contributor experience, positioning strategy.
- **Dogfood Product Selection** -- pm:explore to evaluate Readership vs Journey vs OnlyHuman as the first product, including market sizing, technical risk, and strategic fit.
