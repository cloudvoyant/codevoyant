# ai-usage.md Template

Write this structure to `{PLAN_DIR}/ai-usage.md` when `/spec new` is run with `--usage`. Substitute all
`{...}` placeholders with computed values. This file is separate from `plan.md` — usage telemetry lives
only here.

---

```markdown
# AI Usage — {plan-name}

## Session

- **Plan**: {plan-name}
- **Branch**: {branch}
- **Agent**: {agent-name} ({agent-version})
- **Session file**: {session-file-path}
- **Session id**: {session-id}
- **Planning window**: {start-iso} → {end-iso} ({duration})
- **Captured by**: {subagent | current-agent (fallback)}

## Token Usage

| Metric                    | Tokens   |
| ------------------------- | -------- |
| Input                     | {n}      |
| Output                    | {n}      |
| Cache read                | {n}      |
| Cache creation            | {n}      |
| **Total (all classes)**   | **{n}**  |

> **Total (all classes)** = input + output + cache read + cache creation — every token class the agent
> processed, summed. It is *not* a cost figure: cache reads are typically cheaper or free versus fresh
> input, so this over-states spend. Read it as "tokens processed", not "tokens billed". Values are what
> the agent's session file reports for assistant turns inside the planning window; this is a usage
> record, not a bill.

## Tool Calls

| Tool     | Count |
| -------- | ----- |
| {name}   | {n}   |
| ...      |       |
| **Total**| **{n}** |

## Notes

{One or two lines of context — e.g. web searches/fetches performed, or any caveats.}
```

---

**Telemetry-unavailable variant** — when no session file could be located or parsed for the current
agent, write this instead of the tables above (keep the `## Session` block with whatever is known):

```markdown
## Token Usage

_Telemetry unavailable — could not locate or parse a session file for agent "{agent-name}". Planning
completed normally; only usage measurement is missing._
```

**Rules:**
- This file is written only when `--usage` was passed. Never create it otherwise.
- Never mix this content into `plan.md`, `user-guide.md`, or implementation files.
- Always write the file when `--usage` is set — even on the unavailable path — so the record exists.
