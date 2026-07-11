# Research Standards

Quality standards for research artifacts produced by pm:plan and related pm-workflow agents. Reference this file from agent instructions with: `Each finding must follow the format in 'skills/pm/references/research-standards.md'.`

---

## Finding Format

Every finding in a research artifact must use this structure:

```markdown
## Finding: {short title}

**Source(s):** {file path | Linear issue URL | MCP query description}
**Triangulated:** yes ({N} sources / {N} methods) | no (single source)
**Confidence:** High | Medium | Low
**Observation:** {what was directly observed — no inference}
**Interpretation:** {what it means for this plan — separated from observation}

> Supporting evidence: {quote, file line range, or data point}
```

**Markdown output:** Soft-wrap prose — never hard-wrap. Write each paragraph (Observation, Interpretation, evidence) as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

---

## Confidence Levels

- **High** — multiple corroborating sources or methods (e.g. grep + git log + Linear query all agree)
- **Medium** — single source with reasonable confidence; no contradicting evidence found
- **Low** — inferred from indirect evidence, single data point, or sparse signal

---

## Triangulation Rule

- `Triangulated: yes` requires at least 2 independent sources **or** 2 independent methods (e.g. file scan + git log; Linear query + direct file read)
- A finding that relies on a single source must be marked `Triangulated: no` — it may still be `Confidence: High` if the source is authoritative and unambiguous

---

## Quantification Standard

- Use specific counts when a count is available: "7 of 12 issues in the auth epic carry no AC" not "many issues lack ACs"
- Vague quantifiers are prohibited in findings: no "many", "several", "most", "some", "a few"
- If an exact count is not available, bound it: "at least 5 of the 8 scanned files" is acceptable; "most files" is not
- Percentages require a denominator: "60% (6 of 10 sampled)" not "60% of files"

---

## Leading vs. Lagging Indicators

Use when specifying success metrics in PRDs or plans.

**Leading indicators** — measurable within days/weeks of launch:
- Feature adoption rate (% of target users who use it in week 1)
- Activation event count (users completing onboarding step)
- Session frequency change in the week post-launch

**Lagging indicators** — measurable weeks/months after launch:
- 30/60/90-day retention delta vs. control cohort
- Support ticket volume reduction (measurable 30+ days post-launch)
- Revenue impact or plan upgrade rate

Every Goals section must include at least one leading and one lagging indicator. A goals section with only one type is incomplete.

---

## Outcome-not-Output Rule

Goals and objectives must describe **what changes** for users or the business, not what gets built.

**Delivery verbs that signal output framing** (flag these as anti-patterns):
`ship`, `build`, `implement`, `deliver`, `release`, `complete`, `add`, `create`

**Reframe test**: can you append "so that {user/business benefit}" to the statement? If the reframe reveals the real goal, the original was output-framed.

- Output: "Ship the auth refactor"
- Outcome: "Reduce auth-related support tickets by 30%"
- Output: "Add notification preferences"
- Outcome: "Reduce notification-related support tickets by 40% within 60 days of launch"
