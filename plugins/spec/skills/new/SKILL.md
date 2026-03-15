---
description: Create a new spec plan by exploring requirements and building a structured implementation plan. Proactively suggest this when a user describes a feature, refactor, or project they want to build — even if they don't say "plan". Pass --blank to skip planning and create an empty template directly. Pass a Linear issue URL, Notion page URL, or GitHub/GitLab issue URL to seed requirements automatically. Triggers on keywords like new plan, create plan, plan, spec new, I want to build, let's implement, init plan, initialize plan, create empty plan, plan template, scaffold plan, spec, spec out, spec this, spec it out, let's spec, create a spec, write a spec, spec the, speccing.
argument-hint: "[plan-name|url] [--branch branch-name] [--blank]"
disable-model-invocation: true
context: fork
agent: spec-planner
model: claude-opus-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Create a new plan by exploring requirements and building a structured plan. The
goal is to create a high quality implementation plan that can be executed
autonomously.

## Step 0: Parse Arguments

Check for plan name and optional --branch flag: `/spec:new plan-name --branch branch-name`

**Argument Parsing:**
- Plan name (first non-flag argument): `/spec:new my-plan-name` (no spaces in plan name)
- Optional --branch flag: `/spec:new my-plan-name --branch feature-branch`
  - Flag can be anywhere: `/spec:new --branch feature-branch my-plan-name`
  - Branch name extracted from argument after `--branch`
  - Branch name validation: alphanumeric, hyphens, underscores, slashes only
  - If branch name invalid, show error: "Invalid branch name. Use only alphanumeric characters, hyphens, underscores, and slashes."
- Plan names use hyphens, not spaces (enforced by slugification)
- Do NOT accept quoted arguments for plan names: `/spec:new "my plan"` is invalid
- If plan name contains spaces, inform user that plan names cannot have spaces
- If plan name provided, validate and slugify it
- If plan name not provided, will derive from objective later in Step 5

**Store parsed values:** `PLAN_NAME`, `BRANCH_NAME`, `BLANK_MODE=false`.

**If `--blank` flag present:** Set `BLANK_MODE=true`. After worktree setup (Step 2.5), skip directly to **Step 5.1** — do not ask planning questions (Steps 3–4). Create the empty template and register it. Do not run validation (Step 5.6). Report completion.

**Detect external source links:**

Check if any argument (or the full ARGUMENTS string) contains a URL from a supported source:
- Linear issue: `linear.app/*/issue/*` or `app.linear.app/*/issue/*`
- Notion page: `notion.so/*` or `notion.com/*`
- GitHub issue: `github.com/*/issues/*`
- GitLab issue: `gitlab.com/*/issues/*` or `gitlab.*/-/issues/*`

Store as:
- `SOURCE_URL` — the detected URL (empty if none)
- `SOURCE_TYPE` — `linear` | `notion` | `github` | `gitlab` | `none`
- `SOURCE_ID` — extracted issue/page ID (for API lookups)

## Step 0.5: Detect Branch Context

Run `git rev-parse --git-dir` to confirm this is a git repo. If not, disable branch features (`CURRENT_BRANCH=""`, `TARGET_BRANCH=""`, `BASE_BRANCH=""`).

If in a git repo:
- `CURRENT_BRANCH` = `git rev-parse --abbrev-ref HEAD`
- If `--branch` flag given: `TARGET_BRANCH=$BRANCH_NAME`, `SHOULD_CREATE_WORKTREE=true`, `BASE_BRANCH=$CURRENT_BRANCH`
- Otherwise: `TARGET_BRANCH=$CURRENT_BRANCH`, `SHOULD_CREATE_WORKTREE=false`, `BASE_BRANCH=$CURRENT_BRANCH`

Store these values for use in later steps:
- `CURRENT_BRANCH` - Current git branch (empty if not in git repo)
- `TARGET_BRANCH` - Branch to associate with plan
- `BASE_BRANCH` - Base branch for creating new branches
- `SHOULD_CREATE_WORKTREE` - Whether to create worktree (true if --branch flag used)

