# Task Template -- em:plan

Use this structure for each task in `tasks/design.md`, `tasks/develop.md`, `tasks/deploy.md`.

---

## {Task Title}

**Milestone:** design | develop | deploy
**Size:** XS (<1d) | S (1-3d) | M (3-7d) | L (1-2w)
**Depends on:** (none | {task title})

**Requirements:**
- {what must be true / what must exist for this task to be complete}

**Acceptance Criteria:**
- {verifiable condition 1}
- {verifiable condition 2}

**Design/SA:** {high-level decision if known} | `[deferred -- resolve in design milestone]`

---

Notes for breakdown agent:
- Never nest sub-tasks
- "Design/SA" = software architecture or UX design decision. If decided: one sentence. If deferred: say so.
- Requirements are not implementation steps. Say WHAT, not HOW.
- Acceptance criteria must be verifiable by a human in < 5 minutes
