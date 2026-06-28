# new

Create a structured multi-phase implementation plan. The goal is a tight, well-scoped plan that an autonomous execution agent can follow without further guidance.

## ⛔ HARD STOPS — read before every action

This workflow's **only output** is plan files. If you are about to do anything else, stop.

| You are about to… | Correct action |
|---|---|
| Edit a source file | Stop. Add a task to the plan instead. |
| Write application code | Stop. Describe it in `implementation/phase-N.md`. |
| Run build / test / lint | Stop. Record the command in plan metadata. |
| Fix a bug you noticed | Stop. Add it as a task in the appropriate phase. |
| Write a task that says "research / investigate / explore / decide / figure out X" | Stop. Resolve it **now**, during planning — read the codebase (Glob/Grep/Read) and use WebSearch/WebFetch — then write the concrete answer and code. The written plan must be delta-free; the execution agent never researches or makes open design decisions. |
| Keep going after "looks good" | Stop. Your job is done. Tell the user to run `/spec go`. |

**Permitted file writes:** `.codevoyant/plans/{name}/plan.md`, `.codevoyant/plans/{name}/user-guide.md`, `.codevoyant/plans/{name}/implementation/phase-N.md`, `.codevoyant/plans/{name}/research/*`, `.claude/settings.json` (permissions only).

Everything else is off-limits until `/spec go` is run.

## Variables

Received from dispatcher:

- `PLAN_NAME` — first non-flag argument (may be empty)
- `BRANCH_NAME` — value after `--branch` (may be empty)
- `BLANK_MODE` — true if `--blank` present
- `BG_MODE` — true if `--bg` present
- `SILENT` — true if `--silent` present
- `SOURCE_URL`, `SOURCE_TYPE`, `SOURCE_ID` — populated if a URL was detected in arguments

```
VALIDATE_MODE=false
[[ "$*" =~ --validate|-v ]] && VALIDATE_MODE=true
```

## Step 0.5: Detect Branch Context

Run `git rev-parse --git-dir` to confirm this is a git repo. If not, disable branch features (`CURRENT_BRANCH=""`, `TARGET_BRANCH=""`, `BASE_BRANCH=""`).

If in a git repo:

- `CURRENT_BRANCH` = `git rev-parse --abbrev-ref HEAD`
- If `--branch` flag given: `TARGET_BRANCH=$BRANCH_NAME`, `SHOULD_CREATE_WORKTREE=true`, `BASE_BRANCH=$CURRENT_BRANCH`
- Otherwise: `TARGET_BRANCH=$CURRENT_BRANCH`, `SHOULD_CREATE_WORKTREE=false`, `BASE_BRANCH=$CURRENT_BRANCH`

**If `BLANK_MODE=true`:** After worktree setup (Step 2.5), skip directly to **Step 5.1** — do not ask planning questions. Create the empty template and register it. Do not run validation. Report completion.

**If `--bg` flag present:** After the plan is fully created and validated (after Step 6 "Looks good"), automatically launch background execution via `spec bg` on the new plan. Pass `--silent` if `SILENT=true`.

## Step 0.8: Fetch External Source (if URL provided)

If `SOURCE_TYPE` is `none`, skip this step.

**Linear** (`SOURCE_TYPE=linear`): Use `mcp__linear-server__get_issue` with the extracted issue identifier. Extract title → candidate `PLAN_NAME` if not set; description, comments, labels, priority.

**Notion** (`SOURCE_TYPE=notion`): Use `mcp__claude_ai_Notion__notion-fetch` with the URL. Extract page title → candidate `PLAN_NAME`; content as requirements context.

**GitHub issue** (`SOURCE_TYPE=github`): Run `gh issue view {number} --repo {owner}/{repo} --json title,body,labels,comments`.

**GitLab issue** (`SOURCE_TYPE=gitlab`): Run `glab issue view {number} --repo {project-path} --output json`.

Store result as `EXTERNAL_CONTEXT`. Report: `✓ Fetched context from {SOURCE_TYPE}: "{title}"`. If fetch fails, warn and continue.

## Step 1: Check for Existing Plan

If a specific plan name was provided, check if `.codevoyant/plans/{plan-name}/plan.md` already exists.
If no plan name provided, check for active plans:

```bash
grep "| Active |" .codevoyant/README.md 2>/dev/null || echo "No active plans"
```

When a matching plan is found:

- If plan is **complete** (all phases have ✅): use **AskUserQuestion** — "Replace with new plan" or "Cancel"
- If plan is **incomplete**: use **AskUserQuestion** — "Replace plan", "Continue existing (run /spec go)", or "Cancel"

