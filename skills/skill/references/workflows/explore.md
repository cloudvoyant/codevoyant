# explore

## Variables

Received from dispatcher:
- `TOPIC` — first non-flag argument (may be empty)
- `THOROUGH` — true if `--thorough` present
- `REMAINING_ARGS` — everything after verb

## Critical Rules

- Output to `.codevoyant/explore/{slug}/` — never commit explore artifacts directly
- Do NOT install skills without explicit user approval
- Every skill found must include: source URL, SKILL.md excerpt, install command, absorb assessment
- See `references/search-guide.md` for npx skills patterns
- If npx skills is unavailable, proceed with WebFetch to agentskill.sh directly.

## Step 0: Parse arguments

If no topic, ask: "What kind of skill are you looking for?" and wait.

## Step 1: Determine research scope

AskUserQuestion:
  question: "What's the goal of this exploration?"
  header: "Scope"
  options:
    - Find existing skills to install/absorb
    - Understand what's available in an area (market scan)
    - Both

Store as EXPLORE_MODE.

## Step 2: Parallel research

Launch 3 agents concurrently (model: claude-haiku-4-5-20251001, run_in_background: true):

**Agent A — npx skills search**
- Run: `npx skills find "{TOPIC}" 2>/dev/null` or `npx skills search "{TOPIC}"`
- Run: `npx skills list --tag {TOPIC} 2>/dev/null`
- For each result: fetch install info, star count, last updated
- Save to `.codevoyant/explore/{slug}/search-results.md`

**Agent B — agentskill.sh scan**
- WebFetch agentskill.sh filtered by topic
- For top 5 results: WebFetch the skill's repo URL, find SKILL.md, extract frontmatter + first 50 lines
- Save to `.codevoyant/explore/{slug}/agentskill-results.md`
- Follow research-standards.md in skills/shared/references/

**Agent C — Repo SKILL.md extraction**
- For any GitHub URLs found by A or B: run `npx skills info {skill}` to get repo details
- Attempt to read SKILL.md directly from the repo via WebFetch (raw.githubusercontent.com)
- Note: model selection, agent structure, step count, references layout
- Save to `.codevoyant/explore/{slug}/skill-details.md`

Wait for all three. Synthesize findings.

## Step 3: User checkpoint

Present findings summary:
- Skills found (count, names, install commands)
- Absorb assessment: what can be learned from each
- Dependency map: which of the found skills could be required by the new skill
- Recommendation: install now, absorb pattern only, or nothing useful found

AskUserQuestion:
  question: "What would you like to do with these findings?"
  header: "Next step"
  options:
    - Install a skill now (show list)
    - Save findings and proceed to /skill new
    - Save findings only
    - Explore further (different topic)

## Step 4: Save and index

Write synthesis to `.codevoyant/explore/{slug}/summary.md` with frontmatter:
```yaml
---
topic: {TOPIC}
date: {YYMMDD}
skills-found: {N}
install-candidates: [list]
---
```

Report: "Explore complete. Findings at .codevoyant/explore/{slug}/. Run /skill new to build."
