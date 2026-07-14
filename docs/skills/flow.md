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

The flow's own directory is a read-only **definition** (its steps and per-step implementations). A run never mutates it: the run's identity, checkbox progress, and accumulating context are materialized into a local **run instance** at `.codevoyant/flows/{flow-slug}-{plan-name}/` (`run.md` + `progress.md` + `context.md`), one instance per run keyed by the spec-plan slug that run resolves. Run instances live **flat under `.codevoyant/flows/`**, the same directory that holds flow **definitions** (`.codevoyant/flows/{flow-slug}/`) — so instances and definitions are **siblings**, told apart by content (a definition holds `flow.md`; an instance holds `progress.md` + a `run.md` whose `slug:` is the flow's own slug), never by name. Spec plans live at `.codevoyant/plans/{name}/` and a flow's runs live at `.codevoyant/flows/{flow-slug}-{name}/`, so a spec plan and a flow run may share the same `{name}` without colliding. Because the plan slug does not exist until the first `/spec new` step runs, the instance **bootstraps under a provisional `{flow-slug}-_pending-{timestamp}/` directory** (namespaced by flow slug so it never collides with another flow's provisional) and is **adopted** to `{flow-slug}-{plan-name}/` on the first step that hands off a `slug=` (an atomic `mkdir` claim renames it; if that plan slug is already owned by another run, the provisional dir is kept as-is rather than clobbered). `run.md` records the resolved identity of the run (flow slug, definition, and the branch/spec-slug/worktree it produces) — the concrete anchor `/flow doctor` uses both to tell a live interrupted run apart from a clobbered one and to confirm a discovered instance belongs to this flow, since the definition itself only holds `{{placeholders}}`. This keeps a global flow a pristine, reusable template — running it from any project writes progress only to that project's run instance. **Per-plan namespacing is what prevents collisions:** two concurrent runs of the same flow that resolve different plan slugs land in separate `{flow-slug}-{plan-name}/` directories and never share `progress.md`/`context.md`/`run.md`; runs still pre-adoption stay isolated under their unique `{flow-slug}-_pending-{timestamp}/`. **Discovery disambiguates on content, not the name glob:** because one flow slug can be a hyphen-prefix of another (e.g. `auto` vs `auto-review`), `/flow status` and `/flow doctor` treat as a candidate instance only a `{flow-slug}-*` dir that holds a `progress.md` (excludes definitions) and whose `run.md` records `slug: {flow-slug}` (excludes a prefix-colliding neighbour's instances). Resume reads the local run instance; `/flow status` shows the most recent one's progress. (Legacy instances written directly under the original `.codevoyant/runs/{flow-slug}/` run-state root, before this layout, are still discovered and reported — there is no automatic migration.)

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

Checks (reported PASS/WARN/FAIL per flow): cross-run **clobber** (a `context.md` naming a branch/spec-slug/worktree that differs from this run's recorded identity in `run.md`), **stale** context (present although Status is Complete), **orphaned** worktree/branch (referenced but gone), **step-file drift** (step lines ≠ `step-N.md` files), **schema drift** (missing template sections), and **placeholder coherence** (undeclared or unused `{{tokens}}`). Doctor also inspects a legacy `context.md` sitting beside the definition (pre-run-instance layout), independently of any run-instance context.

Repairs (`--fix`, each announced before it runs): remove a `context.md` **only** on a positive clobber signal (its identifiers differ from `run.md`'s) or when Status is Complete — a context that matches the run's identity, or one whose identity can't be determined, is **preserved** (it may be the resume payload); reset Status `Active → Complete` when all steps are done; regenerate missing `step-N.md` stubs; conservatively migrate an old-schema `flow.md` to the current template; and prune references to deleted worktrees from `context.md`. Deleting a file under `~/.codevoyant/flows` (global scope) is announced explicitly before it happens.

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
