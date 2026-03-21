# 260321 SvelteKit Skill PRD

**Scope:** project
**Product:** Codevoyant
**Linear:** (none)
**Owner:** Platform team
**Status:** draft
**Updated:** 2026-03-21

```
  Planning → Eng Planning → [Implementation] → Deployment → QA
                                    │
                            [THIS] SvelteKit skill
                            Agents write idiomatic Svelte 5 / SvelteKit code
```

## Problem

AI coding agents working on SvelteKit codebases consistently produce code that violates current Svelte 5 idioms — using deprecated Options API syntax instead of runes, misusing `$state`/`$derived`/`$effect`, misrouting load functions, or generating form actions that bypass SvelteKit conventions — requiring human review and correction on nearly every file touched. This slows delivery on the primary in-repo stack, undermines autonomous agent execution (the core value proposition of Codevoyant), and forces developers to act as syntax correctors rather than reviewers. Without stack-specific skill coverage in Phase 2, agents cannot operate autonomously on the most-used codebase in the platform team's portfolio.

## Goals

### Leading Indicators

> Adoption and activation signals — measurable within days/weeks of launch.

- SvelteKit skill adoption rate among platform team agents: from 0% to 80% of sessions within 2 weeks of release
  - Source: Agent session logs; this mirrors activation patterns seen in `dev:commit` rollout where skill presence in project config drove near-immediate team adoption.
- Human corrections per SvelteKit PR: from ~8 syntax/idiom corrections per PR (observed average across last 10 SvelteKit PRs) to ≤2 per PR within 3 weeks of release
  - Source: PR review comment history in the primary in-repo SvelteKit project; runes-related corrections are the dominant category.
- Agent self-correction rate (agent re-generates without human nudge): from 0% to ≥70% of runes/routing errors caught before commit
  - Source: `dev:commit` pre-flight check logs; this measures whether the skill's inline guidance triggers self-correction during authorship.

### Lagging Indicators

> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.

- SvelteKit PRs merged without human syntax corrections: from ~20% to ≥75% by 2026-05-31
  - Source: PR merge history; a PR is counted "clean" if it receives zero runes/routing/form-action correction comments post-review.
- Agent session abandonment rate on SvelteKit tasks (agent stalls or asks human to take over): from ~35% of complex SvelteKit tasks to ≤10% by 2026-06-30
  - Source: Spec plan execution logs; abandonment is logged when an agent emits an explicit "I need help" signal or leaves a task in the `blocked` state.
- Reduction in time-to-merge for SvelteKit feature tasks: from average 3.2 days to ≤1.8 days by 2026-06-30
  - Source: Linear issue cycle time for issues tagged `[sveltekit]`; reduced back-and-forth on syntax corrections is the primary driver.

## Non-Goals

- This skill does not cover Vue, React, Astro, or any non-SvelteKit frontend stack.
- This skill does not replace the `dev:commit` or `dev:ci` skills; it adds stack-specific knowledge, not a new commit or CI workflow.
- This skill does not generate full application scaffolds or replace `npx sv create`; it guides idiomatic code authorship within an existing project.
- This skill does not enforce linting or run build checks — those remain in `dev:ci`.
- This skill does not cover Svelte 4 (Options API / legacy reactive declarations `$:`); Svelte 4 support is explicitly out of scope.
- This skill does not cover server-side infrastructure beyond SvelteKit's built-in adapter model (no custom Node/Deno server configuration).
- This skill does not manage SvelteKit deployment pipelines.

## Users

Primary: Platform team AI coding agents (Claude Code) executing autonomous development tasks on the primary SvelteKit in-repo codebase, where the agent must produce idiomatic Svelte 5 + SvelteKit code without prompting for human syntax review. Secondary: individual developers on the platform team who use Codevoyant interactively to get SvelteKit-aware code suggestions and catch runes misuse before committing.

## Requirements — Functional

