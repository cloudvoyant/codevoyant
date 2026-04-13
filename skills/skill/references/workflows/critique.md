# critique

## Variables

Received from dispatcher:
- `REMAINING_ARGS` — the skill name or path passed after `skill critique`

## Step 0: Resolve Target

Inspect `$REMAINING_ARGS`:

- **Empty** — ask: "Which skill should I critique? Provide a path (e.g. `skills/dev-plan/SKILL.md`) or a skill name (e.g. `dev:plan`)."
- **Path to SKILL.md** — read it directly; if the file does not exist, report "Cannot find SKILL.md at that path" and stop
- **Skill directory** — look for `SKILL.md` inside it
- **Skill name** (e.g. `dev:plan`, `skill-review`) — search `skills/`, `.claude/skills/`, and `plugins/*/skills/` for a match; if multiple matches, list them and ask which one; if no match, report the unresolved name and stop

Once resolved, read the SKILL.md in full before proceeding.

## Step 1: Understand the Skill's Intent

Before scoring anything, state in one sentence what this skill is trying to do and what its primary output is. This anchors the critique — every finding should connect back to whether the skill achieves that intent.

## Step 2: Evaluate Each Dimension

Work through each dimension below. For each one, rate it **Strong** / **Adequate** / **Weak** and list concrete findings — specific line references, quoted phrases, or named gaps. Avoid vague observations like "could be clearer"; say exactly what is unclear and why.

Severity guide for the improvements list: a finding is **High** if it would cause an agent to produce wrong output or get stuck; **Medium** if it degrades output quality without blocking completion; **Low** if it's a polish issue.

### Dimension 1 — Objective Clarity

Does the description promise something the body can deliver?

- Is the skill's stated purpose achievable by following the instructions as written?
- Is the scope bounded — one clear job, not three loosely related ones?
- Are the expected outputs (files written, text produced, actions taken) explicitly named?
- Would a first-time user, reading only the `description` field, have accurate expectations?

### Dimension 2 — Instruction Quality

Can a capable agent follow these instructions without guessing?

- Are steps in a logical order, or do later steps depend on things introduced earlier without warning?
- Are conditions (if/else, flag checks) fully specified — both the true and false branches?
- Are vague verbs present where specific action is needed? Watch for: "consider", "ensure", "handle", "review", "process" used without saying *how*.
- Are error/edge cases covered: empty args, missing files, ambiguous input, external tool failures?
- Are there contradictions — step A implies X, step C implies not-X?
- Does the skill explain *why* for non-obvious choices, or does it just issue mandates?

### Dimension 3 — Template & Artifact Quality

For any output templates, report formats, or document structures defined in the skill:

- Does the template use appropriate structure (headers for navigation, bullets for lists, tables for comparisons)?
- Is the template at risk of producing wall-of-text? Flag any sections that call for prose paragraphs where bullets would serve better.
- Is the template overly long — requiring content that will rarely add value?
- Are tables used meaningfully, with columns that are distinct and always fillable?
- Is the reading level and density appropriate for the intended audience?
- If no template is defined but the skill produces structured output, note whether the output format is specified at all.

Rate N/A if the skill produces no user-facing artifacts.

### Dimension 4 — Trigger Accuracy

Will the skill fire when it should and stay quiet when it shouldn't?

- Does the `description` include concrete trigger phrases that match how users actually speak?
- Is it "pushy" enough — does it name the contexts where it should fire, not just describe what it does?
- Are there false-positive risks — phrases that might invoke it for unrelated tasks?
- Are there false-negative risks — obvious use cases a user would phrase in a way the description wouldn't catch?

### Dimension 5 — Actionability

Can an agent complete this skill without getting stuck?

- Is every step executable — does it say what tool/command/file to use, not just what to achieve?
- Are there "orphan" steps that tell the agent to do something but provide no mechanism?
- Are external dependencies (scripts, tools, other skills) named explicitly?
- If the skill uses subagents, are the subagent prompts fully specified, or just sketched?
- Is there a clear endpoint — does the agent know when it's done?

## Step 3: Determine Verdict

Apply these rules — use the first that matches:

| Condition | Verdict |
|---|---|
| 3 or more dimensions rated Weak | **Major Issues** |
| Objective Clarity is Weak (body can't deliver the promise) | **Major Issues** |
| 1–2 dimensions rated Weak, or any High-priority improvements | **Needs Work** |
| All dimensions Adequate or Strong, only Low/Medium improvements | **Pass** |

## Step 4: Write the Critique

Produce a structured critique using this format (emit markdown directly — do not wrap in a code block):

---

## Critique: {skill-name}

**Verdict**: Pass | Needs Work | Major Issues
**Summary**: One sentence on what this skill does and the main quality story.

---

### Objective Clarity — Strong | Adequate | Weak
- {finding or ✓ if no issues}

### Instruction Quality — Strong | Adequate | Weak
- {finding or ✓ if no issues}

### Template & Artifact Quality — Strong | Adequate | Weak | N/A
- {finding or ✓ if no issues}

### Trigger Accuracy — Strong | Adequate | Weak
- {finding or ✓ if no issues}

### Actionability — Strong | Adequate | Weak
- {finding or ✓ if no issues}

---

### Improvements

**High priority**
1. {Specific change — quote the problem, state the fix}

**Medium priority**
2. {Specific change}

**Low priority**
3. {Specific change}

---

A few things that make a critique useful: quote the exact phrase that's problematic rather than paraphrasing it; give a concrete rewrite suggestion, not just a direction; keep the improvements list short — five or fewer total, prioritized ruthlessly. If there are no issues in a dimension, say so plainly rather than inventing minor nits.

## Step 5: Offer to Apply Fixes

After presenting the critique, ask: "Want me to apply the High-priority improvements now?"

If yes: make the edits directly to the SKILL.md. Show a brief diff summary when done. Do not apply Medium or Low improvements without being asked.
