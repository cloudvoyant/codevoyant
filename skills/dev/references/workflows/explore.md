# explore

Explore a technical problem by running research, identifying distinct approaches, and generating parallel proposals. Output lives in `.codevoyant/explore/[name]/` so it can feed into `/spec new` later.

## Guiding Principles

These principles govern every dev explore run. Research agents and proposal writers must both conform.

- **Ecosystem-first** — before proposing any solution, exhaustively survey what libraries, frameworks, and tools already exist. A good existing library beats a custom implementation almost every time. Only recommend from-scratch if no viable option exists or existing options have disqualifying trade-offs.
- **No confabulation** — every library claim, API shape, configuration option, or integration detail must come from reading actual documentation or source code. Do not describe an API you haven't read. If the docs weren't fetched, the claim doesn't belong in the proposal.
- **Sufficient implementation detail** — proposals must show how a solution actually comes together: what files get added or modified, what the integration boundary looks like, what key interfaces are involved. A reader should be able to understand the shape of the implementation without having to re-research everything.
- **Prior art is mandatory** — research must include how similar problems are solved in the existing codebase and in analogous open-source projects. Reinventing what already exists locally or in the ecosystem is a failure mode.
- **Fetch, don't summarize from memory** — researchers must fetch GitHub repos, README files, and documentation pages. A researcher that cites a library without fetching its docs is producing unreliable output.
- **Mermaid for all diagrams** — any system diagram, architecture diagram, data flow, timeline, or process flow in proposals or research must be written as a Mermaid diagram (` ``` `mermaid block). Never use ASCII art for structured diagrams.

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

## Step 1.5: Ask About Proposals

Before launching research, ask:

```
question: "Should I generate proposals after research completes?"
header: "Proposals"
options:
  - label: "Yes — generate all proposals"
    description: "After research, identify 2–4 directions and write a proposal for each"
  - label: "Research only"
    description: "Just run research, I'll decide on proposals separately"
```

Store as `GENERATE_PROPOSALS`. Continue immediately — do not wait further.

## Step 2: Run Research Agents in Parallel

Create the exploration directory structure:

```bash
mkdir -p "$EXPLORE_DIR/research" "$EXPLORE_DIR/proposals"
```

Launch the codebase scan and all external research agents simultaneously. Do not wait for each to finish before launching the next.

**R1 — Codebase scan** (always run):

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

**R2–RN — External research** (break into parallel topic-specific agents):

Based on the topic, identify the distinct research angles that would take the most time if done sequentially (e.g., main library landscape, integration patterns, performance/trade-offs, alternatives, reference implementations). Launch one agent per angle:

```yaml
Agent:
  subagent_type: dev:researcher
  run_in_background: true
  description: 'explore/R2: {angle-name}'
  prompt: |
    mode: external
    topic: {topic} — focus: {angle description}
    stack: {detected stack}
    deep: {DEEP}
    output: {EXPLORE_DIR}/research/{angle-slug}.md
```

Typical split for most topics (adjust to the actual topic):
- **library-landscape.md** — what libraries/frameworks exist, stars, maintenance, licenses
- **integration-patterns.md** — how solutions are integrated in real codebases, config patterns
- **trade-offs.md** — performance, complexity, operational costs, known failure modes
- **reference-implementations.md** — open-source projects that have solved this, what they demonstrate

Use more agents if the topic spans multiple genuinely independent domains. Use fewer if the topic is narrow.

Wait for all research agents to complete before proceeding.

## Step 3: Identify Directions and Generate Proposals

Based on all research artifacts, identify 2–4 genuinely distinct approaches. Each should represent a meaningfully different architectural or technical direction — not minor variations.

If `GENERATE_PROPOSALS=false`: present the directions as a concise list with a one-line description each and stop. Report the research directory location. Skip Steps 4–5.

If `GENERATE_PROPOSALS=true`: for each direction, launch a `proposal-writer` agent simultaneously — do not ask the user which ones to generate:

```yaml
Agent:
  subagent_type: dev:proposal-writer
  run_in_background: true
  description: 'explore/proposal: {direction-name}'
  prompt: |
    topic: {topic}
    approach: {direction-name}
    deep: {DEEP}
    research: (list all files written to {EXPLORE_DIR}/research/)
    template: references/proposal-template.md
    output: {EXPLORE_DIR}/proposals/{approach-slug}.md
```

Wait for all proposal agents to complete.

## Step 4: Write Comparison Summary

Read each generated proposal. Write `$EXPLORE_DIR/summary.md` comparing all proposals:

```markdown
# Exploration: {EXPLORATION_NAME}

## Topic
{topic}

## Proposals

### {Approach A}
- **One-line verdict**: {verdict}
- **Best for**: {use case}
- **Key trade-off**: {strength vs. weakness}

### {Approach B}
…

## Recommendation
**{Recommended approach}** — {2–3 sentence rationale comparing it to the others, citing specific trade-offs from the proposals}

## Next step
Run `/spec new` to create a plan from these findings.
```

Report to the user:

```
Exploration complete: {EXPLORATION_NAME}
  Research: {count} files in {EXPLORE_DIR}/research/
  Proposals: {count} generated in {EXPLORE_DIR}/proposals/
  Summary: {EXPLORE_DIR}/summary.md

Next: run /spec new to create a plan from these findings.
```

### Multi-aspect support

If `ASPECTS_MODE=true`:

- After Step 1, ask the user to list the independent aspects/decisions to explore
- Create a subdirectory per aspect: `$EXPLORE_DIR/proposals/{aspect-slug}/`
- Run Steps 3-4 independently for each aspect
- Each aspect gets its own set of proposals and a summary
