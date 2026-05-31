## Project Overview

Codevoyant is a CLI toolkit that ships AI-powered skills (slash commands) for engineering and product workflows, built on top of Claude Code.

## Key Directories

- `skills/` — publishable skill packages; one directory per skill, each with a `SKILL.md`
- `docs/` — VitePress public docs site
- `docs/engineering/plans/` — committed engineering plans (promoted via `em:approve`)
- `docs/product/roadmaps/` — committed product roadmaps (promoted via `pm:approve`)
- `.codevoyant/plans/` — draft plans (working source of truth, not committed)
- `.codevoyant/explore/` — research artifacts from `pm:explore` and `em:plan`

## Key Conventions

- `em` and `pm` skills do NOT create Linear issues — only `dev-plan` creates issues
- `em:approve` creates milestones in Linear projects
- Research artifacts go to `.codevoyant/explore/{slug}/` (not `.codevoyant/research/`)
- Plan templates are in `skills/em-plan/references/plan-template.md`
