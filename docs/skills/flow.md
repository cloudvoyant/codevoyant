---
title: flow
---

# flow

End-to-end pipeline orchestration — chain multiple skill workflows into a named, sequential flow that runs step-by-step without manual handoffs.

## Workflows

### new — define a flow

Create a named pipeline with an ordered list of skill invocations; generates `flow.md` and per-step implementation files under `.codevoyant/flows/{name}/`. Add `--global` to store it under `~/.codevoyant/flows/` instead, making it reusable across every project.

```bash
/flow new auth-refactor \
  "/dev explore how the auth middleware works" \
  "/spec new refactor auth middleware" \
  "/spec go"

# reusable across projects, with a run-time parameter:
/flow new ship \
  "/spec new {{input}}" \
  "/spec go" \
  "/git commit" \
  "/pr open" \
  --global
```

Pass descriptions inline to skip interactive prompts within each step (e.g. `/spec new my-feature add dark mode`).

#### Parameters — dynamic input

Put `{{placeholders}}` in any step and supply values when you run the flow:

- Bare text after the name binds to `{{input}}` — `/flow go ship "add dark mode"`.
- `--set key=value` binds a named `{{key}}` — `/flow go ship --set env=staging`.
- Anything still unset is prompted for once.

Each step's key outputs (PR numbers, plan names, file paths) are captured and threaded forward as **flow context**, so later steps can use them automatically — e.g. `/pr open` produces a PR number that a later `/pr address` step picks up without you re-typing it. Flow context is persisted, so an interrupted flow resumes with it intact.

**Chaining interactive skills.** Steps run as subagents and can't prompt you directly, so write each step to run non-interactively — pass its input inline or as a `{{param}}` (give steps that need different values distinct params, not one shared `{{input}}`), and wire a consumer step to the artifact its producer wrote (e.g. `/dev explore` → `.codevoyant/explore/{slug}/` → `/spec new` plans from it). If a step still hits a decision it can't resolve, it escalates one question back to you (`NEEDS_INPUT`) and re-runs with your answer — a fallback, not the plan.

### go — execute a flow

Run all pending steps sequentially as blocking subagents. Resumes from the first incomplete step if re-run after interruption. Resolves the flow locally first, then globally; pass `--global` to force the global copy.

The flow's own directory is a read-only **definition** (its steps and per-step implementations). A run never mutates it: the run's checkbox progress and accumulating context are materialized into a local **run instance** at `.codevoyant/runs/<slug>/` (`progress.md` + `context.md`). This keeps a global flow a pristine, reusable template — running it from any project writes progress only to that project's run instance, so concurrent or cross-project runs never clobber each other. Resume reads the local run instance; `/flow status` shows its progress.

```bash
/flow go auth-refactor             # execute all pending steps
/flow go ship "add OAuth login"    # bind free text to {{input}}
/flow go ship --set env=staging    # bind a named parameter
```

A failing step stops the pipeline; re-run `/flow go` to resume from where it stopped.

### list — list flows

Show every saved flow across both scopes (local and global) with step counts, status, and parameters.

```bash
/flow list                         # local + global
/flow list --global                # global only
```

### status — check flow status

Print the `flow.md` checklist with current step status, scope, and parameters.

```bash
/flow status auth-refactor         # print checklist with step status
/flow status ship --global         # inspect a global flow
```

### doctor — diagnose and repair flows

Check flows for corruption and, with `--fix`, repair what is safe to repair. Diagnose-only by default. With no name, it scans every flow in both scopes.

```bash
/flow doctor                       # diagnose all flows (local + global), change nothing
/flow doctor autospec              # diagnose one flow
/flow doctor autospec --fix        # apply safe repairs
/flow doctor autospec --fix --global   # target the global copy
```

Checks (reported PASS/WARN/FAIL per flow): cross-run **clobber** (a `context.md` referencing an unrelated run's branch/slug/worktree), **stale** context (present although Status is Complete), **orphaned** worktree/branch (referenced but gone), **step-file drift** (step lines ≠ `step-N.md` files), **schema drift** (missing template sections), and **placeholder coherence** (undeclared or unused `{{tokens}}`).

Repairs (`--fix`, each announced before it runs): remove a clobbered or stale `context.md` — but **never** a legitimately-interrupted one that matches the flow's own steps (that is the resume payload); reset Status `Active → Complete` when all steps are done; regenerate missing `step-N.md` stubs; conservatively migrate an old-schema `flow.md` to the current template; and prune references to deleted worktrees from `context.md`.

### save — create a composite skill

Turn a completed flow into a reusable skill scaffolded via `/skill new`. The generated skill, when invoked, spins up a fresh flow instance from the saved steps and runs it end-to-end.

```bash
/flow save auth-refactor --skill auth-refactor
/flow save auth-refactor --skill auth-refactor --desc "Explore, plan, and execute auth middleware refactor"
/flow save ship --skill ship --global    # source flow lives in ~/.codevoyant/flows
```

The new skill is created at `skills/{skill-name}/SKILL.md`. If the source flow has `{{parameters}}`, the generated skill forwards the text you pass it to `/flow go`. Run `/skill critique {skill-name}` to audit it before shipping.

### help — list commands

```bash
/flow help                         # show usage reference
```
