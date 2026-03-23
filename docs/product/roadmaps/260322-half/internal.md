## Findings: Internal Prior Art

### Existing Assets
- `.codevoyant/research/coding-agent-ecosystem.md` — Previous research artifact on coding agent ecosystem (stale, from earlier pm-explore run — should be disregarded per user instruction)
- `.codevoyant/research/coding-agent-ecosystem/` — Sub-directory from prior stale research run
- `package.json` — Monorepo root, pnpm-based, version 0.0.0, with packages `agent-kit` and `claude-skill-converter`
- `docs/` — VitePress documentation site

### Relevant Plans and PRDs
- `portable-agent-skills` (Complete) — Aligned all skills with Agent Skills open standard for portability across Claude Code, OpenCode, Copilot, and Codex
- `skills-restructure` (Executing) — Restructure to flat skills/ dir, colon-scoped names, decommission Claude Code plugin system
- `skill-quality-improvements` (Active) — Raise quality floor of em/pm/ux skills with research rigor and template restructuring
- `new-plugins-and-shared-utils` (Complete) — Core shared infrastructure plugin + pm, em, ux, swe plugins
- `plans-registry-refactor` (Complete) — pnpm monorepo with @codevoyant/agent-kit, unified codevoyant.json config
- `linear-native-em-pm-dev-plugins` (Complete) — Linear-native local-first planning, dev:plan architecture skill

### Relevant Skills
- **dev-explore** — Research technical approaches before building, generates proposals via subagents
- **dev-plan** — Architecture planning for projects/features
- **dev-diff** — Compare repos for structural differences
- **spec-new/spec-go** — Structured multi-phase implementation plans with task checklists
- **em-plan** — Engineering project planning with Linear integration
- **pm-plan/pm-prd** — Product roadmap and PRD generation
- **pm-explore** — This skill itself, research before planning
- **ux-explore** — Quick wireframe/prototype generation
- **skill-create/skill-review** — Skill authoring and compliance checking
- **mem-**** — Team knowledge management (learn, recall, list, find, index, init)

### Strategic Context
- Codevoyant is currently a **skill/plugin collection** for AI coding agents (primarily Claude Code), distributed as an npm package
- The `portable-agent-skills` plan explicitly targets cross-agent compatibility (Claude Code, OpenCode, Copilot, Codex)
- The architecture follows a plugin model with shared utilities via `@codevoyant/agent-kit`
- Current focus is on skill quality, portability standards, and restructuring — foundational work before expanding scope
- No existing PRDs, roadmaps, or research artifacts for AstralCloud, Readership, Journey, or OnlyHuman within this repo
- No existing cloud provider or infrastructure plans in this repo

### Sources Consulted
- Internal files read: `package.json`, `.codevoyant/codevoyant.json`, `.codevoyant/mem.json`
- Directories scanned: `.codevoyant/research/`, `.codevoyant/plans/`, `skills/`, `packages/`, `docs/`

### Gaps
- No existing research on cloud provider platforms or AstralCloud concept
- No PRDs for Readership, Journey, or OnlyHuman products
- No staged development strategy or phasing document exists
- No competitive analysis of Codevoyant vs OpenCode/Aider/etc. exists internally
- No architecture docs for multi-agent orchestration beyond current skill-based subagent spawning

**Confidence:** High
