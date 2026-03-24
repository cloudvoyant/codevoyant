# Agent File Template

Reference format for individual agent files in `agents/`. Each agent that a skill spawns gets its own file: `agents/{agent-name}.md`.

---

## Format

```markdown
# {agent-name}

**Model:** claude-haiku-4-5-20251001
**Background:** true | false
**Purpose:** {one sentence: what it does and what artifact it produces}

## Prompt

{Full prompt passed to the agent. Must be self-contained — no references to outer context variables without substituting them first. Must not use AskUserQuestion or any interactive tools.}

## Output

Saves to: `{path/to/output/file.md}`
```

---

## Fields

- **model** — full model ID (e.g. `claude-haiku-4-5-20251001`, `claude-sonnet-4-5-20251001`, `claude-opus-4-6`)
- **background** — `true` if the agent runs without blocking the main flow; `false` if the skill waits for it
- **purpose** — one sentence: what the agent does, what artifact it saves
- **prompt** — complete, self-contained prompt; all variables must be substituted before passing
- **output** — file path(s) the agent writes

---

## Rules

- One file per agent — do not combine multiple agents into one file
- File name is kebab-case and matches the agent's logical role (e.g. `research-agent.md`, `draft-agent.md`)
- Prompt must be self-contained — the agent has no access to outer variables
- Agents must not call AskUserQuestion; gather all user input before spawning
- List each agent file in the SKILL.md step that spawns it

---

## Example: `agents/research-agent.md`

```markdown
# research-agent

**Model:** claude-haiku-4-5-20251001
**Background:** true
**Purpose:** Searches npm, GitHub, and official docs for prior art; saves findings to `.codevoyant/explore/{skill-slug}/research.md`.

## Prompt

Search for existing agent skills related to "{SKILL_NAME}".

1. Run `npx skills find "{SKILL_NAME}"` and capture results
2. WebFetch the top 3 result URLs and extract frontmatter + first 30 lines of each SKILL.md
3. Note model choices, step patterns, and references layout

Save a markdown summary to `.codevoyant/explore/{SKILL_SLUG}/research.md` with sections:
- Skills found (name, install command, source URL)
- Patterns worth absorbing
- Gaps the new skill should fill

## Output

Saves to: `.codevoyant/explore/{SKILL_SLUG}/research.md`
```
