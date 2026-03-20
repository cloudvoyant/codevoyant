---
description: Create or review a Claude Code skill to ensure it's well-structured and will trigger correctly. Use this whenever someone wants to make a new skill, asks you to review or fix an existing skill, or says a skill isn't working as expected — even if they just say "make a skill for X" without explicitly asking for this skill.
argument-hint: '<skill-name|path>'
---

Skill(s) to review or create: $ARGUMENTS

## Workflow

### Step 1: Resolve the target

Inspect `$ARGUMENTS`:

- **Empty** — ask the user what skill to review or create
- **Single `SKILL.md` path** — review that skill directly
- **Skill directory** (contains `SKILL.md`) — review that skill
- **Plugin or broader directory** — auto-discover all skills:
  ```bash
  find $ARGUMENTS -name "SKILL.md" | sort
  ```
  Show the discovered list and confirm with the user before proceeding.

### Step 2: Review — parallelise across skills

If reviewing more than one skill, spawn one subagent per skill in the same turn using the Agent tool. Each subagent receives:

- The path to the `SKILL.md` and its supporting files
- The checklist from this skill
- Instructions to return: a findings list grouped by severity, and proposed edits

Wait for all subagents to complete, then aggregate results into a single summary:

```
## Review summary

### <skill-name>
- 🔴 Blocking: <issue + why it matters>
- 🟡 Polish: <issue + why it matters>
- ✅ Looks good: <what's already correct>

### <skill-name>
...
```

For a single skill, run the review inline (no need to fork).

### Step 3: Apply fixes

For each skill with issues, propose the specific edits. Apply once approved. If reviewing multiple skills, apply all fixes in parallel.

### Creating a new skill

1. Clarify: what should it do, when should it trigger, what does it output?
2. Choose the right frontmatter fields (see reference below)
3. Write `SKILL.md` — lead with a workflow, not a reference dump
4. Run through the checklist before handing off

---

## Checklist

Run every item. Don't skip — small omissions (missing `argument-hint`, passive description) are the most common reason skills undertrigger or behave unexpectedly.

- [ ] `description` present and **pushy** — includes what it does, when to use it, and trigger keywords; nudges Claude to use it even when not explicitly asked
- [ ] `argument-hint` set if the skill takes any positional args or flags
- [ ] `disable-model-invocation: true` if the skill is stateful or destructive (commits, pushes, file writes in codebase, deploys)
- [ ] `$ARGUMENTS` referenced in the body if the skill takes a positional argument
- [ ] SKILL.md has a **workflow** — a sequence of steps, not just reference tables
- [ ] SKILL.md is under 500 lines; large reference content lives in `references/` with a pointer from the body
- [ ] Directory name matches the intended slash command
- [ ] Registered in `plugin.json` if part of a plugin
- [ ] `hooks` frontmatter added if the skill performs sensitive operations needing pre/post validation

---

## Frontmatter reference

```yaml
---
name: my-skill # overrides directory name (lowercase, hyphens, max 64 chars)
description: What it does and when to use it. Include trigger keywords. Be pushy.
argument-hint: '<required-arg> [optional-arg]'
disable-model-invocation: true # user must invoke manually — never auto-trigger
user-invocable: false # hidden from / menu; Claude-only background knowledge
allowed-tools: Read, Grep, Glob # restrict tools available during this skill
model: claude-opus-4-6 # override model
context: fork # run in isolated subagent
agent: general-purpose # subagent type when context: fork
hooks: # skill-scoped hooks (auto-cleanup when skill ends)
  PreToolUse:
    - matcher: 'Bash'
      hooks:
        - type: command
          command: './scripts/validate.sh'
---
```

### When to use each field

| Field                      | Use when                                        |
| -------------------------- | ----------------------------------------------- |
| `description`              | Always                                          |
| `argument-hint`            | Skill takes positional args or flags            |
| `disable-model-invocation` | Skill is stateful or destructive                |
| `user-invocable: false`    | Background knowledge, not a user-facing command |
| `allowed-tools`            | You want to constrain what Claude can do        |
| `context: fork`            | Long-running, isolated, or parallel work        |
| `hooks`                    | Pre/post validation for sensitive operations    |

---

## Writing a good description

The description is the primary trigger mechanism. It should answer _what_ and _when_, and lean toward over-specifying rather than under:

```yaml
# Passive — undertriggers
description: Monitors CI workflows.

# Pushy — correct
description: Monitor CI/CD workflows (GitHub Actions or GitLab CI). Always use
this after any push to verify checks pass before declaring work done — never
push and move on without checking CI. Supports --autofix to fix failures and
re-push automatically.
```

Rules:

- Include keywords users would naturally say ("commit", "push", "rebase", "compare repos")
- Mention flags that meaningfully change behavior
- Add "even if they don't explicitly say X" for skills that should trigger on implicit intent
- 1–3 sentences — a hint, not documentation

---

## Arguments and substitutions

Use `$ARGUMENTS` to surface the raw argument string inside the skill body:

```markdown
Target skill: $ARGUMENTS
```

Positional access: `$0` (first), `$1` (second), etc.

| Variable               | Value                                |
| ---------------------- | ------------------------------------ |
| `$ARGUMENTS`           | All arguments passed                 |
| `$0`, `$1`, ...        | Individual positional args           |
| `${CLAUDE_SESSION_ID}` | Current session ID                   |
| `${CLAUDE_SKILL_DIR}`  | Absolute path to the skill directory |

---

## Shell injection (`!` commands)

Commands prefixed with `!` run before Claude sees the skill content — output is spliced inline:

```markdown
Branch : !`git rev-parse --abbrev-ref HEAD`
Status : !`git status --short`
```

**Good uses:** injecting git state, reading config at invocation time, passing build output as context.

**Avoid:** long-running or side-effectful commands (run eagerly on every load), and anything that may fail silently.

---

## Directory structure

```
plugin-name/
└── skills/
    └── my-skill/
        ├── SKILL.md               # required
        ├── references/            # supporting docs loaded on demand
        │   └── report-template.md
        └── scripts/               # utility scripts (execute without loading into context)
            └── helper.sh
```

Keep `SKILL.md` under 500 lines. Move large reference material to `references/` and link to it from the body — Claude loads supporting files on demand.

---

## Subagents

Use `context: fork` for skills that are long-running, produce isolated output, or shouldn't pollute the main conversation:

**Use a subagent when:**

- The skill does exploratory or destructive work (cloning repos, running tests)
- The task is long-running and the user should stay unblocked
- The skill has a bounded scope with a single output (a report, a diff, a file)

**Don't use a subagent when:**

- The skill needs back-and-forth with the user mid-execution
- The work is fast — forking adds overhead
- The skill needs to modify main conversation state

---

## Skill-scoped hooks

Hooks defined in frontmatter are active only while the skill runs and clean up automatically — safer than global hooks for focused enforcement:

|          | Skill-scoped                 | Global                |
| -------- | ---------------------------- | --------------------- |
| Lifetime | Active only while skill runs | Entire session        |
| Cleanup  | Automatic                    | Manual                |
| Best for | Workflow-specific guards     | Session-wide policies |

Add `once: true` to a hook to run it only once per session (skill-only feature).
