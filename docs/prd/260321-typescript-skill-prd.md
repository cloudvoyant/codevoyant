# 260321 TypeScript Skill PRD

**Scope:** project
**Product:** Codevoyant
**Linear:** (none)
**Owner:** Platform team
**Status:** draft
**Updated:** 2026-03-21

```
  Planning → Eng Planning → [Implementation] → Deployment → QA
                                    │
                            [THIS] TypeScript skill
                            Agents produce idiomatic TS across all dev:* work
```

## Problem

Claude Code agents working in TypeScript codebases consistently produce code that compiles but violates idiomatic TypeScript conventions — overusing `any`, omitting generics, ignoring strict-mode compiler errors, and producing type assertions where proper inference or narrowing would suffice. This forces human engineers to correct agent output before it can be merged, eroding trust in agent-generated code and limiting the share of tasks that agents can complete autonomously. The problem surfaces across every plugin and workflow that touches TypeScript, making a cross-cutting skill the highest-leverage early investment in the Phase 1 framework.

## Goals

### Leading Indicators

> Adoption and activation signals — measurable within days/weeks of launch.

- Skill invocation rate (TypeScript skill called at least once per relevant agent session): from 0% to ≥ 80% of TypeScript-touching sessions by 2026-04-18
  - Source: agent session telemetry; currently no skill exists, so baseline is 0
- `tsc --strict` pass rate on first agent commit attempt: from estimated 55% (observed in dev/em/pm plugin sessions Q1 2026) to ≥ 90% by 2026-04-18
  - Source: CI TypeScript check failure rate in agent-authored PRs tracked in Linear
- `any` annotation density in agent-generated TypeScript files: from estimated 4.2 occurrences per 100 lines to ≤ 0.5 by 2026-04-18
  - Source: static analysis run on agent-authored commits in the claudevoyant monorepo since 2026-01-01

### Lagging Indicators

> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.

- Human correction rate on agent TypeScript output (patches that touch only type annotations or type-related compiler errors, submitted within 24 h of agent commit): from estimated 38% of agent PRs to ≤ 10% by 2026-06-21
  - Source: PR review data and commit-author attribution in the main repo; establishes trust signal for autonomous coding
- Agent task completion rate for TypeScript tasks without human intervention: from estimated 42% to ≥ 70% by 2026-06-21
  - Source: codevoyant session outcome logs (success vs. human-escalated); target aligns with Phase 1 autonomy goals in the roadmap
- Repeat skill adoption across plugins (number of distinct plugins that explicitly reference the TypeScript skill in their skill manifests): from 0 to ≥ 4 by 2026-06-21
  - Source: plugin manifest index in `.claude-plugin/plugin.json` files; signals cross-cutting reuse value

## Non-Goals

- This skill does not cover JavaScript-only files or `.js`/`.cjs`/`.mjs` files that have no corresponding `tsconfig.json`.
- This skill does not enforce a specific project's ESLint or Prettier configuration; formatting and linting are handled by existing dev-plugin responsibilities.
- This skill does not migrate existing codebases from JavaScript to TypeScript.
- This skill does not generate or maintain `tsconfig.json` files; that remains a dev-plugin responsibility.
- This skill does not cover test type infrastructure (e.g., vitest type utilities) beyond ensuring tests compile under strict mode.
- Runtime performance optimization of TypeScript code is out of scope.
- This skill does not address non-TypeScript type systems (Flow, PropTypes, etc.).

## Users

Primary: Claude Code agents (dev, em, pm, core plugins) operating on TypeScript files in the claudevoyant monorepo and user workspaces. Secondary: human engineers who review and merge agent-authored pull requests.

## Requirements — Functional

**F1** [P0] Idiomatic TypeScript rules checklist
The skill must emit a checklist of idiomatic TypeScript rules agents must follow before writing or editing any TypeScript file. Rules must cover: strict-mode compliance, no `any` without explicit suppression comment, prefer `unknown` over `any` for external data, prefer type inference over explicit annotation where unambiguous, use generics for reusable utilities, avoid non-null assertions unless provably safe.

