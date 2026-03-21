# 260321 DX & Config Management PRD

**Scope:** project
**Product:** Codevoyant
**Linear:** (none)
**Owner:** Platform team
**Status:** draft
**Updated:** 2026-03-21

```
  Planning → Eng Planning → Impl → Deployment → QA
  ─────────────────────────────────────────────────
  [THIS] DX & Config Management (cross-cutting)
  Affects question-asking UX and session settings in all skills
```

## Problem

Every Codevoyant session forces users to re-answer the same questions and re-specify the same preferences — Linear team, breakpoint mode, push behaviour, commit style — that were already answered in prior sessions, because no skill persists user choices between sessions. Compounding this, the `AskUserQuestion` calls scattered across skills are inconsistently structured: some present too many options at once, some lack meaningful descriptions, and some interrupt autonomous flows for decisions the user already made implicitly. Together these two deficiencies make each session feel longer and more effortful than it should, erode trust in the autonomous pipeline, and slow down every workflow regardless of which skill group the user is working in.

## Goals

### Leading Indicators
> Adoption and activation signals — measurable within days/weeks of launch.

- Repeat questions per session (same question asked across two or more sessions for the same project): from ~4 questions/session to ≤1 question/session by 2026-04-18
  - Source: Manual session audit across 10 recent sessions shows an average of 3–5 repeated preference questions (Linear team selection, breakpoint mode, push flag, commit scope) per new session on the same project.
- AskUserQuestion call count per skill invocation on the happy path: from a median of 3 prompts to ≤2 prompts by 2026-04-18
  - Source: Code audit of `em:plan` (3 AskUserQuestion calls before research even begins), `spec:go` (2 before execution), `dev:commit` (1 confirmatory) reveals the median is inflated by avoidable early-stage disambiguation questions.
- Skills with a written AskUserQuestion usage convention: from 0 of 47 to ≥30 of 47 skills referencing the shared guideline by 2026-04-18
  - Source: Current SKILL.md audit shows no shared callout standard; each skill author implements prompts independently.

### Lagging Indicators
> Retention, revenue, or business-outcome signals — measurable weeks/months after launch.

- Session dropout rate on multi-step flows (user abandons mid-skill without completing the primary output): from ~25% of sessions to ≤10% of sessions by 2026-05-30
  - Source: Anecdotal evidence from internal dogfooding — users consistently drop out during the early question-asking phase of `em:plan` and `spec:new` before any value is delivered.
