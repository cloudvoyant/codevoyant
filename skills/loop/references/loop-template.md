# Loop Definition Template

Write this structure to `.codevoyant/loops/{name}/loop.md`. Substitute all `{...}` placeholders.

```markdown
# Loop: {name}

## Task

{The work to repeat each iteration — a skill command (e.g. `/spec go my-plan`), a shell command, or an agent instruction. Runs in a background agent.}

## Objective

{The condition that ends the loop — what must be true for the loop to stop successfully. Phrased as a verifiable outcome, not an activity.}

## Check

{Optional. A shell command that exits 0 when the objective is met (e.g. a test command). When present it is the authoritative signal; the judge agent is skipped. Delete this section if there is no deterministic check.}

## Max Iterations

{N — the hard upper bound. The loop stops after N iterations even if the objective is not met.}
```

**Format rules:**
- `## Task` and `## Objective` are required; `## Check` is optional; `## Max Iterations` is required and must be a positive integer.
- Soft-wrap prose — never hard-wrap.
