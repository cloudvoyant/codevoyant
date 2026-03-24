# stop

Stop a running background agent or pause manual work and capture session insights.

## Variables

- `PLAN_NAME` — plan to stop/pause (may be empty; will prompt if multiple plans exist)

## Step 1: Select Plan

If `PLAN_NAME` not provided, get all active plans and use `AskUserQuestion` if multiple exist.

## Step 2: Detect Execution State

Extract branch context:

```bash
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
```

Check `.codevoyant/plans/{plan-name}/execution-log.md` for `Status: RUNNING`:
- Found → `AGENT_RUNNING=true` → continue to **Step 3a**
- Not found → `AGENT_RUNNING=false` → continue to **Step 3b**

## Step 3a: Stop Background Agent (AGENT_RUNNING=true)

Use **AskUserQuestion** (Stop execution / Let it continue).

If confirmed:

1. Update execution-log.md: append `[timestamp] - STOP requested by user` and `Status: STOPPED`
2. ```bash
   npx @codevoyant/agent-kit plans update-status --name "$PLAN_NAME" --status Active
   ```
3. Report progress saved and resume commands (`/spec bg` or `/spec go`)

Note: the background agent may complete its current task before noticing the stop request.

## Step 3b: Capture Session Insights (AGENT_RUNNING=false)

No background agent is running. Capture insights from the current work session.

Read plan.md to understand current progress. Generate a comprehensive `## Insights` section covering:

1. **Progress Summary** — what's accomplished, phases complete/in-progress, completion %
2. **Key Decisions Made** — choices, rationale, trade-offs
3. **Context and Findings** — codebase discoveries, dependencies, constraints; include branch context
4. **Next Steps** — what to do when resuming, current task/phase, blockers
5. **Notes** — tips for picking up later, references to relevant files

Add or update the `## Insights` section at the end of plan.md.

```bash
npx @codevoyant/agent-kit plans update-status --name "$PLAN_NAME" --status Paused
```

Report: `Plan "{plan-name}" paused with session insights captured.`
