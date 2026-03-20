---
description: "Use when reviewing a product roadmap for quality and coverage. Triggers on: \"pm review\", \"review product roadmap\", \"review pm plan\", \"sanity check roadmap\", \"product plan review\". Checks coverage gaps, prioritization, missing PRDs, and strategic coherence. Auto-launched after pm:plan."
argument-hint: "[plan-dir] [--silent]"
disable-model-invocation: true
context: fork
model: claude-sonnet-4-6
---

Review a product roadmap and its PRDs for quality, coverage, and strategic coherence.

## Step 0: Parse arguments and load artifacts

Accept a plan dir path (`.codevoyant/pm/plans/{slug}`) or default to the most recently modified plan directory.

Set `PLAN_DIR`. Read `{PLAN_DIR}/roadmap.md` and all `{PLAN_DIR}/prds/*.md`.

Parse flags: `--silent` (suppress notifications and interactive prompts).

## Step 1: Run parallel review agents

Launch 4 review agents (`model: claude-haiku-4-5-20251001`, `run_in_background: true`):

- **Agent R1 -- Coverage**: Is every roadmap feature backed by a PRD? Flag any features without a corresponding `prds/` file.
- **Agent R2 -- Prioritization**: Does the ordering reflect stated strategic goals? Are any P0 user needs deferred in favor of lower-value work?
- **Agent R3 -- PRD quality**: For each PRD, check: problem statement clear, success metrics measurable, out-of-scope list present, no missing dependency callouts.
- **Agent R4 -- Strategic coherence**: Does the overall roadmap tell a coherent story? Are themes consistent across phases?

Wait for all four. Synthesize results.

## Step 2: Two-pass classification

Sort all findings into two categories before taking action:

### Pass 1 -- CRITICAL (must be resolved before committing)
- Missing PRD file for any feature listed in `roadmap.md`
- Success metrics that are unmeasurable (e.g. "improve user experience", "make it faster" with no baseline or target)
- Out-of-scope section absent from any PRD
- P0 user stories that conflict with each other across PRDs (shipping both would require contradictory implementation choices)

### Pass 2 -- INFORMATIONAL (flags worth surfacing, not blockers)
- PRD problem statements that describe a solution rather than a problem
- User stories missing a rationale (`so that [outcome]` clause absent or vague)
- Dependencies not called out in the Dependencies section of a PRD
- Open questions left with no proposed answer or owner

## Step 3: Fix-First

Auto-fix what can be fixed without human judgment, then surface only genuine decisions.

### AUTO-FIX (apply immediately, no confirmation needed)
- Feature in roadmap without a PRD file: create a skeleton PRD at `{PLAN_DIR}/prds/{feature-slug}.md` with all section headers and `[TODO]` placeholders
- PRD missing an out-of-scope section: append the section with a `[TODO: list explicit deferrals]` placeholder
- PRD with empty open questions section: populate from findings identified in Pass 1/2 (e.g. "Metric X needs a measurable baseline -- what is the current value?")

### ASK (present to user via AskUserQuestion)

For each ASK item, use this mandatory format:
1. **Re-ground**: state the plan name, time horizon, and one sentence of context (e.g. "In the Q2-2026 roadmap, the 'notification preferences' PRD...")
2. **Simplify**: explain the issue in plain language a non-technical stakeholder could understand (no engineering jargon)
3. **Recommend**: state the preferred fix, then list all options with `Completeness: X/10` for each, covering both human effort and CC (Claude Code) effort
4. **Lettered options**: A, B, C... each with a one-line description, human effort estimate, and CC effort estimate

ASK triggers:
- Prioritization disagreements (e.g. a feature ranked P1 in the roadmap but treated as P0 in its PRD)
- Unmeasurable metrics that cannot be auto-fixed (no obvious quantitative alternative)
- Conflicting P0 stories across two or more PRDs

## Step 4: Produce review report

Generate a structured review report:

```
## Review -- {date}

### Product Roadmap Review: N issues (X critical, Y informational)

### Review Readiness Dashboard

| Section              | Status | Verdict                          |
|----------------------|--------|----------------------------------|
| PRD coverage         | ?/?/?  | N of M features have PRDs        |
| Metrics quality      | ?/?/?  | N metrics measurable, M vague    |
| Prioritization       | ?/?/?  | ...                              |
| Failure modes        | ?/?/?  | Present / Missing for N features |
| Strategic coherence  | ?/?/?  | ...                              |
| Overall              | Ready / Needs fixes / Blocked    |

Status key: check = passing, warning = informational issues only, cross = critical issues present

### Critical Issues
{issues from Pass 1 -- each labeled AUTO-FIXED or ASK}

### Informational
{issues from Pass 2 -- each labeled AUTO-FIXED or noted for awareness}

### Looks good
{specific positives anchored to content}

### Auto-fixes applied
{list of files created or sections added automatically}

### Suggested next steps
```

## Step 5: Write review

Write to `{PLAN_DIR}/review.md`. If the file already exists, append with a `## Review -- {date}` prefix header.

## Step 6: Interactive resolution (if not --silent)

If invoked interactively (not `--silent`), display the review dashboard and surface all ASK items one at a time via AskUserQuestion.

After resolving all ASK items, ask:
> What would you like to do?

Options:
- **Looks good** -- roadmap is committed
- **Open roadmap to address remaining issues**
- **Re-run pm:plan**

## Step 7: Notify

If `--silent` is not set, notify:

```bash
npx @codevoyant/agent-kit notify --title "pm:review complete" --message "Review written to {PLAN_DIR}/review.md"
```