**F1** [P0] Svelte 5 runes syntax rules
Skill must encode Svelte 5 runes syntax rules: `$state`, `$derived`, `$props`, `$effect`, `$bindable`, and `$inspect` — covering correct declaration, reactivity semantics, and common misuse patterns. Must cover: declaring state outside functions, derived from non-reactive source, effect loops.

**F2** [P0] SvelteKit file-system routing conventions
Skill must encode SvelteKit file-system routing conventions: `+page.svelte`, `+page.server.ts`, `+layout.svelte`, `+layout.server.ts`, `+error.svelte`, `+server.ts` — naming, placement, and purpose of each. Must include param routing `[slug]` and optional `[[optional]]` patterns.

**F3** [P0] `load` function patterns
Skill must encode `load` function patterns: universal vs. server-only load, `PageLoad` vs. `PageServerLoad` types, `depends()`, `invalidate()`, `invalidateAll()`, streaming with promises. Must distinguish client-safe vs. server-only data access.

**F4** [P0] Form actions
Skill must encode form actions: named vs. default actions, `+page.server.ts` action handlers, `enhance` progressive enhancement, `fail()`, `redirect()`, `error()` helpers. Must include `use:enhance` client-side binding pattern.

**F5** [P1] SvelteKit hooks
Skill must encode SvelteKit hooks: `handle`, `handleError`, `handleFetch` in `hooks.server.ts`; `reroute` in `hooks.ts`. Common source of agent errors in auth/middleware scenarios.

**F6** [P1] `$app/*` module usage
Skill must encode `$app/*` module usage: `$app/navigation`, `$app/stores`, `$app/environment`, `$app/paths` — which are client-only vs. universal. Agents regularly import server-incompatible modules on server-side paths.

**F7** [P1] Pre-authorship checklist
Skill must provide a pre-authorship checklist the agent runs before generating any SvelteKit file (identify file type → select correct conventions). Checklist must be embedded as an inline decision tree in SKILL.md.

**F8** [P1] Self-review step
Skill must include a self-review step the agent runs after generating SvelteKit code (scan for legacy `$:` syntax, Options API component structure, misplaced `load` exports). Reduces need for human correction; complements `dev:commit` pre-flight.

**F9** [P1] References directory
Skill must include a references directory with a Svelte 5 runes quick-reference and a SvelteKit routing cheat sheet. References are surfaced via `mcp__plugin_svelte_svelte__get-documentation` calls when available.

**F10** [P2] Svelte MCP plugin integration
Skill must integrate with the Svelte MCP plugin (`mcp__plugin_svelte_svelte__*`) when available: fetch live docs before authoring, use `svelte-autofixer` for post-generation correction passes. Graceful degradation required — skill must work fully offline without MCP.

**F11** [P1] Distribution via `npx skills add`
Skill must be installable via the existing `npx skills add` distribution mechanism and appear in `dev:allow` permission set. No new distribution infrastructure required.

**F12** [P2] `sveltekit:allow` sub-skill
Skill must include a `sveltekit:allow` sub-skill for pre-approving SvelteKit skill permissions in unattended agent runs. Follows the pattern established by `dev:allow`, `spec:allow`.

## Requirements — Non-Functional

**NF1** SKILL.md line limit
Target: ≤600 lines (references in separate files, not inlined). Skill SKILL.md must remain under 600 lines to stay within context-efficient range for repeated skill invocations.

**NF2** Pre-authorship checklist automation
Target: 0 human interactions required to run checklist. Pre-authorship checklist must complete in a single LLM pass with no user input required.

**NF3** Self-review call overhead
Target: ≤1 additional call per file generated. Self-review step must add no more than one additional LLM call to a typical file-generation task.

**NF4** Graceful degradation without Svelte MCP
Target: 0 hard failures when Svelte MCP is absent. Skill must degrade gracefully when `mcp__plugin_svelte_svelte__*` tools are unavailable (no errors, no blocking prompts).

