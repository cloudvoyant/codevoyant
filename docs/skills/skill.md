# Skill

Tools for exploring, creating, updating, and reviewing agent skills.

The Skill toolkit gives you a structured workflow for building your own Claude Code / Agent Skills compatible skills: research what already exists before building, scaffold a new skill from a template, iterate on it, and run quality reviews before shipping.

## Installation

**Claude Code:**

```bash
npx skills add cloudvoyant/codevoyant
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Typical Workflow

```
skill:explore → skill:new → skill:update → skill:review
(research)       (create)    (refine)       (quality gate)
```

### Build a New Skill from Scratch

```bash
/skill explore "linear integration"   # Research existing skills first
/skill new linear-push                # Scaffold from template
/skill update linear-push             # Refine any dimensions
/skill review linear-push             # Audit spec compliance + conventions
```

### Improve an Existing Skill

```bash
/skill update dev-commit              # Choose dimensions to improve
/skill review dev-commit --effectiveness  # Full effectiveness audit
```

## Skills

### Explore Existing Skills

Research available skills before building something new:

```bash
/skill explore                            # Interactive topic prompt
/skill explore "linear integration"       # Explore a specific topic
/skill explore "ci monitoring" --thorough # Deeper scan with more sources
```

Runs parallel research agents against `npx skills find`, agentskill.sh, and published skill repos. For each result, shows:

- Source URL and install command
- SKILL.md excerpt (frontmatter + first 50 lines)
- Absorb assessment — whether you can extend rather than build from scratch

Output lands in `.codevoyant/explore/{slug}/` and can be passed directly to `/skill new` via `--research`.

**Flags:**

- `--thorough` — deeper scan, more sources, higher haiku agent count

### Create a Skill

Scaffold a new skill from the canonical template:

```bash
/skill new                                 # Interactive naming
/skill new linear-push                     # Named skill
/skill new linear-push --research .codevoyant/explore/linear/explore.md
```

Guides you through:

1. Loading research context (from `--research` or `.codevoyant/explore/`)
2. Confirming the high-level skill overview
3. Designing the step-by-step workflow
4. Selecting destination directory (`skills/` for public, `.claude/skills/` for private)
5. Writing `SKILL.md`, `LICENSE.md`, and any `references/` files
6. Running `mise run skills:validate` to confirm it passes

Output is committed to `skills/{skill-name}/` (public) or `.claude/skills/{skill-name}/` (private).

**Flags:**

- `--research <path>` — seed the session with an existing explore artifact

### Update a Skill

Improve an in-progress skill plan or an existing committed skill:

```bash
/skill update                         # Auto-detect active skill plan
/skill update dev-commit              # Target specific skill or plan
/skill update dev-commit > add --dry-run flag   # Minor annotation
/skill update dev-commit >> restructure agent steps  # Major annotation
```

Two modes:

- **In-progress plan** — apply `>` (minor) or `>>` (major) inline annotations to the active plan.md
- **Existing skill** — choose which dimensions to improve: prompt quality, performance, agent additions, or skill dependencies

Changes are always planned and confirmed before being written. Runs `mise run skills:validate` after applying.

**Annotation syntax:**

- `> note` — minor clarification on a step; applies inline without structural change
- `>> note` — significant change (scope, step removal/addition); requires confirmation

### Review a Skill

Audit a skill for spec compliance, claudevoyant conventions, and effectiveness:

```bash
/skill review                             # Review most recently updated skill
/skill review dev-commit                  # Review specific skill by name
/skill review path/to/SKILL.md            # Review by path
/skill review skills/                     # Review all skills in a directory
/skill review dev-commit --effectiveness  # Include effectiveness dimensions
```

Checks:

**Spec compliance (Step 2):**

- Frontmatter completeness: `name`, `description`, `license`, `compatibility`
- Portability tier accuracy (Tier 1 / 2 / 2b / 3 based on features used)
- Claudevoyant conventions: pushy description, argument-hint, disable-model-invocation, Step 0 argument parsing, no markdown tables, references/ for large content, `> **Compatibility**:` note

**Effectiveness review (Step 3, optional — pass `--effectiveness` to run automatically):**

Rates five dimensions as Strong / Adequate / Weak:

- Objective Clarity — purpose is unambiguous from the description alone
- Instruction Quality — steps are a concrete recipe with verifiable completion conditions
- Template / Artifact Quality — output templates follow no-tables rule and produce useful artifacts
- Trigger Accuracy — description trigger keywords match intended invocation patterns
- Actionability — a first-time user can run the skill without reading external docs

Produces a review report at `.codevoyant/review/{skill-name}.md`. Auto-fixes mechanical issues (missing test commands, blank sections) and flags judgment calls one at a time.

**Flags:**

- `--effectiveness` — include the effectiveness review pass automatically

### List All Commands

```bash
/skill help                 # Not yet implemented — see this page
```
