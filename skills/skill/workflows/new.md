# new

## Variables

Received from dispatcher:
- `SKILL_NAME` — first non-flag argument (may be empty)
- `FROM_RESEARCH` — value after `--research` (may be empty)
- `REMAINING_ARGS` — everything after verb

## Critical Rules

- Never write skill files until user accepts the plan
- Step 0 is always bash argument parsing
- Steps prefer `npx @codevoyant/agent-kit` operations over ad-hoc shell
- No markdown tables in skill output — use definition lists, bullets, or Mermaid
- Skills that are technology-specific must include a reference doc index in `references/`
- Every skill ships with `LICENSE.md` (MIT)
- See `references/skill-template.md` for canonical template

## Step 1: Load research context (if available)

If `--research` path provided, read that file as RESEARCH_CONTEXT.

Otherwise check `.codevoyant/explore/` for recent explore artifacts relevant to SKILL_NAME. If found, offer to use them. Store as RESEARCH_CONTEXT (may be empty).

## Step 2: High-level confirmation

Present a one-paragraph summary of the skill being proposed, derived from SKILL_NAME + RESEARCH_CONTEXT.

```
AskUserQuestion:
  question: "Does this match what you want to build? Any deviations before we plan?"
  header: "Skill overview"
  options:
    - label: "Looks right — proceed to planning"
    - label: "I have corrections (describe them)"
```

If corrections, apply and re-confirm once.

## Step 3: Gather skill spec

Ask the following if not already known from context:

```
AskUserQuestion:
  questions:
    - question: "What agents should this skill create?"
      header: "Agents"
      options:
        - label: "No agents — runs inline"
        - label: "Single agent"
        - label: "Multiple parallel agents"
    - question: "Is this skill technology-specific?"
      header: "Tech scope"
      options:
        - label: "Yes — needs reference doc index (e.g. SvelteKit, Terraform, Firebase)"
        - label: "No — general purpose"
    - question: "Is this knowledge work?"
      header: "Knowledge"
      options:
        - label: "Yes — produces docs, research, or planning artifacts"
        - label: "No — produces code, config, or file changes"
    - question: "Where should the skill live?"
      header: "Destination"
      options:
        - label: "skills/ (public, top-level)"
        - label: ".claude/skills/ (private, this repo only)"
        - label: "Other (specify below)"
```

Store all answers as SKILL_SPEC.

## Step 3.5: Confirm design direction

Based on SKILL_SPEC and RESEARCH_CONTEXT, synthesise a short design summary covering:

- What the skill does and its primary output
- How many steps and roughly what each does
- Which agents are involved, what each one does, and what artifacts they produce
- How skill, templates, and agents hand off to each other

If the user provided enough detail to be confident, present this as your understanding and ask for confirmation:

```
AskUserQuestion:
  question: "Does this match your intended design?"
  header: "Design check"
  options:
    - label: "Yes — looks right"
    - label: "No — I want something different (describe below)"
```

If the user provided minimal detail, present it as a best-guess proposal instead ("Here's what I'm thinking — does this sound right?") and ask the same question.

If user wants changes, apply them and re-confirm once before continuing.

---

If SKILL_SPEC indicates tech-specific or knowledge work, also ask:

```
AskUserQuestion:
  question: "Are there specific resources, docs, or URLs you want the skill to consult?"
  header: "Resources"
  options:
    - label: "Yes — I'll list them below"
    - label: "No — use whatever is relevant"
```

If yes, wait for the user to provide the list. Store as RESOURCE_LIST.

## Step 4: Plan the skill

**4a. Launch research agents (parallel, background)**

If RESOURCE_LIST is non-empty:

Tell the user: "Starting deep research on {N} resource(s) — this may take a few minutes. I'll notify you when the plan is ready."

Use the Agent tool to launch all researchers in a **single message** (one tool call per resource) so they run concurrently. For each resource, substitute into `agents/skill-researcher.md`:

- `{RESOURCE_URL}` — the resource URL or path
- `{SKILL_NAME}` — the skill being designed
- `{OUTPUT_PATH}` — `.codevoyant/plans/{skill-slug}/research/{slug}.md`

Each agent: model: claude-sonnet-4-6, run_in_background: true.

Do not send agent calls across separate messages — all must be in one message to run in parallel. Wait for all to complete before continuing.

Read all artifacts in `.codevoyant/plans/{skill-slug}/research/` and use them as input to 4b.

**4b. Launch skill-planner (Opus)**

Substitute into `agents/skill-planner.md`:
- `{SKILL_NAME}` — the skill slug
- `{SKILL_SPEC}` — summary of answers from Steps 3 and 3.5
- `{RESEARCH_CONTEXT}` — RESEARCH_CONTEXT (may be empty)
- `{RESOURCE_ARTIFACTS_DIR}` — `.codevoyant/plans/{skill-slug}/research/` (may be empty)
- `{PLAN_DIR}` — `.codevoyant/plans/{skill-slug}/`
- `{SKILL_TEMPLATE_PATH}` — `references/skill-template.md`
- `{AGENT_TEMPLATE_PATH}` — `references/agent-template.md`

Agent: model: claude-opus-4-6, run_in_background: false.

Wait for completion. The agent registers the plan and sends a notify. Read `{PLAN_DIR}/plan.md` and present it to the user.

Present plan to user.

```
AskUserQuestion:
  question: "Does this plan look right?"
  header: "Plan review"
  options:
    - label: "Accept — create the skill"
    - label: "Adjust (describe changes)"
```

Loop until accepted. You MUST keep asking this question until the user is satisfied.

## Step 5: Create skill files

Only after plan accepted:

**a. Create SKILL.md** at destination using `references/skill-template.md`:

- Frontmatter (description, name, license, compatibility, argument-hint)
  - Add `disable-model-invocation: true` if the skill is stateful or destructive AND does not use `context: fork`. A forked skill already runs in an isolated agent context — the two flags serve the same isolation purpose, don't combine them.
  - Add `context: fork` if the skill is long-running or should be isolated. This also provides stateful safety without needing `disable-model-invocation`.
- Compatibility note block
- Skill Requirements section (bash checks for deps)
- Critical Rules (terse, ≤8 bullets; reference `references/` for detail)
- Step 0: bash argument parsing (always first)
- Steps: terse recipe steps; prefer `npx @codevoyant/agent-kit`
- If technology-specific: Agent Index section listing reference docs

**b. Create `references/{necessary templates}.md`** if tech-specific

**c. Create `agents/{agent-name}.md`** for each agent defined — one file per agent using `references/agent-template.md`

**d. Create LICENSE.md** (MIT, copyright codevoyant contributors)

**e. If technology-specific**, create `references/{tech}-reference-index.md` with links to official docs sections the skill should consult. The skill may additionally provide written guides in the `references` directory which can also be indexed in `references/{tech}-reference-index.md`.

**e. If knowledge work specific**, create `references/{knowledgevase}-reference-index.md` with links to external sources the skill should consult. The skill may additionally provide written guides in the `references` directory which can also be indexed in `references/{tech}-reference-index.md`.

## Step 6: Validate

Run `/skill review` to audit the new skill automatically.

Report: "Skill {name} created at {path}."
