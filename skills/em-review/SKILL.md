---
description: 'Use when reviewing an engineering roadmap for quality and realism. Triggers on: "em review", "review roadmap", "sanity check roadmap", "em check", "review this plan". Checks capacity realism, dependency gaps, missing risks, and phasing quality. Auto-launched after em:plan.'
name: em:review
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline. Core functionality preserved on all platforms.'
argument-hint: '[roadmap-file] [--silent]'
context: fork
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially. The `context: fork` and `agent:` frontmatter fields are Claude Code-specific — on OpenCode and VS Code Copilot they are ignored and the skill runs inline using the current model.

Review an engineering roadmap or epic plan for capacity realism, dependency gaps, missing risks, and phasing quality.

## Step 0: Parse Args

Accept either a plan dir path (`.codevoyant/em/plans/{slug}`) or default to the most recently modified plan dir under `.codevoyant/em/plans/`.

Extract `--silent` flag.

Set `PLAN_DIR` accordingly. Verify `{PLAN_DIR}/roadmap.md` exists — if not, report error and exit.

## Step 1: Read All Plan Artifacts

Read all plan artifacts and build a unified picture of total scope vs. stated capacity:

- `{PLAN_DIR}/roadmap.md` — phases, capacity, risks, architecture sections
- Every file in `{PLAN_DIR}/breakdowns/` — epic sub-tasks and estimates

Note the team size, time horizon, and total estimated effort from the roadmap.

## Step 2: Parallel Review Checks

Run four review agents in parallel (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

### Agent R1 — Capacity & Failure Modes

Does the total scope fit the stated team size and time horizon? Flag over-allocation (>80% utilization leaves no buffer). Look for months with no slack.

Build an **Error & Rescue Registry** check: for each epic, identify the top 3 failure scenarios, state what the rescue action is, and verify whether it is documented in the breakdowns. Output a table:

| Epic | Failure scenario | Rescue action | Documented? |
| ---- | ---------------- | ------------- | ----------- |

Flag any epic where failure scenarios are undocumented or rescue actions are "TBD".

### Agent R2 — Dependencies + One-Way/Two-Way Audit

Are all inter-epic and external dependencies called out? Are any dependencies ordering-violated (epic A needs B but B is later)? Are external dependencies (other teams, services) flagged with owners?

Classify each major inter-epic architectural decision as:

- `ONE-WAY (!)` — hard to reverse; flag if rationale is missing or weak
- `TWO-WAY` — can change later; note for completeness

Output a decisions table alongside the standard dependency findings.

### Agent R3 — Risk Assessment

Are risks specific and actionable (not just "this is risky")? Missing risk callouts for: new tech, unclear requirements, single points of failure, external dependencies.

For each risk found, score **Completeness: X/10** — is the mitigation complete and concrete (10) or hand-wavy and vague (1)? Flag any risk with Completeness < 6 as needing revision.

- Each risk mitigation must cite what evidence informs it (file, system name, prior incident). Mitigations with no evidence anchor score a maximum of 6/10 regardless of prose quality.
- Vague quantifiers ("many tasks", "several risks") in risk descriptions: flag INFORMATIONAL and suggest a specific count.

### Agent R4 — Phasing Quality + "What Already Exists" Check

Does each phase have a clear theme? Are deliverables concrete (can you tell if a phase is done)? Is the NOT-this-period list present and justified?

Run a **"What already exists"** check: scan the codebase context and breakdowns for any epic that appears to be rebuilding something the codebase already has. Flag with `[BORING-BY-DEFAULT FLAG]` if found.

- Objective in plan.md: does it describe user/business impact (outcome) or feature delivery (output)? Flag any bullet containing "ship", "build", "implement", "deliver", "complete" as the primary verb with suggestion: "Reframe as the outcome this delivers, e.g. 'engineers can deploy without manual steps' not 'build deployment automation'."

Wait for all four agents (`TaskOutput block: true`). Synthesize findings.

## Step 2.5: Fix-First Classification

Before presenting anything to the user, categorize all findings:

### AUTO-FIX (perform immediately without asking)

- Missing breakdown file for a listed epic -> create a skeleton `{PLAN_DIR}/breakdowns/{epic-slug}.md` with section headings and `TBD` placeholders
- Phase with no theme -> derive a one-sentence theme from the phase's deliverables and insert it
- Empty risk section in roadmap -> populate from R3 findings (insert the flagged risks directly)

### ASK (surface to user via AskUserQuestion before acting)

Triggers:

- Capacity over-allocation (>80% utilization)
- One-way door decisions without documented rationale
- Major scope overlaps between epics

For each ASK item, use the following **AskUserQuestion format** (mandatory):

1. **Re-ground**: state the plan name, roadmap horizon, and a one-sentence context for why this item matters
2. **Simplify**: explain the issue in plain language (no jargon)
3. **Recommend**: state the preferred action and include `Completeness: X/10` for each option
4. **Lettered options** with human effort estimate and CC (Claude Code) effort estimate per option

Example format:

```
AskUserQuestion:
  question: "Plan: {SLUG} ({horizon}) — {one-sentence context}.
    Issue: {plain-language explanation of the problem}.
    Recommended: Option A (Completeness: 8/10)"
  options:
    - label: "A) {action} — Human: {Xh}, CC: {Yh}"
    - label: "B) {action} — Human: {Xh}, CC: {Yh}"
    - label: "C) Skip for now"
```

## Step 3: Produce Review Report

Generate a structured review report:

```markdown
## Review — {date}

### Summary

{1-3 sentence verdict: is this roadmap ready to commit to?}

### Blocking Issues

{items that must be addressed before committing}

### Concerns

{items worth discussing but not blockers}

### Looks Good

{specific things done well — anchor to actual content}

### Suggested Next Steps

{ordered list of what to do with this feedback}
```

Append a **Review Readiness Dashboard** at the end of the report:

```markdown
| Section            | Status | Verdict                               |
| ------------------ | ------ | ------------------------------------- |
| Capacity           | ?/?/?  | {1-line summary}                      |
| Dependencies       | ?/?/?  | {1-line summary}                      |
| Error & Rescue     | ?/?/?  | {N epics documented / M missing}      |
| One-way door flags | ?/?/?  | {N flagged, M with missing rationale} |
| Phasing quality    | ?/?/?  | {1-line summary}                      |
| Overall            |        | Ready / Needs fixes / Blocked         |
```

Status legend: PASS = no issues, WARN = concerns worth noting, FAIL = blocking issue.

## Step 4: Write Review

Write review report to `{PLAN_DIR}/review.md`. If the file already exists, append — prefix each run with `## Review — {date}`.

If invoked interactively (not `--silent`), display the review inline and ask:

```
AskUserQuestion:
  question: "What would you like to do with this review?"
  options:
    - label: "Looks good — no changes needed"
    - label: "Open the roadmap file to address issues"
    - label: "Re-run em:plan with adjustments"
```

## Step 5: Notification

If `--silent` is not set, send a desktop notification:

```bash
npx @codevoyant/agent-kit notify --title "em:review complete" --message "Review written to {PLAN_DIR}/review.md"
```
