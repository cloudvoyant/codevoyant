# scaffold

Initialise a new codevoyant-compatible skill repository with annotated example skills covering all three patterns.

## Step 0: Parse Arguments

```bash
REPO_NAME="[first non-flag arg — required, e.g. my-skills]"
OUTPUT_DIR="[value of --out <path>, default: ./{REPO_NAME}]"
```

If `REPO_NAME` is missing, error:
```
Error: repo name required. Usage: /skill scaffold <repo-name> [--out <path>]
```

## Step 1: Create Repo Structure

```bash
mkdir -p {OUTPUT_DIR}/.claude/skills
mkdir -p {OUTPUT_DIR}/.claude/skills/simple-example
mkdir -p {OUTPUT_DIR}/.claude/skills/recipe-example/references/recipes
mkdir -p {OUTPUT_DIR}/.claude/skills/workflow-example/references/workflows
```

## Step 2: Copy Annotated Examples

For each example, copy from `references/examples/` into the new repo:

| Source | Destination |
| --- | --- |
| `references/examples/simple-skill/SKILL.md` | `{OUTPUT_DIR}/.claude/skills/simple-example/SKILL.md` |
| `references/examples/recipe-skill/SKILL.md` | `{OUTPUT_DIR}/.claude/skills/recipe-example/SKILL.md` |
| `references/examples/workflow-skill/SKILL.md` | `{OUTPUT_DIR}/.claude/skills/workflow-example/SKILL.md` |
| `references/examples/workflow-skill/references/workflows/example.md` | `{OUTPUT_DIR}/.claude/skills/workflow-example/references/workflows/example.md` |

## Step 3: Write Repo-Level Files

Write `{OUTPUT_DIR}/README.md`:
```markdown
# {REPO_NAME}

A collection of codevoyant-compatible skills.

## Structure

`.claude/skills/{skill-name}/` — one directory per skill.

Each skill is either:
- **Simple** — single SKILL.md with all logic inline
- **Recipe-based** — SKILL.md index + `references/recipes/` files loaded on demand
- **Workflow-based** — SKILL.md dispatcher + `references/workflows/{verb}.md` files

## Installing

```bash
npx skills add {github-org}/{REPO_NAME}
```

## Development

```bash
# Critique a skill before shipping
/skill critique my-skill-name

# Report an issue with a skill
/skill feedback my-skill-name
```
```

Write `{OUTPUT_DIR}/.gitignore`:
```
node_modules/
.DS_Store
```

Write `{OUTPUT_DIR}/package.json`:
```json
{
  "name": "{REPO_NAME}",
  "version": "0.1.0",
  "description": "codevoyant-compatible skills",
  "keywords": ["codevoyant", "claude-code", "skills"],
  "license": "MIT"
}
```

## Step 4: Report

```
✅ Skill repo scaffolded at {OUTPUT_DIR}/

  .claude/skills/
    simple-example/      ← simple single-file skill
    recipe-example/      ← context/recipe skill (like typescript, docker)
    workflow-example/    ← workflow dispatcher skill (like spec, git)

Next steps:
  1. cd {OUTPUT_DIR}
  2. Rename the example skills to your own names
  3. /skill critique <name>   — audit quality before shipping
  4. /skill new <name>        — scaffold a fresh blank skill
```