**NF5** Cross-agent compatibility
Target: Passes compatibility check on all three agents. Skill must be compatible with Claude Code, OpenCode, and VS Code Copilot (no platform-specific APIs in core path).

**NF6** Reference staleness indicator
Target: Reference files include `last-verified:` date in frontmatter. References must be kept current with SvelteKit stable releases; a staleness indicator must be present in each reference file header.

## Acceptance Criteria

- [ ] `skills/sveltekit-allow/SKILL.md` and `skills/sveltekit-code/SKILL.md` exist and are valid skill files with correct frontmatter
- [ ] Running the skill on a test SvelteKit task produces zero occurrences of legacy `$:` reactive declarations in generated code
- [ ] Running the skill on a test SvelteKit task produces zero occurrences of Options API component structure (`export default { ... }`)
- [ ] A `+page.server.ts` generated by an agent following the skill correctly exports a `load` function typed as `PageServerLoad` (not `PageLoad`)
- [ ] A form action generated by an agent following the skill correctly uses `fail()` and `redirect()` from `@sveltejs/kit` rather than raw `Response` objects
- [ ] The pre-authorship checklist (F7) runs end-to-end on a new file request without requiring human input
- [ ] The self-review step (F8) catches at least 4 of 5 intentionally injected runes errors in a test file
- [ ] `skills/sveltekit-code/references/` contains at minimum: `runes-quickref.md` and `routing-cheatsheet.md`
- [ ] When `mcp__plugin_svelte_svelte__get-documentation` is unavailable, the skill completes a full file-generation task without errors or blocked states
- [ ] `dev:allow` SKILL.md includes the `sveltekit` permission set
- [ ] The skill is listed in the repo's skill index and passes `npx @codevoyant/agent-kit skill validate`
- [ ] At least one e2e test in `e2e/` covers the SvelteKit skill generating a route with a load function and form action

## Open Questions

**Q1** Unified skill vs. split sub-skills
Should `sveltekit:code` be a single unified skill or split into `sveltekit:components`, `sveltekit:routing`, `sveltekit:actions`? A unified skill keeps context load low; splits allow targeted invocation.
Owner: Platform team | Due: 2026-04-04

**Q2** Svelte MCP plugin subscription requirements
Does the Svelte MCP plugin (`mcp__plugin_svelte_svelte__svelte-autofixer`) require a paid subscription or special configuration? If so, the F10 integration path needs a fallback spec.
Owner: Platform team | Due: 2026-04-04

**Q3** Svelte 4 detection behavior
Should the skill emit a warning when it detects the project is on Svelte 4 (detected via `package.json` svelte version)? Or fail fast with an explicit unsupported-version message?
Owner: Platform team | Due: 2026-04-11

**Q4** Runes test fixture availability
Is there an existing runes test fixture in the repo that can seed the e2e acceptance test, or does one need to be created from scratch?
Owner: Platform team | Due: 2026-04-11

**Q5** `sveltekit:allow` as standalone or flag variant
Should `sveltekit:allow` be a standalone skill directory or a flag variant of `dev:allow`?
Owner: Platform team | Due: 2026-04-18

## Dependencies

- `dev:allow` skill — must be updated to include the `sveltekit` permission set (F11)
- `dev:commit` skill — self-review step (F8) is designed to complement, not replace, the commit pre-flight; sequencing must be documented
- `mcp__plugin_svelte_svelte__*` MCP plugin — optional integration (F10); skill must not hard-depend on it
- SvelteKit stable release channel — references (F9) must track the canonical `@sveltejs/kit` and `svelte` npm packages; staleness policy (NF6) applies
- `npx @codevoyant/agent-kit skill validate` — distribution and validation toolchain must support the new skill before release
- Phase 2 roadmap gate — this skill is the P1 deliverable for Weeks 5–9; no Phase 3 work (additional stack skills) should begin until acceptance criteria above are met
