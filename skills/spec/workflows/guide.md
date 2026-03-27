# guide

Walk through a plan phase by phase, task by task, providing tutorial-style guidance. After each task you decide: proceed, skip, or improvise. Improvising triggers background agents to keep the rest of the plan in sync.

## Variables

- `PLAN_NAME` — plan to guide through (may be empty; will prompt if multiple plans exist)
- `PHASE_NUM` — optional; start at a specific phase number (`--phase N`)
- `TASK_NUM` — optional; start at a specific task number within a phase (`--task N`)

## Step 1: Select Plan

If `PLAN_NAME` not provided:

```bash
npx @codevoyant/agent-kit plans migrate
npx @codevoyant/agent-kit plans list --status Active
```

Sort by Last Updated (most recent first). Auto-select if only one active plan exists; use **AskUserQuestion** if multiple exist. If none, inform user to run `/spec new`.

## Step 2: Load and Orient

Read `.codevoyant/plans/{plan-name}/plan.md` in full.

Parse:
- All phases (`### Phase N - Name`)
- All tasks per phase (`N. [ ] task` and `N. [x] task`)
- Task runner commands from the Metadata section
- Any `## Insights` section from previous sessions

Determine starting position:
- If `--phase` and/or `--task` flags set, start there
- Otherwise, find the **first unchecked task** in the earliest incomplete phase

Print a brief orientation:

```
📋 {plan-name}
   {total-phases} phases · {completed}/{total} tasks done ({pct}%)

Starting at Phase {N} — {phase-name}, Task {M}: "{task description}"

Type your answers below after each task. Use the options to move forward, skip, or tell me what you did differently.
```

## Step 3: Guide Loop

For each task at the current position, execute this loop:

### 3.1: Present Task Guidance

Read `implementation/phase-{N}.md` and extract the section relevant to the current task (look for the task description as a heading or anchor).

Present tutorial-style guidance:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase {N} — {phase-name}   Task {M}/{phase-total}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{task description from plan.md}

{Explanation: what this task accomplishes and why it matters in context}

{Concrete how-to from implementation file: commands, files to edit, code to write, expected outcome}

{Optional: what to watch out for, common mistakes, validation to run when done}
```

Keep guidance concrete and actionable. Reference exact file paths, commands, and expected outputs. Do not invent steps not in the implementation file.

### 3.2: Await User Action

Use **AskUserQuestion**:

```
question: "Phase {N}, Task {M}: {task description}"
header: "What next?"
options:
  - label: "Done — next step"
    description: "Mark this task complete and continue"
  - label: "Skip"
    description: "Skip this task or the rest of this phase"
  - label: "Improvise"
    description: "I did something different — update the plan to match"
  - label: "Chat"
    description: "Ask a question or discuss before deciding"
```

---

### If "Done — next step":

1. Mark task `[x]` in plan.md
2. Update registry:
   ```bash
   npx @codevoyant/agent-kit plans update-progress \
     --name "$PLAN_NAME" \
     --completed $COMPLETED \
     --total $TOTAL
   ```
3. Continue to next task (Step 3.1 for next task)

---

### If "Chat":

Wait for the user's free-text question or comment. Answer it thoroughly using context from `plan.md` and the current `implementation/phase-{N}.md`. After responding, loop back to Step 3.2 (same task, same options) so the user can then decide what to do.

---

### If "Skip":

Use **AskUserQuestion**:

```
question: "How much do you want to skip?"
header: "Skip"
options:
  - label: "Skip this task only"
    description: "Move to the next task in Phase {N}"
  - label: "Skip rest of Phase {N}"
    description: "Jump to Phase {N+1}"
```

**Skip this task only**: mark the task with a `[-]` strikethrough comment in plan.md (change `[ ]` to `[~]` as a skipped marker), advance to the next task. Update registry progress (count skipped as "seen"). Report: `⏭ Skipped task {M}. Moving to task {M+1}.`

**Skip rest of Phase {N}**: mark all remaining unchecked tasks in the phase as `[~]` in plan.md. Update registry progress. Report: `⏭ Skipped remaining tasks in Phase {N}. Jumping to Phase {N+1}.` Then trigger Phase Completion (Step 3.4) for the current phase before advancing.

---

### If "Improvise":

Use **AskUserQuestion**:

```
question: "Describe what you did differently from the plan."
header: "Improvise"
options:
  - label: "I'll describe it below"
    description: "Type what you actually did or decided"
```

Wait for the user's free-text description. Store as `IMPROV_DESCRIPTION`.

**3.2a: Update current phase implementation file**

Edit `implementation/phase-{N}.md`: revise the section for this task to reflect what the user actually did (`IMPROV_DESCRIPTION`). Keep the intent clear for the execution agent if it resumes later. Mark clearly that this task was completed via improvisation.

**3.2b: Update plan.md**

- Mark the current task `[x]` in plan.md
- Append a brief note in parentheses: `(improvised: {one-line summary})`
- Update registry progress

**3.2c: Annotate remaining implementation files for background update**

Add a `> update this phase given improvisation: {IMPROV_DESCRIPTION}` annotation at the top of each remaining phase implementation file (`phase-{N+1}.md` through `phase-{last}.md`).

**3.2d: Launch background agents** (in one message, both in parallel)

1. **spec-updater** — apply annotations across the remaining implementation files:

   ```
   Agent:
     subagent_type: general-purpose
     run_in_background: true
     description: "guide: propagate improvisation to phases {N+1}–{last}"
     prompt: |
       You are spec-updater for plan {PLAN_NAME}.
       Read agents/spec-updater.md and follow its checklist.
       PLAN_NAME={PLAN_NAME}
       CHANGE_DESCRIPTION=User improvised task {M} of Phase {N}: {IMPROV_DESCRIPTION}
       Apply the > annotations at the top of each remaining implementation file and remove them.
       Validate for consistency after all edits.
   ```

2. **Validation agent** — check that the updated plan is still coherent:

   ```
   Agent:
     subagent_type: general-purpose
     run_in_background: true
     description: "guide: validate plan after improvisation"
     prompt: |
       Read references/validation-loop.md and run one validation pass on plan {PLAN_NAME}.
       Focus only on phases {N+1} onward. Report any NEEDS_IMPROVEMENT items as inline
       > annotations in the affected implementation files so spec-updater can fix them.
       Do not fix them yourself.
   ```

Report immediately after launch:

```
✓ Plan updated for Phase {N}, Task {M}.
⚙ Background agents propagating changes to remaining phases — this won't block you.

Continuing with Phase {N}, Task {M+1}...
```

Then continue the guide loop with the next task.

---

### 3.4: Phase Completion

When all tasks in a phase are either done `[x]` or skipped, run the phase boundary:

1. Run tests if task runner commands are available:
   ```bash
   {test command from plan metadata}
   ```
   If tests fail, report the failure and use **AskUserQuestion** (Fix before continuing / Continue anyway).

2. If all tasks were done (none skipped), mark the phase header `✅` in plan.md.

3. If any tasks were skipped, mark with `⚠️` instead.

4. Print phase summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Phase {N} — {phase-name} complete
   {done}/{total} tasks done · {skipped} skipped
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then continue to Phase {N+1}, Task 1 (Step 3.1).

## Step 4: Plan Complete

When all phases are done or skipped:

```bash
npx @codevoyant/agent-kit plans update-status --name "$PLAN_NAME" --status Complete
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 {plan-name} — guided walkthrough complete
   {done}/{total} tasks completed · {skipped} skipped
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run /spec clean to archive this plan and wrap up your session.
```