WAIT FOR USER decision before proceeding.

## Step 2: Initialize .codevoyant Structure

```bash
mkdir -p .codevoyant/plans .codevoyant/explore
if [ ! -f .codevoyant/README.md ]; then
  printf "# Active Plans\n\n| Name | Status | Plugin | Description | Created | Branch |\n|------|--------|--------|-------------|---------|--------|\n" > .codevoyant/README.md
fi
```

## Step 2.5: Create Worktree (if requested)

If `--branch` flag was given:

```bash
git worktree add -b "$TARGET_BRANCH" ".worktrees/$TARGET_BRANCH" "$BASE_BRANCH" && \
  echo "✓ Worktree created at .worktrees/$TARGET_BRANCH" || \
  { echo "✗ Worktree creation failed"; exit 1; }
PLAN_WORKTREE=".worktrees/$TARGET_BRANCH"
```

If `SHOULD_CREATE_WORKTREE=false`, set `PLAN_WORKTREE=""`. Error and exit if worktree already exists or git commands fail.

## Step 3: Understand Scope

**3a. Determine objective — minimize questions**

Decision tree (in order):

1. **`REMAINING_ARGS` non-empty** → use it directly as `OBJECTIVE`. Set `RESEARCH_CONTEXT=""`. Do not ask. Skip to Step 3b.
2. **`EXTERNAL_CONTEXT` set** → use the fetched title/description as `OBJECTIVE`. Set `RESEARCH_CONTEXT=""`. Do not ask. Skip to Step 3b.
3. **Explorations exist in `.codevoyant/explore/`** → use **one** AskUserQuestion listing the 3 most recent explorations plus "Describe something new":
   ```
   question: "What would you like to plan?"
   header: "Objective"
   options:
     - label: "{exploration-name}"
       description: "{one-line summary from summary.md, or derived from directory name}"
     - … (up to 3 most recent)
     - label: "Describe something new"
       description: "Type your objective in the Other field"
   ```
   If user selects an exploration: read all files in that exploration directory and store as `RESEARCH_CONTEXT`; use the exploration topic as `OBJECTIVE`. If "Describe something new": use the typed response as `OBJECTIVE` and set `RESEARCH_CONTEXT=""`.
4. **No args, no external context, no explorations** → use **one** open-ended AskUserQuestion: "What would you like to plan?" (free-text via Other). Use the typed response as `OBJECTIVE`. Set `RESEARCH_CONTEXT=""`.

**3b. Confirm objective (silent unless ambiguous)**

If `EXTERNAL_CONTEXT` is set and the title/description is ambiguous, briefly present it and confirm. Otherwise proceed without asking.

Store final value as `OBJECTIVE`.

## Step 4: Clarify and Narrow Scope

**4a. Ask clarifying questions only if needed**

Assess `OBJECTIVE` first. If it has sufficient detail (≥5 words describing a concrete feature, system change, or outcome) and `RESEARCH_CONTEXT` or `EXTERNAL_CONTEXT` covers the major unknowns, **skip this sub-step entirely** and proceed to 4b.

If the objective is vague (e.g. "improve auth", "make it faster"), ask **one** focused AskUserQuestion targeting the single biggest unknown. Provide at most 2 options + Other. Do not chain follow-ups.

**4b. Scope check**

Assess whether the scope is narrow enough for direct planning. A scope is **too broad** if:

- It spans more than ~3 unrelated subsystems without a clear integration seam
- The approach is genuinely undecided between architecturally different options
- Key unknowns remain that would force the execution agent to make high-stakes design choices

If scope is **clear**: proceed directly to Step 5.

If scope is **too broad**: launch an Opus researcher to propose options:

```
Agent (model: claude-opus-4-6, run_in_background: false):

You are a technical advisor helping scope a software implementation plan.

Objective: {OBJECTIVE}
Clarifications: {user answers from 4a, if any}
Research context: {RESEARCH_CONTEXT if set}

The scope is too broad for direct planning. Propose 2–3 high-level implementation approaches.

For each approach:
- Name (slug-style, e.g. "event-driven-pipeline")
- One-sentence summary
- Key trade-off vs the alternatives (one sentence)
- Rough phase count

Keep each proposal to 4–5 lines. Be concrete — reference actual files or patterns from the codebase if research context is available.
```

Present the proposals to the user.

If `BG_MODE=true`: instruct the Opus agent to also select the strongest approach and briefly justify it. Use that selection and continue — do not ask.

If `BG_MODE=false`: use **one** AskUserQuestion for approach selection.