## Step 0.8: Fetch External Source (if URL provided)

If `SOURCE_TYPE` is `none`, skip this step.

Fetch content from the source and store as `EXTERNAL_CONTEXT` for use in Step 4.

**Linear** (`SOURCE_TYPE=linear`):
Extract the issue ID from the URL (format: `{TEAM}-{NUMBER}`, e.g., `ENG-123`).
Use the `mcp__claude_ai_Linear__get_issue` tool with the extracted issue identifier.
Extract: title → use as candidate PLAN_NAME if not already set; description, comments, labels, priority, assignee.
`EXTERNAL_CONTEXT` = formatted summary of the issue.

**Notion** (`SOURCE_TYPE=notion`):
Extract the page ID from the URL (last path segment or UUID).
Use the `mcp__claude_ai_Notion__notion-fetch` tool with the URL.
Extract: page title → candidate PLAN_NAME; page content as requirements context.
`EXTERNAL_CONTEXT` = page content summary.

**GitHub issue** (`SOURCE_TYPE=github`):
Extract owner, repo, issue number from URL.
Run: `gh issue view {number} --repo {owner}/{repo} --json title,body,labels,comments`
`EXTERNAL_CONTEXT` = issue title + body + relevant comments.

**GitLab issue** (`SOURCE_TYPE=gitlab`):
Extract project path and issue number from URL.
Run: `glab issue view {number} --repo {project-path} --output json`
`EXTERNAL_CONTEXT` = issue title + description + notes.

Report: `✓ Fetched context from {SOURCE_TYPE}: "{title}"`

If fetch fails: warn but continue — the user can provide requirements manually in Step 4.

## Step 1: Check for Existing Plan

If a specific plan name was provided, check if `.codevoyant/plans/{plan-name}/plan.md` already exists.
If no plan name was provided, check if `.codevoyant/plans/README.md` exists and contains any active plans.

When a matching plan is found, read the plan to check completion status
- Run `/refresh` logic to verify if all tasks are complete
- Based on status:
  - If plan is complete (all phases have ✅):
    - Inform user the plan is complete.
    - Use **AskUserQuestion** tool:
      ```
      question: "Plan '{plan-name}' is complete. What would you like to do?"
      header: "Plan Complete"
      multiSelect: false
      options:
        - label: "Replace with new plan"
          description: "Delete completed plan and create new one"
        - label: "Create ADR first"
          description: "Capture as ADR with /adr:capture, then replace"
        - label: "Cancel"
          description: "Keep existing plan, don't create new one"
      ```
  - If plan is incomplete:
    - Inform user there's an incomplete plan.
    - Use **AskUserQuestion** tool:
      ```
      question: "Plan '{plan-name}' is incomplete (X% done). What would you like to do?"
      header: "Plan Exists"
      multiSelect: false
      options:
        - label: "Replace plan"
          description: "Delete incomplete plan and create new one"
        - label: "Capture work first"
          description: "Save progress via /adr:capture, then replace"
        - label: "Continue existing"
          description: "Resume work on existing plan (run /go)"
        - label: "Cancel"
          description: "Keep existing plan, don't create new one"
      ```
- WAIT FOR USER decision before proceeding

## Step 2: Initialize .spec Structure

- Create `.codevoyant/plans/` directory if it doesn't exist
- Create or update `.codevoyant/plans/README.md` if it doesn't exist (with empty Active/Archived sections)

## Step 2.5: Create Worktree (if requested)

If user provided `--branch` flag, create a git worktree for the plan:

Follow the steps in `references/create-worktree-steps.md` (in this skill directory). Variable name here is `TARGET_BRANCH`. After completion, store `PLAN_WORKTREE="$WORKTREE_PATH"` (or `""` if `SHOULD_CREATE_WORKTREE=false`).

**Error Handling:**
- If worktree already exists, show error and exit
- If directory collision, show error and exit
- If git commands fail, propagate error

