## Project Overview

Codevoyant is a CLI toolkit that ships AI-powered skills (slash commands) for engineering and product workflows, built on top of Claude Code.

## Key Directories

- `skills/` — publishable skill packages; one directory per skill, each with a `SKILL.md`
- `docs/` — VitePress public docs site
- `docs/engineering/plans/` — committed engineering plans (promoted via `plan:approve`)
- `docs/product/roadmaps/` — committed product roadmaps (promoted via `pm:approve`)
- `.codevoyant/plans/` — draft plans (working source of truth, not committed)
- `.codevoyant/explore/` — research artifacts from `pm:explore` and `plan`

## Key Conventions

- `pm` does NOT create Linear issues; the `plan` skill (formerly `em`) creates Linear issues for task/architecture-level plans and Linear milestones for project/initiative plans
- `plan:approve` creates milestones in Linear projects
- Research artifacts go to `.codevoyant/explore/{slug}/` (not `.codevoyant/research/`)
- Plan templates are in `skills/plan/references/plan-template.md` and `skills/plan/references/task-template.md`