Store selected approach as `SELECTED_APPROACH`. Update `OBJECTIVE` to incorporate it.

## Step 5: Create Structured Plan

### 5.1: Determine Plan Name

- Use provided plan name, or derive from `OBJECTIVE`:
  - Lowercase, hyphens for spaces, alphanumeric + hyphens only, max 50 chars
- Resolve collisions inline:
  ```bash
  CANDIDATE="<base-name>"
  SUFFIX=2
  while grep -q "| $CANDIDATE |" .codevoyant/README.md 2>/dev/null; do
    CANDIDATE="<base-name>-${SUFFIX}"
    SUFFIX=$((SUFFIX + 1))
  done
  PLAN_NAME="$CANDIDATE"
  ```
  Inform user if name was modified.

### 5.2: Create Plan Directory Structure

`CHECK_DIR` = `$PLAN_WORKTREE/.codevoyant/plans` if worktree set, else `.codevoyant/plans`.

`PLAN_DIR` = `$CHECK_DIR/{plan-name}`.

Create: `$PLAN_DIR/`, `$PLAN_DIR/implementation/`, `$PLAN_DIR/research/`.

If `RESEARCH_CONTEXT` is set, copy or link the explore artifacts into `$PLAN_DIR/research/` for the execution agent.

Report: `✓ Plan directory created at: $PLAN_DIR`

### 5.3: Create Plan Files

**a. plan.md** at `$PLAN_DIR/plan.md`

Prepare metadata: `CREATED_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")`, `METADATA_BRANCH=$TARGET_BRANCH` (or `"(none)"`), `METADATA_BASE_BRANCH=$BASE_BRANCH` (or `"main"`), `METADATA_WORKTREE=$PLAN_WORKTREE` (or `"(none)"`).

Use the template in `references/plan-template.md`. If `SOURCE_URL` set, add `- **Source**: {SOURCE_URL}` in the Metadata section.

**Phase 0 — Human Prerequisites (include only if needed)**

Before writing Phase 1, scan the objective and clarifications for anything that requires a human action that cannot be automated (sign up for accounts, obtain API keys, provision infrastructure, purchase plans, accept terms of service, obtain secrets). If any such prerequisites exist, create `### Phase 0 - Prerequisites`. If none, omit Phase 0 entirely.

Format:

- `### Phase N - Description` for phase headers
- `1. [ ]` for unchecked tasks (all start unchecked)
- `1. [x]` for checked tasks
- ✅ added to phase header only when all tasks complete
- Keep task descriptions concise (one line each)
- NO detailed implementation specs in plan.md

**Decision Log (populate immediately after creating plan.md):**

Scan OBJECTIVE, REMAINING_ARGS, and all AskUserQuestion answers for explicit user choices. For each user decision found, add to `### User Decisions`:

```
- `[user]` *planning* — {1-line title}
  > {user's exact words or close paraphrase}
```

For each significant design choice made by the planner (architecture, technology, phasing), add to `### Agent Decisions`:

```
- `[agent]` *planning* — {1-line title}: {rationale}
```

Populate the Decision Log before moving to Step 5.4. Aim for 2-5 entries per section. Do not fabricate decisions — only log real choices that shaped the plan.

**b. user-guide.md** at `$PLAN_DIR/user-guide.md`

**Required — do not skip.** Documents how to use what will be built, not how it's implemented. Use `references/user-guide-template.md`. Fill in what is knowable now; mark unknowable sections `<!-- TODO: fill in during/after execution -->`.

Verify: `test -s "$PLAN_DIR/user-guide.md" && echo "✓ user-guide.md" || echo "✗ MISSING — write it now"`

**c. Implementation files** — one per phase at `$PLAN_DIR/implementation/phase-N.md`

Use `references/implementation-template.md`. Move ALL detailed specs here:

- Dependencies to add/remove
- Files to create/modify/delete
- Code for non-trivial logic
- Testing and validation steps

**Task runner constraint (CRITICAL):** Every build, test, lint, and run command MUST use the project's task runner (mise/just/Makefile/package.json scripts). Before recording any such command, call `/task detect` to identify the runner and `/task list` to see available tasks — use those names verbatim. Never invent custom shell commands when a task runner recipe exists.

### 5.4: Register Plan

```bash
grep -q "| $PLAN_NAME |" .codevoyant/README.md 2>/dev/null || \
  printf "| %s | Active | spec | %s | %s | %s |\n" \
    "$PLAN_NAME" "$PLAN_DESCRIPTION" "$(date +%Y-%m-%d)" "${METADATA_BRANCH:-(none)}" \
    >> .codevoyant/README.md
echo "✓ Registered plan: $PLAN_NAME"
```

