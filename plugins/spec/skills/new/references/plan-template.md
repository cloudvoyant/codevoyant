# plan.md Template

Write this structure to `.codevoyant/plans/{plan-name}/plan.md` when creating a new plan. Substitute all `{...}` placeholders with actual values.

```markdown
# [Plan Title]

## Metadata
- **Branch**: {METADATA_BRANCH}
- **Base Branch**: {METADATA_BASE_BRANCH}
- **Worktree**: {METADATA_WORKTREE}
- **Task Runners**: {METADATA_TASK_RUNNERS}
- **Created**: {CREATED_TIMESTAMP}

## Objective
[2-4 bullet points summarizing goals]

## Design
[High-level solution architecture — major classes/functions/concepts]
[Any changes to project or directory structure]

## Plan

### Phase 1 - [Phase Name]
1. [ ] Task 1
2. [ ] Task 2

### Phase 2 - [Phase Name]
1. [ ] Task 1
2. [ ] Task 2

## Resources
1. [Link Title](url)
```

**Format rules:**
- Phase headers: `### Phase N - Description`
- Unchecked tasks: `1. [ ] Task`
- Checked tasks: `1. [x] Task`
- Task descriptions: concise one-liners
- Add ✅ to phase header only when all tasks in that phase are complete
- Do NOT include detailed implementation specs in plan.md — those go in `implementation/phase-N.md`