## Step 3: Understand the Goal

Ask: "What are you planning to build, implement, or accomplish?"

Wait for the user's response describing their objective.

## Step 3.5: Discover Task Runners

Before research, scan the project root for task runners. This determines how the execution agent will build, test, and validate — it MUST use these instead of inventing its own commands.

Run `scripts/detect-task-runners.sh` and store output as `TASK_RUNNER_SUMMARY`. The script checks for `just`, `make`, `task`, `mise`, `docker-compose`, `npm/yarn/pnpm`, `rake`, `gradle`, `mvn` and lists their available commands.

From the output, specifically identify commands for: **build, test, lint, format, typecheck, run/dev**. Note gaps where a category has no dedicated recipe.

**Store as `TASK_RUNNER_SUMMARY`** — embedded in plan metadata and implementation files so execution agents use project commands, not invented ones. If script returns `"none detected"`, proceed.

## Step 3.6: Discover Available Skills

Check for skills that could accelerate or improve execution:

1. **Local skills** — scan `.claude/skills/` and `plugins/*/skills/` for installed skills relevant to this plan's tech stack or objective. Note any that the execution agent should invoke.

2. **Community skills** — based on the project's detected stack, suggest checking [agentskill.sh](https://agentskill.sh/) for community-published skills. Fetch the page if helpful to identify relevant skills (e.g., a skill for the detected framework, language, or CI system).

**Store as `AVAILABLE_SKILLS`** — list of skill names with brief descriptions of when to use them. This gets included in the plan for the execution agent.

## Step 4: Explore Requirements

1. Clarify Requirements

   If `EXTERNAL_CONTEXT` is set, present it to the user and use it to seed requirements:
   - Pre-fill the objective from the source title/description
   - Note the source reference in the plan metadata: `Source: {SOURCE_URL}`
   - Ask only follow-up questions that the external context doesn't already answer
   - Skip redundant clarification if the source is detailed enough

   - Ask follow-up questions to understand scope and constraints
   - Identify key components or areas that need work
   - Identify whether to lean towards lightweight prototyping or hardcore
     enterprise style engineering for the plan
   - Understand dependencies and order of operations

