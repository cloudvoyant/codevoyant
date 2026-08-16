# go

Execute the plan in the background using an autonomous agent. The agent works through every phase without interruption while you continue working.

## Variables

- `PLAN_NAME` — plan to execute (may be empty; will prompt if multiple plans exist)
- `AUTO_APPROVE` — true if `--yes` or `-y` present
- `ALLOW_COMMITS` — true if `--commit` or `-c` present. When true, the executor commits each completed phase through the git skill (`/git commit --yes [--no-push | --fix]` — never raw `git commit`), pushing when a remote exists. When CI exists (remote + workflows + matching `gh`/`glab` CLI), CI-green is a HARD per-phase gate: `/git commit --yes --fix` blocks until green (bounded) or the phase is reported FAILED. When no CI/CLI/remote exists, the commit still happens (locally, or pushed without a CI watch) and the gate is absent. When false, no commits, no push, and no CI check.
- `SILENT` — true if `--silent` present

## Step 1: Select Plan

If `PLAN_NAME` not provided:

1. ```bash
   grep "| Active |" .codevoyant/README.md 2>/dev/null || echo "No active plans"
   ```
2. Sort by Last Updated (most recent first)
3. If only one plan exists, auto-select it
4. If multiple plans exist, use `AskUserQuestion` to present list
5. If no plans exist, inform user to create with `/spec new`

## Step 2: Analyze Plan Scope

Read `.codevoyant/plans/{plan-name}/plan.md` and report total phases, total tasks, starting point, and estimated complexity.

## Step 2.5: Validate and Setup Worktree Context

