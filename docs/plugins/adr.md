# ADR Plugin

Architecture Decision Records — capture important decisions directly from your coding sessions.

The ADR plugin helps teams document architectural decisions as they're made, keeping a structured record of what was decided, why, and what alternatives were considered.

## Installation

**Claude Code:**
```bash
/plugin marketplace add codevoyant/codevoyant
/plugin install adr
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Best Practices

- Create ADRs **as decisions are made**, not after the fact
- Use `/adr:capture` when a decision emerges naturally in conversation
- Keep ADRs short — they record the decision, not the full deliberation
- Supersede old ADRs rather than editing them when you change direction

## ADR Format

Generated ADRs follow the standard [Markdown ADR](https://adr.github.io/) format:

```markdown
# 001. Use PostgreSQL for Primary Storage

Date: 2024-01-15
Status: Accepted

## Context

We need a reliable relational database...

## Decision

We will use PostgreSQL...

## Consequences

- Positive: ACID compliance, mature ecosystem
- Negative: Requires running a PostgreSQL instance
```

ADRs are saved to `docs/decisions/` numbered sequentially (e.g., `001-use-postgresql.md`).

## Skills

### Create an ADR

Create a new Architecture Decision Record interactively:

```bash
/adr:new
```

Claude will guide you through:
1. **Title** — short description of the decision
2. **Status** — Proposed, Accepted, Deprecated, or Superseded
3. **Context** — what situation prompted this decision
4. **Decision** — what was decided
5. **Consequences** — the trade-offs and results

### Capture from Conversation

Extract an architectural decision that emerged during a coding session:

```bash
/adr:capture
```

Claude reviews the current conversation, identifies the decision that was made, and formats it as a proper ADR — without you having to re-explain it.

Useful when you've been discussing an architectural choice and want to document it without starting from scratch.