- Re-specification overhead per project (number of times a user re-enters the same preference in a project's lifetime): from unbounded (every session) to ≤1 entry per preference per project lifetime by 2026-05-30
  - Source: Current architecture has no settings persistence at the project level beyond `taskRunner` auto-detection. All user-expressed preferences are ephemeral.

## Non-Goals

- Global (cross-project) user settings or a cloud-synced preference store — scope is per-project `.codevoyant/settings.json` only; cross-project sync is a separate initiative.
- Replacing `AskUserQuestion` with a fully automated inference engine — the goal is to ask fewer, better questions; not to eliminate user input.
- A settings UI or web dashboard — CLI and SKILL.md conventions only.
- Changing what skills ask on first use — the config layer stores answers after first use; the first-time UX redesign is out of scope for this phase.
- Migrating all 47 skills to use the new config layer — P0 skills (`em:plan`, `spec:go`, `spec:new`, `dev:commit`) are in scope; remaining skills adopt the pattern in a follow-on phase.
- Performance or latency improvements — covered separately in Phase 2.

## Users

Primary: Software engineers and engineering managers who run Codevoyant skills daily on long-lived projects and are currently forced to re-specify the same preferences (Linear team, commit push preference, breakpoint mode) at the start of every session. Secondary: New Codevoyant adopters encountering their first multi-step skill who may be confused by the current volume and order of prompts.

## Requirements — Functional

**F1** [P0] `settings set` write command
The agent-kit CLI must expose a `settings set <key> <value>` command that writes a preference to `.codevoyant/settings.json` under a `preferences` namespace. Complements the existing `settings get` read-path; write-path is currently absent.

**F2** [P0] `settings get` with preferences namespace
The agent-kit CLI must expose a `settings get <key>` command that reads from the `preferences` namespace with a defined fallback (return empty string, exit 0). `settings get` currently exists but has no `preferences` namespace convention.

**F3** [P0] em:plan reads linearTeam preference before prompting
`em:plan` must read `preferences.linearTeam` from settings before asking the "Which team owns this?" question; if set, skip the prompt and report the stored value. Eliminates the most frequently repeated question in engineering planning sessions.

**F4** [P0] spec:go reads breakpointMode preference before prompting
`spec:go` must read `preferences.breakpointMode` from settings before asking the "Should Claude take breaks?" question; if set and not overridden by a flag, skip the prompt. Breakpoint preference is stable per-project and currently re-asked every session.

**F5** [P1] dev:commit applies autoPush preference as default
`dev:commit` must read `preferences.autoPush` from settings and apply it as the default for the push step; if set to `false`, behave as if `--no-push` was passed unless the flag is explicitly provided. Aligns commit behaviour with declared team norms without requiring flag repetition.

**F6** [P0] Notice logged when a prompt is bypassed via saved preference
Skills that skip a prompt due to a stored preference must log a one-line notice: `→ Using saved preference: {key} = {value}. Override with --reset-prefs.` Users must be able to see which questions were bypassed and why.

**F7** [P1] `--reset-prefs` flag clears stored preferences for the session
Any skill that reads a preference must accept a `--reset-prefs` flag that clears stored preferences for that skill's keys and re-asks all questions in that session. Escape hatch for when preferences become stale or wrong.

**F8** [P0] AskUserQuestion usage guideline added to shared references
A written AskUserQuestion usage guideline must be added to `skills/shared/references/` that defines: mandatory fields (`question`, `header`, `options`), option count limits (2–4 options max), required `description` for each option, and when to use `multiSelect`. Establishes the shared contract so future skill authors follow the same pattern.

**F9** [P1] Audit and update P0 skills against AskUserQuestion guideline
`em:plan`, `spec:go`, `spec:new`, and `dev:commit` must be audited against the guideline and updated where non-compliant. These four skills account for the majority of session question volume.

**F10** [P1] spec:new consolidates opening questions to ≤2 before research
`spec:new` must consolidate its opening planning questions (currently 3+ sequential AskUserQuestion calls before research) into a maximum of 2 calls before the research phase begins. Reduces perceived friction at the highest-traffic entry point in the spec pipeline.

**F11** [P1] Notice logged when a preference is auto-saved on first use
When a skill auto-saves a user's answer as a preference (first-time use), it must confirm the save with a one-line notice: `→ Saved: {key} = {value} (use --reset-prefs to change)`. Transparency; users know a preference was captured without having to inspect the JSON file.

## Requirements — Non-Functional

**NF1** Settings read latency
Target: `settings get` must complete in ≤100ms on a cold disk; cached reads in ≤10ms. No skill should add perceptible delay waiting for a settings read.

**NF2** Settings file schema stability
Target: `preferences` keys must use dot-namespaced strings (`em.linearTeam`, `spec.breakpointMode`, `dev.autoPush`). Any future key addition must not break existing reads (absent keys return empty string).

**NF3** Skill backward compatibility
Target: No skill change may break existing behaviour for users who have not set any preferences. All preference reads are additive defaults, not replacements.

**NF4** AskUserQuestion option count limit
Target: No AskUserQuestion call in any audited skill may present more than 4 options. Questions that currently exceed this must be restructured (e.g., progressive disclosure) rather than truncated.

**NF5** Settings file portability
Target: `.codevoyant/settings.json` must remain a plain JSON file commitable to version control; no binary or encrypted format. Sensitive values (API keys) must not be stored here — a warning must be emitted if a value looks like a secret (matches common secret patterns).

## Acceptance Criteria

- [ ] `npx @codevoyant/agent-kit settings set preferences.em.linearTeam "ENG"` writes the value to `.codevoyant/settings.json` under `preferences.em.linearTeam` and exits 0
- [ ] `npx @codevoyant/agent-kit settings get preferences.em.linearTeam` returns `"ENG"` after the above write, and returns empty string with exit 0 when the key is absent
- [ ] Invoking `/em:plan` on a project where `preferences.em.linearTeam` is set does not display the "Which team owns this?" AskUserQuestion prompt; the notice `→ Using saved preference: em.linearTeam = ENG. Override with --reset-prefs.` appears in the output
- [ ] Invoking `/em:plan --reset-prefs` on the same project does display the team selection prompt, regardless of stored preferences
- [ ] Invoking `/spec:go` on a project where `preferences.spec.breakpointMode` is set skips the breakpoint AskUserQuestion and logs the saved value
- [ ] `skills/shared/references/ask-user-question-guidelines.md` exists, contains the mandatory-fields list, the 2–4 option count rule, and the description requirement
- [ ] All AskUserQuestion calls in `em:plan`, `spec:go`, `spec:new`, and `dev:commit` have a `header` field, at least one option has a non-empty `description`, and no call presents more than 4 options — verified by manual review of each SKILL.md
- [ ] `spec:new`'s opening flow (Steps 2–3 before research begins) uses no more than 2 AskUserQuestion calls on the happy path — verified by reading the updated SKILL.md and counting calls
- [ ] A user running `/em:plan` for the first time sees the team question; their answer is saved; on a second invocation in the same project the question is not shown
- [ ] `.codevoyant/settings.json` remains valid JSON after any `settings set` operation — verified by `node -e "JSON.parse(require('fs').readFileSync('.codevoyant/settings.json','utf8'))"`

## Open Questions

**Q1** Per-project vs. global preference namespace design
Should preferences be scoped per-skill (e.g., `em.linearTeam`) or per-user across skills (e.g., a global `~/.codevoyant/prefs.json`)? Per-project is the Phase 1 decision, but the key namespace must not conflict with a future global layer.
Owner: Platform team | Due: 2026-03-28

**Q2** Auto-save trigger: always vs. explicit confirmation
What is the auto-save trigger for capturing preferences: always save after first answer, or only save when the user explicitly confirms? Auto-save is simpler but may surprise users who gave a one-off answer.
Owner: Platform team | Due: 2026-03-28

**Q3** Additional skills to audit in Phase 1
Which additional skills beyond the P0 four should be audited in Phase 1? `pm:prd` has 3 AskUserQuestion calls that may also benefit.
Owner: Platform team | Due: 2026-04-04

**Q4** Behavior when settings.json is corrupted
What is the correct behaviour when `settings.json` is corrupted or unparseable — silent fallback to no preferences, or hard error?
Owner: Engineering | Due: 2026-03-28

## Dependencies

- `packages/agent-kit` (upstream) — the `settings set` write command is a net-new addition; all skill changes depend on it shipping first
- `.codevoyant/settings.json` schema convention (upstream) — the `preferences` namespace must be agreed before skill authors begin reading from it; current schema only contains `taskRunner`
- `skills/shared/references/` directory (upstream to skills audit) — the AskUserQuestion guideline file must exist before skill PRs can reference it in their review checklists
- Phase 1 Skills Solidification feature (peer dependency) — skills being refactored for solidification and for DX improvements should not be modified by two parallel workstreams; coordinate change windows with the solidification owner
