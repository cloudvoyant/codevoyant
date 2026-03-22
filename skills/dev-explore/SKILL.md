---
description: 'Use when researching technical approaches before building. Triggers on: "explore options", "what are my options for", "research approaches", "compare solutions", "dev explore", "generate proposals", "help me decide between". Runs parallel proposal generation via subagents and outputs to .codevoyant/explore/.'
name: dev:explore
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline. Core functionality preserved on all platforms.'
argument-hint: '[exploration-name] [--deep] [--aspects]'
context: fork
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially. The `context: fork` and `agent:` frontmatter fields are Claude Code-specific — on OpenCode and VS Code Copilot they are ignored and the skill runs inline using the current model.

Explore a technical problem by running research, identifying distinct approaches, and generating parallel proposals. Output lives in `.codevoyant/explore/[name]/` so it can feed into `/spec:new` later.

## Guiding Principles

These principles govern every dev:explore run. Research agents and proposal writers must both conform.

- **Ecosystem-first** — before proposing any solution, exhaustively survey what libraries, frameworks, and tools already exist. A good existing library beats a custom implementation almost every time. Only recommend from-scratch if no viable option exists or existing options have disqualifying trade-offs.
- **No confabulation** — every library claim, API shape, configuration option, or integration detail must come from reading actual documentation or source code. Do not describe an API you haven't read. If the docs weren't fetched, the claim doesn't belong in the proposal.
- **Sufficient implementation detail** — proposals must show how a solution actually comes together: what files get added or modified, what the integration boundary looks like, what key interfaces are involved. A reader should be able to understand the shape of the implementation without having to re-research everything.
- **Prior art is mandatory** — research must include how similar problems are solved in the existing codebase and in analogous open-source projects. Reinventing what already exists locally or in the ecosystem is a failure mode.
- **Fetch, don't summarize from memory** — researchers must fetch GitHub repos, README files, and documentation pages. A researcher that cites a library without fetching its docs is producing unreliable output.
- **Skills lookup is part of research** — check https://skills.sh/ and local `.claude/skills/` before proposing any tooling or workflow. An existing skill may already solve part of the problem.
- **Mermaid for all diagrams** — any system diagram, architecture diagram, data flow, timeline, or process flow in proposals or research must be written as a Mermaid diagram (` ``` `mermaid block). Never use ASCII art for structured diagrams.

## Step 0: Parse Arguments

Parse from: `$ARGS` (the full argument string passed to this skill).

**Argument Parsing:**

- `EXPLORATION_NAME` from first non-flag argument (slugified: lowercase, hyphens, no spaces)
- Optional: `--aspects` flag for multi-aspect explorations (e.g., "storage layer" AND "API design")
- Optional: `--deep`: Escalates all research agents — more repos fetched, more documentation pages read, stricter citation requirements. Use for high-stakes architecture decisions.
- If no name provided, derive from topic after Step 1

**Store parsed values:** `EXPLORATION_NAME`, `ASPECTS_MODE=false`, `DEEP=false`.

If `--aspects` flag present: set `ASPECTS_MODE=true`.

```bash
DEEP=false
[[ "$*" =~ --deep ]] && DEEP=true
```

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

Launch all three simultaneously, wait for all to complete, then synthesize:

```yaml
Agent:
  subagent_type: dev:researcher
  run_in_background: true
  description: 'explore/R1: codebase scan'
  prompt: |
    mode: codebase
    topic: {topic}
    output: {EXPLORE_DIR}/research/codebase-analysis.md
```

```yaml
Agent:
  subagent_type: dev:researcher
  run_in_background: true
  description: 'explore/R2: external research'
  prompt: |
    mode: external
    topic: {topic}
    stack: {detected stack}
    deep: {DEEP}
    output: {EXPLORE_DIR}/research/library-research.md
```

```yaml
Agent:
  subagent_type: general-purpose
  model: claude-haiku-4-5-20251001
  run_in_background: true
  description: 'explore/R3: skills lookup'
  prompt: |
    Find skills relevant to: {topic} (stack: {detected stack})
    deep: {DEEP}
    - Check https://skills.sh/ for published skills
    - Check local .claude/skills/ for installed skills that apply
    - Search npm/pip/brew/cargo for relevant packages in the detected stack
    Save a brief list to {EXPLORE_DIR}/research/available-skills.md
```

## Step 3: Identify Directions

Based on research, identify 2-4 genuinely distinct approaches. Each should represent a meaningfully different architectural or technical direction -- not minor variations.

Present the directions as inline text with a brief description of each. Then ask open-ended: "Which of these directions do you want me to explore in detail? You can pick all of them, a subset, or describe a different direction."

Wait for user response before proceeding.

## Step 4: Generate Proposals in Parallel

For each selected direction, launch a `proposal-writer` Agent simultaneously:

```yaml
Agent:
  subagent_type: dev:proposal-writer
  run_in_background: true
  description: 'explore/proposal: {direction-name}'
  prompt: |
    topic: {topic}
    approach: {direction-name}
    deep: {DEEP}
    research:
      - {EXPLORE_DIR}/research/codebase-analysis.md
      - {EXPLORE_DIR}/research/library-research.md
    template: references/proposal-template.md
    output: {EXPLORE_DIR}/proposals/{approach-slug}.md
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

Write `$EXPLORE_DIR/summary.md` using `references/summary-template.md` (in this skill's directory). Add synthesis link if one was generated.

Report to the user:

```
Exploration complete: {EXPLORATION_NAME}
  Direction: {chosen or "undecided"}
  Proposals: {count} generated
  Summary: $EXPLORE_DIR/summary.md

Next: run /spec:new to create a plan from these findings.
```
