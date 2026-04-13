# update

## Variables

Received from dispatcher:
- `SKILL_NAME` — first non-flag argument (may be empty)
- `REMAINING_ARGS` — everything after verb

## Critical Rules

- Never modify skill files directly — always produce a plan first, accept it, then apply
- Read the current SKILL.md in full before proposing anything
- If target is ambiguous, ask the user

## Step 1: Determine target

Check if a skill plan is currently active:

```bash
npx @codevoyant/agent-kit plans list --status Active --plugin skill 2>/dev/null
```

If one active plan found → offer to update it.
If multiple active plans found → ask which one.
If no active plans → ask if updating an existing skill (and which one).

If the user provides SKILL_NAME, resolve to either:

- `.codevoyant/plans/{skill-name}/plan.md` (in-progress plan)
- `skills/{skill-name}/SKILL.md` or `.claude/skills/{skill-name}/SKILL.md` (existing skill)

If ambiguous between plan and existing skill, ask:

```
AskUserQuestion:
  question: "Found both a plan and an existing skill for '{name}'. Which to update?"
  header: "Target"
  options:
    - label: "Update the in-progress plan"
    - label: "Update the existing committed skill"
```

Store as TARGET_TYPE (plan | existing) and TARGET_PATH.

## Step 2: Read and scope the update

Read TARGET_PATH in full. If TARGET_TYPE=plan, also read all files in the plan directory (implementation phases, proposed skill files, research artifacts, etc.) to understand the full current state.

Ask which dimensions to improve:

```
AskUserQuestion:
  question: "Which dimensions do you want to improve?"
  header: "Update scope"
  multiSelect: true
  options:
    - label: "Address requests in plan — act on feedback or TODOs left in plan files" (Only if TARGET_TYPE = plan)
    - label: "Prompt quality — improve instruction clarity, step specificity, trigger description"
    - label: "Performance — parallelization, model selection (haiku vs sonnet vs opus), background flags"
    - label: "Agent additions/improvements — add agents, refine existing agent prompts or models"
    - label: "Skill dependencies — add/update/remove required tools or npx packages"
```

Store selected dimensions as UPDATE_DIMENSIONS.

## Step 3: Confirm proposed changes

For each dimension in UPDATE_DIMENSIONS, articulate specifically what you intend to change — not vague intentions but concrete edits.

If "Address requests in plan" is selected: read all plan files in `.codevoyant/plans/{skill-slug}/` (plan.md, implementation phases, proposed skill files, any inline comments or TODOs), then list each request or piece of feedback found and state exactly how you will address it.

For all other dimensions: describe the specific edit per dimension. Example: "For Prompt quality: I'll rewrite the trigger description to include three more trigger phrases and tighten Step 2 to name the exact tool used."

Present this as your proposed direction and ask for confirmation:

```
AskUserQuestion:
  question: "Does this capture the changes you want to make?"
  header: "Direction check"
  options:
    - label: "Yes — proceed"
    - label: "No — I want something different (describe below)"
```

If the user wants changes, apply and re-confirm once before continuing.

---

If the skill being updated is technology-specific or knowledge-oriented (infer from reading the SKILL.md — check for references to specific frameworks, external APIs, or research artifacts), also ask:

```
AskUserQuestion:
  question: "Are there specific resources, docs, or URLs you want to consult for this update?"
  header: "Resources"
  options:
    - label: "Yes — I'll list them below"
    - label: "No — use what's in the skill already"
```

If yes, wait for the user to provide the list. Store as RESOURCE_LIST.

## Step 4: Research (if resources provided)

If RESOURCE_LIST is non-empty:

Tell the user: "Starting deep research on {N} resource(s) — this may take a few minutes. I'll notify you when the plan is ready."

Use the Agent tool to launch all researchers in a **single message** (one tool call per resource) so they run concurrently. For each resource, substitute into `agents/skill-researcher.md`:

- `{RESOURCE_URL}` — the resource URL or path
- `{SKILL_NAME}` — the skill being updated
- `{OUTPUT_PATH}` — `.codevoyant/plans/{skill-slug}-update-{YYMMDD}/research/{slug}.md`

Each agent: model: claude-sonnet-4-6, run_in_background: true.

Do not send agent calls across separate messages — all must be in one message to run in parallel. Wait for all to complete before continuing.

Read all artifacts in `.codevoyant/plans/{skill-slug}-update-{YYMMDD}/research/` and incorporate findings into the plan.

## Step 5: Launch skill-updater (Opus)

Substitute into `agents/skill-updater.md`:
- `{SKILL_NAME}` — the skill slug
- `{TARGET_PATH}` — TARGET_PATH from Step 1
- `{TARGET_TYPE}` — TARGET_TYPE from Step 1 (`plan` or `existing`)
- `{UPDATE_DIMENSIONS}` — UPDATE_DIMENSIONS from Step 2 (comma-separated)
- `{RESOURCE_ARTIFACTS_DIR}` — `.codevoyant/plans/{skill-slug}-update-{YYMMDD}/research/` (may be empty)
- `{PLAN_DIR}` — `.codevoyant/plans/{skill-slug}-update-{YYMMDD}/`
- `{AGENT_TEMPLATE_PATH}` — `references/agent-template.md`

Agent: model: claude-opus-4-6, run_in_background: false.

Wait for completion. The agent registers the plan (if TARGET_TYPE=existing) and sends a notify. Read `{PLAN_DIR}/plan.md` and present it to the user.

Present plan to user.

```
AskUserQuestion:
  question: "Does this update plan look right?"
  header: "Plan review"
  options:
    - label: "Accept — apply changes"
    - label: "Adjust (describe changes)"
    - label: "Cancel"
```

Loop until accepted or cancelled. You MUST keep asking until the user is satisfied.

## Step 6: Apply changes

Only after plan accepted. Write from plan files to the actual skill directory:

- Copy `files/proposed-skill.md` → TARGET_PATH
- Copy `files/agents/{name}.md` → `{skill-dir}/agents/{name}.md` for each modified agent

Do not touch any files not covered by the update plan.

## Step 7: Validate

Run `/skill review` to audit changes.

Report: "Skill updated. Run /skill review to audit changes."
