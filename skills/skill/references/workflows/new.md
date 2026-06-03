# new

## Variables

Received from dispatcher:
- `SKILL_NAME` — first non-flag argument (may be empty)
- `FROM_RESEARCH` — value after `--research` (may be empty)
- `REMAINING_ARGS` — everything after verb

## Critical Rules

- Never write skill files until user accepts the plan
- Step 0 is always bash argument parsing
- Steps prefer direct, narrow shell commands (git, gh, glab, jq, grep, sed) — no wrapper CLIs
- No markdown tables in skill output — use definition lists, bullets, or Mermaid
- Skills that are technology-specific must include a reference doc index in `references/`
- Every skill ships with `LICENSE.md` (MIT)
- See `references/skill-template.md` for canonical template

## Step 1: Load research context (if available)

If `--research` path provided, read that file as RESEARCH_CONTEXT.

Otherwise check `.codevoyant/explore/` for recent explore artifacts relevant to SKILL_NAME. If found, offer to use them. Store as RESEARCH_CONTEXT (may be empty).

## Step 2: Skill spec (single question max)

Skip the "does this match what you want to build?" design-check question — proceed directly to spec-gather.

**Spec resolution:**

- If `REMAINING_ARGS` contains a description of the skill (≥5 words explaining the command and behavior), use it directly as `SKILL_DESCRIPTION`. Do not ask.
- Otherwise, ask **one** open question: "Describe the skill — what command does it add and what does it do?" (free-text via Other field).

Derive `SKILL_SPEC` programmatically from `SKILL_DESCRIPTION` + `SKILL_NAME` + `RESEARCH_CONTEXT`:

- **Agents:** infer from description verbs (research/analyze → agents likely; format/lint → no agents).
- **Tech scope:** infer from named technologies in the description; if a framework/tool is named, tech-specific.
- **Knowledge work:** infer — if the output is docs/research/plans, mark knowledge; if code/config edits, not knowledge.
- **Destination:** default to `skills/` (public, top-level). Override only if the user's args explicitly say `--private` or specify a path.

Store all derived values as `SKILL_SPEC`.

## Step 3: Resource list (no design-check)

Do not ask "does this match your intended design?". Proceed.

If `SKILL_SPEC` indicates tech-specific or knowledge work and the description references specific docs/URLs, extract them into `RESOURCE_LIST`. Do not ask the user — if no resources are evident in the description, set `RESOURCE_LIST = []` and let agents pick relevant sources during planning.

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
- `{SKILL_SPEC}` — summary of derived spec from Step 2 (description) + Step 3 (resource list)
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
  - Add `requires: [skill-name, ...]` if the skill delegates to or invokes other skills. Use `requires_one_of: [a, b]` when any one of a set suffices. Then add a Dependency Check section immediately after frontmatter (see `references/skill-template.md`).
- Compatibility note block
- Skill Requirements section (bash checks for deps)
- Critical Rules (terse, ≤8 bullets; reference `references/` for detail)
- Step 0: bash argument parsing (always first)
- Steps: terse recipe steps; prefer direct narrow commands (git/gh/glab/jq/grep/sed)
- If technology-specific: Agent Index section listing reference docs

**b. Create `references/{necessary templates}.md`** if tech-specific

**c. Create `agents/{agent-name}.md`** for each agent defined — one file per agent using `references/agent-template.md`

**d. Create LICENSE.md** (MIT, copyright codevoyant contributors)

**e. If technology-specific**, create `references/{tech}-reference-index.md` with links to official docs sections the skill should consult. The skill may additionally provide written guides in the `references` directory which can also be indexed in `references/{tech}-reference-index.md`.

**e. If knowledge work specific**, create `references/{knowledgevase}-reference-index.md` with links to external sources the skill should consult. The skill may additionally provide written guides in the `references` directory which can also be indexed in `references/{tech}-reference-index.md`.

## Step 6: Validate

Run `/skill review` to audit the new skill automatically.

Report: "Skill {name} created at {path}."
