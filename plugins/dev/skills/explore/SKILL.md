---
description: "Use when researching technical approaches before building. Triggers on: \"explore options\", \"what are my options for\", \"research approaches\", \"compare solutions\", \"dev explore\", \"generate proposals\", \"help me decide between\". Runs parallel proposal generation via subagents and outputs to .codevoyant/explore/."
argument-hint: "[exploration-name] [--aspects]"
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.

Explore a technical problem by running research, identifying distinct approaches, and generating parallel proposals. Output lives in `.codevoyant/explore/[name]/` so it can feed into `/spec:new` later.

## Step 0: Parse Arguments

Parse from: `$ARGS` (the full argument string passed to this skill).

**Argument Parsing:**
- `EXPLORATION_NAME` from first non-flag argument (slugified: lowercase, hyphens, no spaces)
- Optional: `--aspects` flag for multi-aspect explorations (e.g., "storage layer" AND "API design")
- If no name provided, derive from topic after Step 1

**Store parsed values:** `EXPLORATION_NAME`, `ASPECTS_MODE=false`.

If `--aspects` flag present: set `ASPECTS_MODE=true`.

## Step 1: Understand the Topic

Ask: "What technical problem or decision do you want to explore?"

Clarify:
- Scope and constraints
- Existing stack and conventions
- What success looks like
- Any approaches already considered or ruled out

If `EXPLORATION_NAME` is not set, derive it from the topic:
- Convert to lowercase, replace spaces with hyphens, remove special characters
- Truncate to 50 characters max
- Example: "How should we handle auth?" -> "auth-handling"

Set `EXPLORE_DIR=".codevoyant/explore/$EXPLORATION_NAME"`.

## Step 2: Run Research Agents in Parallel

Create the exploration directory structure:

```bash
mkdir -p "$EXPLORE_DIR/research" "$EXPLORE_DIR/proposals"
```

Launch three research agents simultaneously via the Task tool (`run_in_background: true`), then collect all results before proceeding:

**Agent R1 -- Codebase scan** (`model: claude-haiku-4-5-20251001`)
- Glob/Grep the repo for files, patterns, and existing abstractions relevant to the topic
- Identify files/systems that will be affected
- Map the existing architecture and note conventions (naming, structure, patterns in use)
- Save findings to `$EXPLORE_DIR/research/codebase-analysis.md`

**Agent R2 -- External research** (`model: claude-sonnet-4-6`)
- Research existing libraries and solutions for the detected stack
- Research architectural and design patterns applicable to the topic
- Keep track of URLs for all resources
- Save findings to `$EXPLORE_DIR/research/library-research.md`

**Agent R3 -- Skills lookup** (`model: claude-haiku-4-5-20251001`)
- Check [agentskill.sh](https://agentskill.sh/) for published skills relevant to the tech stack or topic
- Check local `.claude/skills/` for installed skills that apply
- Save a brief list to `$EXPLORE_DIR/research/available-skills.md`

Wait for all three agents to complete, then synthesize their findings.

## Step 3: Identify Directions

Based on research, identify 2-4 genuinely distinct approaches. Each should represent a meaningfully different architectural or technical direction -- not minor variations.

Present the directions as inline text with a brief description of each. Then ask open-ended: "Which of these directions do you want me to explore in detail? You can pick all of them, a subset, or describe a different direction."

Wait for user response before proceeding.

## Step 4: Generate Proposals in Parallel

For each direction the user selected, launch a spec-explorer Task simultaneously (`run_in_background: true`):

**Proposal agent prompt** (`model: claude-sonnet-4-6`):
```
You are exploring the "{direction-name}" approach for: {topic}.

Research context:
{contents of $EXPLORE_DIR/research/codebase-analysis.md}
{contents of $EXPLORE_DIR/research/library-research.md}

Write a proposal to: $EXPLORE_DIR/proposals/{approach-slug}.md

Use this structure:

# {Approach Name}

> {One-sentence verdict: what this approach is best suited for}

## Summary
{2-4 sentences describing the approach and how it fits the existing codebase.}

## Architecture
{Prose. Describe modules, layers, or components and how they relate. Reference
existing code/directories where concrete. 5-10 sentences max.}

## Directory Structure
{Show the key directories/files this approach would create or modify.}

## API Surface
{Key interfaces, components, routes, hooks, or data shapes -- signatures/shapes
only, no implementations. 10-20 lines.}

## Technical Decisions
{For each major concern, explain the decision and rationale. 1-3 sentences each.}

## Flow Diagram
{Use mermaid or ASCII to show the primary flow.}

## Implications
- **DX**: {developer experience}
- **Performance**: {latency, bundle size, query cost}
- **Security**: {surface area changes}
- **Future work**: {what this opens up or forecloses}

## Trade-offs
{2-3 sentences honestly naming the downsides of this approach.}

## References
- {Links to relevant docs, libraries, prior art}
```

Wait for all proposal agents to complete.

### Multi-aspect support

If `ASPECTS_MODE=true`:
- After Step 1, ask the user to list the independent aspects/decisions to explore
- Create a subdirectory per aspect: `$EXPLORE_DIR/proposals/{aspect-slug}/`
- Run Steps 3-4 independently for each aspect
- Each aspect gets its own set of 2-4 proposals

## Step 5: Present and Choose

Read each generated proposal file. For each, present:
- The approach name
- The one-sentence verdict
- Key trade-offs

Use **AskUserQuestion**:
```
question: "Which direction do you want to go with?"
header: "Exploration Results"
multiSelect: false
options:
  - label: "{Approach A name}"
    description: "{verdict}"
  - label: "{Approach B name}"
    description: "{verdict}"
  - label: "Synthesize"
    description: "Combine the best elements from multiple proposals"
  - label: "Keep exploring"
    description: "Refine or add more proposals"
```

Based on response:
- **Specific approach**: Mark as chosen, proceed to Step 6
- **Synthesize**: Launch a spec-explorer Task to create `$EXPLORE_DIR/proposals/synthesis.md` that combines the best elements. Then proceed to Step 6 with synthesis as the chosen direction.
- **Keep exploring**: Ask what to refine or add, then return to Step 3 or Step 4 as appropriate

## Step 6: Save Summary

Write `$EXPLORE_DIR/summary.md` with:

```markdown
# Exploration: {EXPLORATION_NAME}

## Chosen Direction
{Name of chosen approach, or "undecided" if user didn't pick}

## Key Findings
- {Finding 1 from research}
- {Finding 2 from research}
- {Finding 3 from research}

## Proposals
- [{Approach A}](proposals/{approach-a}.md)
- [{Approach B}](proposals/{approach-b}.md)
{if synthesis exists:}
- [Synthesis](proposals/synthesis.md)

## Research
- [Codebase Analysis](research/codebase-analysis.md)
- [Library Research](research/library-research.md)
- [Available Skills](research/available-skills.md)

## Recommended Next Step
{e.g., "Run `/spec:new {plan-name}` with the {chosen approach} proposal as context"
or "Further exploration needed on {topic}"}
```

Report to the user:
```
Exploration complete: {EXPLORATION_NAME}
  Direction: {chosen or "undecided"}
  Proposals: {count} generated
  Summary: $EXPLORE_DIR/summary.md

Next: run /spec:new to create a plan from these findings.
```
