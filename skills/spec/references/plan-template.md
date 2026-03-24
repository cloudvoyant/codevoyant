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

## Introduction
{What this plan is solving, for whom, and why now. 2–3 sentences.}

## Requirements
{Measurable outcomes, not deliverables. State the success condition the plan must achieve.}
- {outcome bullet 1}
- {outcome bullet 2}

## Design
[High-level solution architecture — major classes/functions/concepts]
[Any changes to project or directory structure]

## Implementation

### Phase 1 - [Phase Name]
1. [ ] Task 1
2. [ ] Task 2

### Phase 2 - [Phase Name]
1. [ ] Task 1
2. [ ] Task 2

## Future Work
- {Deferred scope, known risks, what this plan does not address}

## References
1. [Link Title](url)
```

**Format rules:**
- Phase headers: `### Phase N - Description`
- Unchecked tasks: `1. [ ] Task`
- Checked tasks: `1. [x] Task`
- Task descriptions: concise one-liners
- Add ✅ to phase header only when all tasks in that phase are complete
- Do NOT include detailed implementation specs in plan.md — those go in `implementation/phase-N.md`
- Use `## References` (not `## Resources`) for links and external references