Parse plan metadata:

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
PLAN_BRANCH=$(grep "^- \*\*Branch\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Branch\*\*: //' | sed 's/ *$//')
PLAN_WORKTREE=$(grep "^- \*\*Worktree\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Worktree\*\*: //' | sed 's/ *$//')
DOC_GLOBS=$(grep "^- \*\*Doc Globs\*\*:" .codevoyant/plans/{plan-name}/plan.md | sed 's/^- \*\*Doc Globs\*\*: //' | sed 's/ *$//')
```

`DOC_GLOBS` is empty for non-doc-aware plans (no `Doc Globs:` line) — executors then run in their normal mode. When non-empty, each executor is spawned with doc-aware enforcement (see `references/doc-aware.md` Rules 3–4). The union is only the doc-aware activation signal; each executor enforces its own phase's write globs (extracted in Step 6).

- **Worktree exists** → set `EXECUTION_DIR=$PLAN_WORKTREE`, report and continue
- **Worktree specified but missing** → if `AUTO_APPROVE`, create it automatically; otherwise use AskUserQuestion (create / execute here anyway / cancel)
- **No worktree** → execute in current directory; if branch mismatch, offer to switch

## Step 3: Validate Implementation Files

Count phases in plan.md (lines matching `^### Phase (\d+)`). Store `HAS_PHASE_0`.

For phases 1 through N, check `.codevoyant/plans/{plan-name}/implementation/phase-{N}.md` exists and is > 100 bytes. Phase 0 has no implementation file — skip it.

If any files missing, report them and exit without launching.

## Step 4: Confirm Background Execution

If `AUTO_APPROVE=true`, skip confirmation and proceed.

Otherwise use **AskUserQuestion**:

```
question: "Start background execution for '{plan-name}'? ({N} phases, {M} tasks)\n\nThe agent will:\n✓ Execute all tasks autonomously\n✓ Update plan.md checkboxes in real-time\n✓ Run tests at phase boundaries\n✓ Pause on errors\n{ALLOW_COMMITS=false: ⚠️ Will NOT commit | ALLOW_COMMITS=true: ✓ Will commit}"
header: "Start execution?"
options:
  - label: "Start execution"
  - label: "Cancel"
```

## Step 5: Initialize Execution Tracking

Create or clear `.codevoyant/plans/{plan-name}/execution-log.md` with initial state (Status: RUNNING, timestamp, plan objective).

```bash
sed -i '' "s/| $PLAN_NAME | [A-Za-z]* |/| $PLAN_NAME | Executing |/" .codevoyant/README.md
```

## Step 6: Launch Background Agent

Determine `EXECUTION_DIR` (worktree path or current directory).

**Phase 0 gate:** If `HAS_PHASE_0=true` and any Phase 0 tasks are unchecked, stop and list them. Do not launch any executor agents.

**Model tiers (relative weight — never provider model IDs):** `light` · `standard` · `heavy`. The platform maps each tier to a concrete model (see `references/model-tiers.md`); with no platform config, the session's current model is used. Executors default to the **light** tier for responsiveness; escalate only on trouble.

**Dependency scan (do this once before the loop):** Read `plan.md` and decide, per phase, whether it depends on an earlier phase's output. A phase depends on another when its implementation file references files created/modified by that earlier phase, or the plan text says so. Phases with **no** such dependency are independent and may run concurrently.

**Orchestration loop** — starting at Phase 1, process phases in dependency order:

1. **Batch independent phases.** Group the next set of phases that have no dependency on any unfinished phase. For each phase, extract its own write globs from the phase's `## Doc Scope` block (per-phase enforcement — the union in plan metadata is only the doc-aware activation signal):

   ```bash
   # N = the phase index; empty result = phase has no Doc Scope / non-doc-aware plan
   PHASE_GLOBS=$(grep -m1 '^\*\*Write globs:\*\*' .codevoyant/plans/{plan-name}/implementation/phase-$N.md 2>/dev/null | grep -oE '\`[^`]+\`' | tr -d '`' | tr '\n' ' ')
   ```

   Spawn one `spec-executor` agent per phase in the batch **in a single message** (parallel), each on the tier declared in `agents/spec-executor.md` frontmatter (`metadata: model-tier: light`), with `EXECUTION_DIR`, `PLAN_BRANCH`, `PLAN_WORKTREE`, `ALLOW_COMMITS`, `SILENT`, `PLAN_NAME`, `SPEC_SKILL` (the spec skill package root — exported by `SKILL.md`, fall back to `$HOME/.claude/skills/spec`), `DOC_GLOBS` (the plan-wide union, empty = normal mode), and `PHASE_GLOBS` (that phase's own write globs) substituted into the prompt. A batch of one is just a single spawn. For a **non-doc-aware plan** (`DOC_GLOBS` empty), spawn every phase in normal mode as before. For a **doc-aware plan** (`DOC_GLOBS` non-empty), a phase whose `## Doc Scope` block is absent or whose `**Write globs:**` list is empty is a **plan defect** — it violates the no-globless-phases rule (`references/doc-aware.md` Rule 3). Do NOT spawn that phase in normal mode: stop the loop and report that the plan must be re-planned (`/spec update` or `/spec new --persistent`) before execution. A phase with a `## Doc Scope` block and a non-empty glob list spawns with doc-aware enforcement as normal.
2. Wait for the batch to finish (`TaskOutput` block=true for each).
3. Write each phase summary to execution-log.md.
4. **Escalation on trouble (code-strength walls only).** If an executor's report ends with an `ESCALATE:` line, re-spawn *that* phase on the next tier — `light` → `standard` → `heavy`. Log each escalation to execution-log.md as `[ESCALATE] Phase {N}: {tier} — {reason}`. Only after a heavy-tier attempt also fails do you treat the phase as failed. Do NOT re-spawn a phase reported `FAILED` for a red CI — a red CI stops execution; escalation is for code-strength walls, not a red CI (see `agent-prompt.md`).
5. If a phase is still failed after escalation to the heavy tier, or a phase was reported `FAILED` for a red CI: stop the loop, send failure notification, report to user.
6. If the batch succeeded: continue to the next dependency-ordered batch.

After the loop completes, unless `SILENT=true`, report completion to the user with a brief summary stating either that plan `{plan-name}` is complete, or that plan `{plan-name}` stopped at Phase `{N}`. If any phase escalated, note which phases escalated and to which tier.

## Step 6.5: Deviation Summary

After all phases complete, scan `{PLAN_DIR}/execution-log.md` for `[DEVIATION]` lines:

```bash
grep "^\[DEVIATION\]" .codevoyant/plans/{plan-name}/execution-log.md 2>/dev/null
```

If any deviations found, include in the final report:

```
Notable deviations from spec:

Phase N: {brief title}
  Spec: {what was prescribed}
  Done: {what was done}
  Reason: {why}

(See implementation/phase-N.md ## Deviations for full detail.)
```

If no deviations: omit this section from the report entirely.

## Step 7: Confirm Launch

```
✓ Background execution started for plan "{plan-name}"!

Monitor progress:
- /spec clean {plan-name} — check status, stop, or wrap up

You will receive a desktop notification when execution completes or fails.
```
