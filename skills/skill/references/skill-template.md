# Canonical SKILL.md Template

Reference for `skill:new`. Every new skill must follow this structure.

---

## 1. Frontmatter (required)

```yaml
---
description: 'One sentence. What does it do? What triggers it? List trigger phrases.'
name: namespace:verb
license: MIT
compatibility: 'Designed for Claude Code. On OpenCode and VS Code Copilot, AskUserQuestion falls back to numbered list; context: fork runs inline.'
argument-hint: '[arg1] [--flag value]' # optional — omit if no args
disable-model-invocation: true # optional — set true to suppress auto-invoke
context: fork # optional — fork | inline | background
---
```

**Required fields:** `description`, `name`, `license`, `compatibility`

**Optional fields:**

- `argument-hint` — shown in UI; describe positional args and flags
- `disable-model-invocation` — prevents Claude from auto-running the skill on trigger
- `context` — execution context; `fork` spawns a subshell, `inline` runs in current context
- `hooks` — list of lifecycle hooks (e.g. `pre-run`, `post-run`)

**Naming convention:** `namespace:verb` — e.g. `skill:new`, `dev:commit`, `spec:go`

---

## 2. Compatibility note block (required for Tier 2+)

Immediately after frontmatter, before any sections:

```markdown
> **Compatibility**: AskUserQuestion falls back to numbered list on non-Claude-Code platforms.
```

Omit only for purely bash skills with no interactive prompts.

---

## 3. Skill Requirements section (required if deps exist)

```markdown
## Skill Requirements

\`\`\`bash
# Check each dependency
command -v npx >/dev/null 2>&1 || echo "MISSING: npx"
command -v mise >/dev/null 2>&1 || echo "NOTE: mise not available — validation step will be skipped"
\`\`\`
```

List only real runtime tool dependencies. Omit section if skill has no external deps.

---

## 4. Critical Rules section (required)

```markdown
## Critical Rules

- Rule 1 (most important constraint first)
- Rule 2
- ...
- Rule N (≤8 bullets total)
- See `references/` for detailed guidance
```

**Rules:** terse, imperative, ≤8 items. Move detail to `references/` docs.

---

## 5. Step 0: Bash argument parsing (always first step)

```markdown
## Step 0: Parse arguments

\`\`\`bash
ARG_ONE="[first non-flag argument, or empty]"
FLAG_A=false; FLAG_B=false; FLAG_C=false
[["$*" =~ --flag-a|-a]] && FLAG_A=true
[["$*" =~ --flag-b|-b]] && FLAG_B=true
[["$*" =~ --flag-c]] && FLAG_C=true
\`\`\`
```

Always Step 0. Always bash. For boolean flags use `[[ "$*" =~ ]] &&` — one line per flag, all initialized together. For value-carrying flags (`--output <path>`), use a `while/case` loop instead.

---

## 6. Step N patterns

### User question (AskUserQuestion)

```markdown
AskUserQuestion:
question: "Your question here?"
header: "Section label"
options: - Option A - Option B
multiSelect: false # optional; default false
```

Use `multiSelect: true` only when multiple selections are valid simultaneously.

### File write

```markdown
Write `{path}` with content derived from {source}.
```

Or for templated content:

```markdown
\`\`\`bash
npx @codevoyant/agent-kit scaffold write \
 --template {template-name} \
 --output {destination-path}
\`\`\`
```

### Bash command step

```markdown
## Step N: {Action title}

\`\`\`bash
npx @codevoyant/agent-kit {subcommand} --flag value
\`\`\`

{One sentence describing what to do with the output.}
```

### Agent spawning

```markdown
## Step N: Spawn agents

Spawn the following agents in parallel (see `agents/` for full definitions):

- **{agent-name}** (see `agents/{agent-name}.md`) — {what it does}
- **{agent-name-2}** (see `agents/{agent-name-2}.md`) — {what it does}

Wait for all agents to complete before continuing.
```

Ensure agents do not use AskUserQuestion or any interactive tools. Questions should be asked prior to agent spawning.

---

## 7. Agent files (required when skill spawns agents)

Each agent gets its own file: `agents/{agent-name}.md`. Use the format in `references/agent-template.md`.

```markdown
## Agent Index

- **{agent-name}** (`agents/{agent-name}.md`) — {one sentence summary}
- **{agent-name-2}** (`agents/{agent-name-2}.md`) — {one sentence summary}
```

List agent files in the SKILL.md step that spawns them.

---

## 8. Formatting rules

- No markdown tables in skill output — use definition lists, bullets, or Mermaid diagrams
- Steps are numbered sequentially from 0
- Each step has a single clear action title
- Code blocks specify language (`bash`, `markdown`, `yaml`, etc.)
- Keep the SKILL.md under 200 lines; move detail to `references/`

---

## 9. File layout

```
skills/{namespace}-{verb}/
  SKILL.md              # required
  LICENSE.md            # required (MIT)
  references/           # required if technology-specific or complex
    skill-template.md   # (this file, for skill:new)
    {tech}-reference-index.md
  agents/
    {agent-name}.md     # one file per agent (required if skill spawns subagents)
  scripts/              # optional helper scripts
```
