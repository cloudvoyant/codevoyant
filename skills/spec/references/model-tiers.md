# Model Tiers

Semantic model tiers keep this skill model-agnostic. A skill never names a concrete provider model (`claude-*`, `gpt-*`, `deepseek-*`) — models are a platform concern, not a skill concern.

## The tiers

- **`light`** — fast and low-cost. For mechanical and validation agents: phase executors, code-completeness gates, permissions analysis, review agents.
- **`standard`** — default reasoning. For most analysis agents: plan updaters, quality judges, freshness checkers.
- **`heavy`** — deepest reasoning. For planning and design agents: planners, architecture authors, scope researchers.

## How a tier is declared

- In an agent file's frontmatter: `metadata: model-tier: light` (never a `model:` field — the Agent Skills base spec has none).
- In workflow text that spawns an ad-hoc agent: a `model-tier: light` token instead of `model: <id>`.

## How a tier resolves to a model

Tiers are relative weights; the platform maps them to concrete models.

- **opencode** — per-agent config in `opencode.json`: `agent.<name>.model` for `standard`/`heavy` and `agent.<name>.small_model` for `light` (or the top-level `model`/`small_model` keys). Unconfigured agents fall back to the session model.
- **Claude Code** — the subagent model the platform operator assigns (this is the field skills used to hardcode); when unset, the agent runs on the session's default model.
- **Portable fallback (zero config)** — if no platform config exists, the agent runs on the currently selected session model. This is what makes DeepSeek/opencode and any other provider work with no setup.

## Rules

- Skills NEVER contain provider model IDs. A hardcoded `claude-*` / `gpt-*` / `deepseek-*` string is a portability bug.
- Tiers are relative to each other (`light` < `standard` < `heavy`), never absolute.
- Escalation moves up tiers (`light` → `standard` → `heavy`), never to a named model.