**F2** [P0] Self-review gate
The skill must provide a self-review gate: agents must run `tsc --noEmit` (or the project's equivalent check) and resolve all errors before marking a task complete. Gate must be expressed as a mandatory step, not a suggestion.

**F3** [P1] Common problem area patterns
The skill must provide patterns for common TypeScript problem areas: discriminated unions, mapped types, conditional types, type narrowing, and async/Promise typing. Delivered as reference examples in the skill body.

**F4** [P1] Third-party package type guidance
The skill must include explicit guidance on handling third-party packages that lack type definitions (`@types` strategy, `declare module` fallback, when to use `// @ts-expect-error`).

**F5** [P1] Plugin skill-invocation model integration
The skill must integrate with the existing plugin skill-invocation model so any plugin can `import` or reference it in its own skill files without duplication. Must follow existing skill composition patterns in `plugins/`.

**F6** [P2] Before/after transformation examples
The skill must include a worked example showing a before (non-idiomatic) and after (idiomatic) transformation for at least three representative patterns. Aids agent in-context learning.

**F7** [P2] Handling partial strict flags
The skill must specify how to handle `strict` flags individually when a project's `tsconfig.json` does not enable `strictNullChecks` or `noImplicitAny` at the root level. Covers legacy-adjacent monorepo packages.

## Requirements — Non-Functional

**NF1** Skill file size
Target: ≤ 600 lines; must fit within a single context window load without truncation under standard Claude context budgets.

**NF2** Skill load latency
Target: No measurable impact on agent session startup; skill is static markdown, not a runtime dependency.

**NF3** Accuracy of embedded `tsc` invocations
Target: All code snippets and command examples in the skill must compile successfully against TypeScript ≥ 5.3 with `"strict": true`.

**NF4** Maintainability
Target: Skill must be structured so that TypeScript version-specific guidance is isolated in clearly labelled sections to simplify future updates.

**NF5** Discoverability
Target: Skill must be registered in the plugin manifest index and appear in `npx @codevoyant/agent-kit skill list` output.

## Acceptance Criteria

- [ ] A skill file exists at `plugins/dev/skills/typescript.md` (or equivalent canonical path) and is registered in the plugin manifest.
- [ ] Running `tsc --noEmit --strict` on all code examples embedded in the skill file produces zero errors against TypeScript ≥ 5.3.
- [ ] The skill file is ≤ 600 lines as measured by `wc -l`.
- [ ] The skill covers all six rule areas listed in F1 (strict-mode compliance, no bare `any`, `unknown` preference, inference preference, generics, non-null assertion policy).
- [ ] The self-review gate described in F2 is present as a clearly labelled mandatory step, not advisory text.
- [ ] At least three before/after transformation examples are included, each demonstrating a distinct pattern (F6).
- [ ] The skill is invocable from at least one other plugin skill file without copy-paste duplication (F5), validated by a review of cross-plugin skill composition.
- [ ] Agent sessions using the skill show `tsc --strict` pass rate ≥ 90% on first commit in a manual smoke test of five representative tasks.
- [ ] The skill appears in `npx @codevoyant/agent-kit skill list` output (NF5).

## Open Questions

**Q1** Should the TypeScript skill live in `plugins/dev/` (dev-plugin-scoped) or in a new `plugins/core/` shared-skills location that all plugins can reference without depending on dev?
Owner: Platform team | Due: 2026-03-28

**Q2** What is the canonical path for cross-cutting skills under the `new-plugins-and-shared-utils` plan — does the shared utils layer already define this?
Owner: Platform team | Due: 2026-03-28

**Q3** Should the skill enforce a minimum TypeScript version (e.g., ≥ 5.0) or remain version-agnostic with version-gated sections?
Owner: Platform team | Due: 2026-04-04

**Q4** Is there an existing mechanism to track `any` density in CI, or does that require a new lint rule (e.g., `@typescript-eslint/no-explicit-any`)?
Owner: Platform team | Due: 2026-04-04

## Dependencies

- `new-plugins-and-shared-utils` plan (active): shared utils layer must define the cross-plugin skill composition model before F5 can be implemented; Phase 1 sequencing constraint.
- dev plugin (`plugins/dev/`): likely host package for the skill; dev-plugin skill manifest must be updated to register the TypeScript skill.
- TypeScript ≥ 5.3: all examples and gate commands assume this minimum version; projects pinned to older versions require a compatibility note.
- `@codevoyant/agent-kit` CLI: skill discoverability via `skill list` depends on the agent-kit skill registry mechanism (NF5).
- CI TypeScript check: acceptance criteria smoke test assumes a `tsc --noEmit` step is present in the monorepo CI pipeline.
