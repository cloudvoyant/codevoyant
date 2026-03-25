# review

Review a product roadmap for quality, prioritization, and strategic coherence.

## Step 0: Parse arguments and load artifact

Accept a roadmap file path or slug. Default to the most recently modified file in `.codevoyant/roadmaps/`.

If ROADMAP_PATH not provided, find the most recent file:

```bash
ls -t .codevoyant/roadmaps/*.md 2>/dev/null | head -1
```

Set `ROADMAP_FILE`. Read the file. Parse flags: `--silent`.

## Step 1: Run parallel review agents

Launch 3 review agents (model: claude-haiku-4-5-20251001, run_in_background: true) in a single message:

- **Agent R1 — Prioritization**: Does the ordering across capability tiers reflect the stated strategic goal? Are any must-have outcomes deferred to Tier 2/3?
- **Agent R2 — Capability quality**: For each capability in each tier, check:
  - Name is outcome-oriented (not "ship X" or "build Y") — if solution-phrased, flag CRITICAL
  - "What it enables" describes a user or business outcome, not a deliverable — if deliverable-phrased, flag CRITICAL
  - "Why now" rationale is present and specific — if absent, flag INFORMATIONAL
  - Key bets are present (2–4 bullets) — if missing, flag INFORMATIONAL
- **Agent R3 — Strategic coherence**: Does the roadmap tell a coherent story? Are themes consistent across tiers? Does the "What We Are NOT Doing" section contain explicit deferrals?

Wait for all three. Synthesize results.

## Step 2: Two-pass classification

### Pass 1 — CRITICAL (must resolve before approving)

- Capability name or "what it enables" phrased as a deliverable (ship/build/add/create)
- Missing strategic goal section
- Tier 1 capabilities that contradict each other (shipping both requires mutually exclusive implementation choices)
- Missing "What We Are NOT Doing" section

### Pass 2 — INFORMATIONAL

- "Why now" rationale absent or vague
- Key bets missing for a capability
- Open questions section absent
- Tier assignments that seem misaligned with strategic goal

## Step 3: Fix-First

Auto-fix without confirmation:

- Missing "What We Are NOT Doing" section: append with `[TODO: list explicit deferrals]`
- Missing "Open Questions" section: append with questions generated from Pass 1/2 findings

Flag for user decision:

- Capability phrased as deliverable (user must decide the outcome)
- Tier assignment disputes (user decides prioritization)

## Step 4: Present review inline

Output the full review report directly in the chat as structured markdown — do not write a file:

```
## pm review — {filename} — {date}

**Overall verdict:** Ready | Needs fixes | Blocked

**Findings:** {N} critical, {N} informational

### Critical Issues
{list — each labeled AUTO-FIXED or [needs your decision]}

### Informational
{list — each labeled AUTO-FIXED or noted for awareness}

### Looks good
{specific positives anchored to actual content}

### Auto-fixes applied
{list of edits made directly to the roadmap file}

### Suggested next steps
{ordered list}
```

## Step 5: Interactive resolution (if not --silent)

If not `--silent`, surface all user-decision items one at a time via AskUserQuestion.

After resolving all items, ask:

```
AskUserQuestion:
  question: "Roadmap review complete. What next?"
  header: "Next step"
  options:
    - label: "Approve — run pm approve"
    - label: "Update — run pm update"
    - label: "Done for now"
```

## Step 6: Notify

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify \
    --title "pm review complete" \
    --message "Review complete for {filename}: {N} critical, {N} informational"
fi
```
