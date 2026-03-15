<img src="/codevoyant/icons/style.svg" width="64" height="64" style="margin-bottom: 1rem" />

# Style Plugin

Manage and enforce project style guides with contextual loading and automatic learning.

The style plugin helps teams create, maintain, and enforce a `CLAUDE.md` style guide — with smart contextual loading that saves ~74% of tokens compared to loading all rules every interaction.

## Installation

**Claude Code:**
```bash
/plugin marketplace add codevoyant/codevoyant
/plugin install style
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Key Features

- Contextual loading: only loads rules relevant to the current task (~74% fewer tokens)
- Critical Rules block: 3–5 top-priority rules pinned at the top of `CLAUDE.md`, always loaded
- Automatic learning: observes patterns and suggests new rules over time
- Validation: checks your work against the style guide
- Token optimization: keeps `CLAUDE.md` lean

## How Contextual Loading Works

Instead of loading your entire style guide every interaction:

```
Traditional: Every interaction → 1,270 tokens → 100 interactions = 127,000 tokens

Contextual:
  Editing code    → code+typescript contexts (520 tokens)
  Running builds  → build+tools contexts (280 tokens)
  Making commits  → git+commit contexts (240 tokens)

  100 interactions → ~33,000 tokens (74% savings)
```

Rules in `CLAUDE.md` are tagged with context markers:

```markdown
<!-- @context: build, tools -->
## Build System
Use justfile recipes

<!-- @context: code, typescript -->
## TypeScript Style
Prefer const over let

<!-- @context: git, commit -->
## Git Commits
Use conventional format
```

Contexts auto-activate based on file types, tools used, directories accessed, and slash commands invoked.

## File Structure

```
project/
├── CLAUDE.md                  # Main style guide — Critical Rules block at top, context sections below
├── .codevoyant/style/
│   ├── config.json            # Settings (committed)
│   ├── patterns.json          # Learning data (gitignored)
│   └── compliance.json        # Validation history (gitignored)
└── docs/style-guide/          # Detailed rule docs (committed)
    ├── README.md
    ├── build.md
    ├── typescript.md
    └── git.md
```

## Skills

### Initialize Style Guide

```bash
/style:init
```

Auto-detects your project's tech stack and creates:
- `CLAUDE.md` — context-tagged style guide with a **Critical Rules block** prepended at the top (committed to git)
- `.codevoyant/style/` — learning database (gitignored)
- `docs/style-guide/` — detailed documentation

The Critical Rules block lives at the very top of `CLAUDE.md` and contains the 3–5 highest-priority rules as terse imperatives, plus a reminder to agents to load the relevant context sections below for the current task. Every AI tool reads the top of `CLAUDE.md` on load — no tool-specific setup required.

### Add a Rule

```bash
/style:add "rule text" --context tag1,tag2
```

Examples:
```bash
/style:add "Use justfile recipes" --context build,tools
/style:add "Prefer const over let" --context code,typescript
/style:add "Conventional commits" --context git,commit
```

### Auto-Learn from Patterns

```bash
/style:learn
```

Analyzes your work history and suggests rules based on observed patterns. When you correct Claude 3+ times on the same thing, a rule is auto-suggested.

Confidence levels:
- High (>0.75): Auto-apply or strongly suggest
- Medium (0.5–0.75): Ask for confirmation
- Low (<0.5): Keep observing

### Review Code Style

```bash
/style:review
```

Checks recent work against your style guide and outputs:
- Violations (must fix)
- Warnings (should fix)
- Suggestions (nice to have)
- Compliance score

### Doctor — Fix and Optimize

```bash
/style:doctor
```

Two-phase command: first **diagnoses and repairs** structural issues (missing Critical Rules block, untagged sections, deprecated patterns from older versions), then **optimizes for brevity** — moves details to `docs/`, consolidates redundant rules, removes low-value entries, and keeps `CLAUDE.md` under the 800 token target. Safe to run on any existing CLAUDE.md, including ones created before the Critical Rules block was introduced.

### Manage Contexts

```bash
/style:contexts
```

List, view, and manage context tags. Contexts control which rules are loaded for which tasks.
