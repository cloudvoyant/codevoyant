---
title: flow
---

# flow

End-to-end pipeline orchestration — chain multiple skill workflows into a named, sequential flow that runs step-by-step without manual handoffs.

## Workflows

### new — define a flow

Create a named pipeline with an ordered list of skill invocations; generates `flow.md` and per-step implementation files under `.codevoyant/flows/{name}/`.

```bash
/flow new auth-refactor \
  "/dev explore how the auth middleware works" \
  "/spec new refactor auth middleware" \
  "/spec go"
```

Pass descriptions inline to skip interactive prompts within each step (e.g. `/spec new my-feature add dark mode`).

### go — execute a flow

Run all pending steps sequentially as blocking subagents. Resumes from the first incomplete step if re-run after interruption.

```bash
/flow go auth-refactor             # execute all pending steps
```

A failing step stops the pipeline; re-run `/flow go` to resume from where it stopped.

### status — check flow status

Print the `flow.md` checklist with current step status.

```bash
/flow status auth-refactor         # print checklist with step status
```

### save — create a composite skill

Turn a completed flow into a reusable skill scaffolded via `/skill new`. The generated skill, when invoked, spins up a fresh flow instance from the saved steps and runs it end-to-end.

```bash
/flow save auth-refactor --skill auth-refactor
/flow save auth-refactor --skill auth-refactor --desc "Explore, plan, and execute auth middleware refactor"
```

The new skill is created at `skills/{skill-name}/SKILL.md`. Run `/skill critique {skill-name}` to audit it before shipping.

### help — list commands

```bash
/flow help                         # show usage reference
```
