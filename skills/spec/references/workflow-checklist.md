# Workflow Checklist — Injection Guide

Every agent spawned by the `spec` skill must receive a workflow checklist at the top of its prompt. The checklist is printed, tracked, and updated in real-time as the agent works.

## Purpose

The checklist provides:
- A shared mental model between the orchestrator and the agent
- A progress signal the user or orchestrator can read at any time
- A forcing function that prevents agents from skipping steps

## Format

```markdown
## {Workflow Name} Checklist — {PLAN_NAME}

- [ ] 0. Acknowledge checklist and confirm identity
- [ ] 1. {Step 1 description}
- [ ] 2. {Step 2 description}
...
- [ ] N. {Final step — always includes output/report}
```

## Rules

- Numbered from 0, always starts with "Acknowledge checklist"
- Each item maps 1:1 to a top-level step in the workflow
- Agent marks `[ ]` → `[x]` immediately after completing each step
- Agent prints the updated checklist after every step (not just at the start)
- Final item is always the output/report step

## Example: Phase Executor

```markdown
## Phase Execution Checklist — Phase 2: OAuth Integration

- [x] 0. Acknowledge checklist and confirm phase/plan identity
- [x] 1. Apply any pending annotations in plan files
- [x] 2. Validate implementation/phase-2.md exists and is non-empty
- [x] 3. Read full phase-2.md implementation spec
- [ ] 4. Execute each task in order — implement, then mark [x] in plan.md immediately
- [ ] 5. After each task: update registry progress via npx @codevoyant/agent-kit
- [ ] 6. Run hygiene after every task: format → lint → typecheck → tests
- [ ] 7. Run full test suite at phase boundary
- [ ] 8. Mark phase header ✅ in plan.md
- [ ] 9. Update registry status
- [ ] 10. Write phase summary to execution-log.md
```

## Checklist Lengths by Agent

- **spec-executor**: 10 items (steps 0–10)
- **spec-updater**: 10 items (steps 0–10)
- **spec-planner**: 12 items (steps 0–12)

Keep checklists concise — if a step expands, move the detail to the step body, not the checklist item.