2. Research Context — run in parallel

   Launch three research agents simultaneously via the Task tool (`run_in_background: true`), then collect all results before proceeding:

   **Agent R1 — Codebase scan** (`model: claude-haiku-4-5-20251001`)
   - Glob/Grep the repo for files, patterns, and existing abstractions relevant to the objective
   - Identify files/systems that will be affected
   - Map the existing architecture and note conventions (naming, structure, patterns in use)
   - Save findings to `$PLAN_DIR/research/codebase-analysis.md`

   **Agent R2 — External research** (`model: claude-sonnet-4-6`)
   - Research existing libraries and solutions for the detected stack
   - Research architectural and design patterns applicable to the objective
   - Keep track of URLs for all resources
   - Save findings to `$PLAN_DIR/research/library-research.md`

   **Agent R3 — Skills lookup** (`model: claude-haiku-4-5-20251001`)
   - Check [agentskill.sh](https://agentskill.sh/) for published skills relevant to the tech stack or objective
   - Check local `.claude/skills/` for installed skills that apply
   - Save a brief list to `$PLAN_DIR/research/available-skills.md`

   Wait for all three agents to complete, then synthesize their findings into your planning context. The research files remain available for the execution agent.

3. Ask follow-up questions **only if still needed** after research.

   - If Step 4.3 exploration is planned (see below), hold off — the proposal selection will likely resolve architectural choices.
   - Ask questions whose answers would meaningfully change the plan; skip anything the research already answered.
   - Ask any questions needed to unblock autonomous execution by Claude.

4. Break Down Work — **after Step 4.3 if exploration was done**.

   - Identify logical phases or groupings of work informed by the selected proposal (or the objective if no exploration)
   - For each phase, identify specific tasks
   - Consider dependencies between phases
   - **Always include a final validation phase** that runs the project's actual build/test commands via the detected task runners — never skip this
   - Estimate complexity and risks

## Step 4.3: Offer Architecture Exploration (Optional)

Run this after research (Step 4 item 2) and before breaking down work (Step 4 item 4). Skip if:
- `--blank` flag is set
- Objective is straightforward — simple bug fix, small config change, or clear single-path refactor (use judgment)

**Identify candidate approaches:**

Based on the research findings and objective, identify 2–3 genuinely distinct architectural approaches worth comparing. Each must differ in structure or trade-offs, not just naming. Examples by task type:

| Task type | Possible approaches |
|---|---|
| Feature (e.g., feed, auth) | Client-driven vs. server-driven vs. hybrid; pull vs. push data model |
| Refactor | Extract service layer vs. functional core vs. domain model |
| Data schema change | Normalised relational vs. denormalised vs. document vs. event-sourced |
| API design | REST vs. GraphQL vs. RPC; monolithic handler vs. resource-based |

Use **AskUserQuestion**:
```
question: "Before building the plan, I can generate {N} terse proposals comparing architectural approaches. Worth exploring?"
header: "Architecture Exploration"
multiSelect: false
options:
  - label: "Yes — generate proposals"
    description: "{approach-1}, {approach-2}{, approach-3 if any} — I'll summarise trade-offs so you can pick a direction"
  - label: "Skip — build the plan directly"
    description: "Proceed to implementation planning without exploring alternatives"
```

If "Skip": proceed to Step 4 item 4 (Break Down Work).

**Generate proposals in parallel:**

Launch one Task agent per approach (`run_in_background: true`, `model: claude-sonnet-4-6`). Pass each agent:
- The plan objective and requirements gathered so far
- Research findings (contents or paths of `$PLAN_DIR/research/codebase-analysis.md` and `library-research.md`)
- Its assigned approach name and a brief description of what angle to explore
- Instructions to write a terse, decision-oriented document — NOT an implementation plan

Each agent writes `$PLAN_DIR/proposals/{approach-slug}.md` using the template in `references/proposal-template.md`.

Wait for all agents to complete (`TaskOutput block=true`).

**Present and choose:**

Summarise each proposal in one line, then use **AskUserQuestion**:
```
question: "Proposals ready — which approach should the plan follow?"
header: "Choose Approach"
multiSelect: false
options:
  - label: "{approach-1}"
    description: "{one-sentence verdict from proposal}"
  - label: "{approach-2}"
    description: "{one-sentence verdict from proposal}"
  - label: "{approach-3 if any}"
    description: "{one-sentence verdict from proposal}"
  - label: "Synthesize — blend the best elements"
    description: "Draw from multiple proposals rather than picking one"
  - label: "None — let me describe what I want"
    description: "The proposals don't capture my preferred direction"
```

- **Approach selected**: store as `SELECTED_APPROACH`, note the proposal file path, skip further architectural clarifying questions — the proposal resolved them
- **Synthesize**: note that plan should draw from all proposals; no further clarifying questions needed
- **None**: follow up with a free-text question to capture the user's preferred approach, then store it as a short description

**The selected approach drives Step 4 item 4 and Step 5.** Plan phases, implementation files, and architecture decisions should reflect it. Add a `Proposal` metadata line to plan.md referencing the chosen file.

## Step 4.5: Offer Worktree Creation (Optional)

If user did NOT provide `--branch` flag, optionally offer to create a worktree:

**Only ask if:**
- In a git repository (CURRENT_BRANCH is set)
- Not already in a worktree
- No --branch flag was provided

Check if already in worktree: run `scripts/check-worktree.sh` — exits 0 if in a worktree, 1 if not. Set `IN_WORKTREE=true/false` accordingly.

If conditions are met (in git repo, not in worktree, no --branch flag):
1. Derive suggested branch name from plan name (once determined)
2. Use **AskUserQuestion** tool:

```
question: "Would you like to create a git worktree for this plan?"
header: "Worktree Setup"
multiSelect: false
options:
  - label: "Yes, create worktree"
    description: "Create branch 'feature-{plan-name}' with worktree at .codevoyant/worktrees/feature-{plan-name}"
  - label: "Custom branch name"
    description: "Create worktree with a different branch name"
  - label: "No, continue on current branch"
    description: "Work on current branch '{CURRENT_BRANCH}' without worktree"
```

Based on user response:
- **"Yes, create worktree"**: Set `BRANCH_NAME="feature-{plan-name}"`, `SHOULD_CREATE_WORKTREE=true`, update `TARGET_BRANCH`
- **"Custom branch name"**: Ask for branch name using another prompt, then set variables
- **"No, continue on current branch"**: Continue with current branch as metadata only (default behavior)

**Note:** This prompt is optional and skipped if:
- User already provided `--branch` flag
- Not in a git repository
- Already working in a worktree

## Step 5: Create Structured Plan

After gathering requirements:

### 5.1: Determine Plan Name

- If plan name was provided as argument in Step 0, use it
- If not provided, derive from objective using these rules:
  - Convert to lowercase
  - Replace spaces with hyphens
  - Remove special characters (keep alphanumeric and hyphens only)
  - Truncate to 50 characters max
  - Example: "Add Authentication System" → "add-authentication-system"
- Validate the name
- `CHECK_DIR` = `$PLAN_WORKTREE/.codevoyant/plans` if worktree set, else `.codevoyant/plans`
- Resolve collisions: run `scripts/resolve-plan-name.sh <base-name> <CHECK_DIR>` — returns a unique name (appends -2 .. -10) or exits 1 if all taken. If name was modified, inform user.

### 5.2: Create Plan Directory Structure

If `PLAN_WORKTREE` is set and not `"(none)"`: `PLAN_BASE_DIR="$PLAN_WORKTREE/.codevoyant/plans"`, else `PLAN_BASE_DIR=".codevoyant/plans"`. `PLAN_DIR="$PLAN_BASE_DIR/{plan-name}"`.

Create: `$PLAN_BASE_DIR/`, `$PLAN_DIR/`, `$PLAN_DIR/implementation/`, `$PLAN_DIR/research/`, `$PLAN_DIR/proposals/` (for exploration artifacts).

Report: `✓ Plan directory created at: $PLAN_DIR` — note if in worktree or main repo.

### 5.3: Create Plan Files

**a. Create plan.md** at `$PLAN_DIR/plan.md` with high-level structure:

Prepare metadata: `CREATED_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")`, `METADATA_BRANCH=$TARGET_BRANCH` (or `"(none)"`), `METADATA_BASE_BRANCH=$BASE_BRANCH` (or `"main"`), `METADATA_WORKTREE=$PLAN_WORKTREE` (or `"(none)"`), `METADATA_TASK_RUNNERS=$TASK_RUNNER_SUMMARY`.

Create plan.md using the template in `references/plan-template.md` (in this skill directory), substituting all `{...}` placeholders with the prepared metadata values. Include `METADATA_TASK_RUNNERS` in the Metadata section. If `SOURCE_URL` is set, include `- **Source**: {SOURCE_URL}` in the Metadata section of plan.md.

**b. Create user-guide.md** at `$PLAN_DIR/user-guide.md`:

This documents how to use what will be built — not how it's implemented. Use the template in `references/user-guide-template.md` (in this skill directory). Fill in what is knowable now (overview, intended usage patterns, expected API surface) and mark unknowable sections with `<!-- TODO: fill in during/after execution -->`. The execution agent must keep this file updated as code is built.

Format Requirements for plan.md:
- Use `### Phase N - Description` for phase headers
- Use `1. [ ]` for unchecked tasks
- Use `1. [x]` for checked tasks (all start unchecked)
- Keep task descriptions concise (one line each)
- Add ✅ to phase header only when all tasks in that phase are complete
- Do NOT include detailed implementation specs in plan.md

**c. Create implementation files** for each phase:

For each phase in the plan, create `.codevoyant/plans/{plan-name}/implementation/phase-N.md`:
- Number phases sequentially (phase-1.md, phase-2.md, phase-3.md, etc.)
- Use the template structure in `references/implementation-template.md` (in this skill directory)

**IMPORTANT:** Move ALL detailed implementation specifications into the phase-N.md files:
- Dependencies to add/remove
- Code that will be added/removed with target filenames
- Files to create/modify/delete
- Testing requirements and validation steps
- Detailed execution steps

**Task runner constraint (CRITICAL):** Every build, test, lint, and run command in implementation files MUST use the project's task runners (`METADATA_TASK_RUNNERS`). Never invent custom shell commands when a task runner recipe exists. If a needed operation isn't covered by an existing recipe, note it as a gap and suggest adding one. Include the discovered task runner commands in each phase file's header.

**Available skills:** If `AVAILABLE_SKILLS` is non-empty, note relevant skills in the phase files where they apply (e.g., "use `/ci:monitor` after pushing").

Keep plan.md concise with only:
- High-level objectives
- Design overview
- Task checklists (one-line items)

### 5.4: Register in README

Update `$PLAN_BASE_DIR/README.md` (which is `$PLAN_WORKTREE/.codevoyant/plans/README.md` when in a worktree, otherwise `.codevoyant/plans/README.md`):
- Add plan to Active Plans section
- Include branch and worktree information if applicable
- Set status to "Active"
- Calculate initial task count from plan.md
- Set created and last updated timestamps to current time
- Use this format:

```markdown
### {plan-name}
- **Description**: [extracted from plan objective]
{if METADATA_BRANCH != "(none)"}
- **Branch**: {METADATA_BRANCH} 🌿
{endif}
{if METADATA_WORKTREE != "(none)"}
- **Worktree**: {METADATA_WORKTREE}
{endif}
- **Status**: Active
- **Progress**: 0/X tasks (0%)
- **Created**: {CREATED_TIMESTAMP}
- **Last Updated**: {CREATED_TIMESTAMP}
- **Path**: `.codevoyant/plans/{plan-name}/`
```

**Implementation:**
Only include branch and worktree lines if they have values other than "(none)".

### 5.5: Create All Implementation Files

**IMPORTANT:** Create detailed implementation files for ALL phases before proceeding.

1. **Parse the plan.md** to count phases:
   - Read `$PLAN_DIR/plan.md`
   - Count lines matching pattern: `^### Phase (\d+)`
   - Store the total number of phases

2. **Create implementation file for each phase:**

For each phase number from 1 to total phases:

Create `$PLAN_DIR/implementation/phase-{N}.md` using the template in `references/implementation-template.md` (in this skill directory).

## Validation

After creating all implementation files:
1. Verify each file exists: `$PLAN_DIR/implementation/phase-{1..N}.md`
2. Verify each file is not empty (>100 bytes minimum)
3. Report created files to user:
   ```
   Created implementation files:
   ✓ phase-1.md - {Phase Name}
   ✓ phase-2.md - {Phase Name}
   ...
   ```

**If any file creation fails:**
- Report error with specific phase number
- Do not proceed to Step 6
- User must fix before continuing

## Step 5.6: Iterative Plan Validation and Auto-Fix

Immediately after all implementation files are verified, run an automated validation-and-fix loop. Do NOT ask the user — execute all rounds autonomously.

Follow the loop mechanics in `references/validation-loop.md` (minimum 2 rounds, cap at 3, auto-fix every `NEEDS_IMPROVEMENT` result before the next round).

## Step 6: Review

Present the final validation summary and ask: "Does this plan cover everything? Any changes needed?"

Wait for confirmation or adjustments.

## Best Practices and Execution Constraints

See `references/execution-guidelines.md` for task writing best practices and constraints that execution agents (go, bg) must follow.
