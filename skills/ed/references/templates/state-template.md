---
course: "<course-slug>"
pipeline: autodidact
started:              # ISO timestamp
book_dir: "book"
---

# <Course Title> — Pipeline State

Autodidact ledger. Each stage records status, gate score, and timestamp. Statuses: `pending` · `running` · `done` · `warn` (gate failed after auto-fix, continued best-effort) · `blocked`.

## Stages

| Stage | Target | Status | Gate score | Threshold | Updated |
|-------|--------|--------|-----------|-----------|---------|
| brief | brief.md | pending | — | complete | — |
| explore | explore/sources.md | pending | — | — | — |
| plan-syllabus | syllabus.md | pending | — | ≥85 | — |
| plan-module 01 | modules/01-…/plan.md | pending | — | ≥80 | — |
| create-lesson 01/01 | docs/01-…/01-….mdx | pending | — | checklist | — |
| create-lesson 01/02 | docs/01-…/02-….mdx | pending | — | checklist | — |
| create-quiz 01 | docs/01-…/quiz.mdx | pending | — | checklist | — |
| create-project 01 | docs/01-…/project.mdx | pending | — | checklist | — |
| plan-module 02 | modules/02-…/plan.md | pending | — | ≥80 | — |
| … | … | pending | — | … | — |

<!-- Add one row per module for plan-module, per lesson for create-lesson, and per module for create-quiz / create-project. -->

## Decisions / Warnings log

<!-- Append newest-last. Record every gate warn, auto-fix, assumption, and STOP here. -->

- `<timestamp>` `<stage>` — <decision, warning, gate-fail reason, or assumption made under --yes>.