(Calculate `TASK_COUNT` by counting `[ ]` items in plan.md for reference, though task count is no longer tracked in the registry.)

### 5.5: Verify All Implementation Files

Phase 0 (Prerequisites) is a manual gate — it has **no implementation file**. Only phases 1 through N need implementation files.

```bash
echo "=== Plan file check ==="
test -s "$PLAN_DIR/plan.md"       && echo "✓ plan.md"       || echo "✗ MISSING: plan.md"
test -s "$PLAN_DIR/user-guide.md" && echo "✓ user-guide.md" || echo "✗ MISSING: user-guide.md — write it now"
for i in $(seq 1 $PHASE_COUNT); do
  f="$PLAN_DIR/implementation/phase-$i.md"
  test -s "$f" && echo "✓ phase-$i.md" || echo "✗ MISSING: phase-$i.md"
done
```

**If any file is missing or empty:** write it immediately before proceeding. Missing user-guide.md is a blocking failure. Never create `phase-0.md`.

## Step 5.6: Iterative Plan Validation and Auto-Fix (parallel with permissions analysis)

Immediately after all files are verified, launch two agents concurrently:

**Agent P — Permissions analysis** (`subagent_type: general-purpose`, `model: claude-haiku-4-5-20251001`, `run_in_background: true`):

```md
Analyze the spec plan at {PLAN_DIR} and identify every permission an autonomous execution agent will need.

Read:
- {PLAN_DIR}/plan.md
- {PLAN_DIR}/implementation/phase-*.md

For each phase, identify:
1. Bash commands used (git ops, task runners, CLIs like gh/glab)
2. External network access (WebFetch, WebSearch)

Map each to the Claude Code allow entry format:
- Shell commands → Bash({command}:*) e.g. Bash(git commit:*), Bash(just test:*)
- Network → WebFetch, WebSearch

Return a JSON object:
{
  "allow": ["Bash(git commit:*)", "Bash(just test:*)", ...],
  "rationale": {"Bash(git commit:*)": "Phase 2 commits after each task", ...}
}

Be specific — narrowest command prefix that covers actual usage.
Do NOT include standard baseline: Write, Edit, Read, Glob, Grep, Bash(mkdir:*), Bash(ls:*),
Bash(cat:*), Bash(find:*), Bash(echo:*), Bash(date:*), Bash(jq:*), Bash(bash:*), Bash(cp:*), Bash(mv:*).

Always include these portable skill-reference Read globs in the "allow" array (they stop per-session prompts on skill workflow/reference files, which live outside the project dir):
- "Read(~/.claude/skills/**)"
- "Read(~/.claude/plugins/**/skills/**)"
```

Store the Task ID as `PERMS_TASK_ID`.

**Validation loop** — only runs when `VALIDATE_MODE=true`:

```
if [[ "$VALIDATE_MODE" == "true" ]]; then
```

Run the loop mechanics in `references/validation-loop.md` (minimum 2 rounds, cap at 3, auto-fix every `NEEDS_IMPROVEMENT` result before next round). Execute all rounds autonomously — do NOT pause for the user.

```
fi
```

After the validation loop finishes (or was skipped), collect permissions result:

```
TaskOutput(id: PERMS_TASK_ID, block: true)
```

Parse the JSON and store as `SUGGESTED_ALLOW` and `PERMS_RATIONALE`.

## Step 6: Finish (permissions + completion)

If `SUGGESTED_ALLOW` is non-empty, present permission suggestions as informational text:

```
🔐 Permissions suggested for autonomous execution:

  • {entry}  ← {rationale}
  ...
```

Then automatically apply them: read `.claude/settings.json` (start from `{}` if absent), union `permissions.allow` array with `SUGGESTED_ALLOW` (deduplicate, sort), write back. Report: `✓ Added {N} allow entries to .claude/settings.json`.

Do **not** ask whether the plan covers everything. Finish immediately:

⛔ **STOP HERE. Do not implement anything.** Your job is complete. If `BG_MODE=true`, launch `/spec go {plan-name}` (pass `--silent` if `SILENT=true`) and report launch. If `BG_MODE=false`, report completion:

```
✅ Plan "{plan-name}" is ready.

  To execute:  /spec go {plan-name}
  To review:   /spec review {plan-name}
  To change:   /spec update {plan-name}
```

If you want any changes, tell the user to run `/spec update {plan-name}` — do not re-prompt here.

Then stop. Do not write any more files. Do not start implementing tasks.
