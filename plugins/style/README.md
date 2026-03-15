# Style Guide Plugin

Manage and enforce project style guides with contextual loading and automatic learning.

## Overview

The style guide plugin helps teams:
- **Create** CLAUDE.md with project conventions
- **Learn** automatically from your work patterns
- **Enforce** rules via validation
- **Optimize** token usage with contextual loading

### Key Features

🎯 **Contextual Loading** - Only load relevant rules per task (saves ~74% tokens)
🧠 **Automatic Learning** - Observes patterns and suggests rules
✅ **Validation** - Check work against style guide
🔍 **Pattern Extraction** - Discover existing conventions from codebase
⚡ **Token Optimization** - Keep CLAUDE.md lean and efficient

## Installation

This plugin is included in the codevoyant plugin suite:

```bash
/plugin marketplace add codevoyant/codevoyant
```

## Quick Start

### 1. Initialize Style Guide

```bash
/style:init
```

Creates:
- `CLAUDE.md` - Context-tagged style guide (committed to git)
- `.codevoyant/style/` - Learning database (gitignored)
- `docs/style-guide/` - Detailed documentation

### 2. Add Rules

```bash
/style:add "Always use justfile recipes" --context build,tools
```

### 3. Learn from Patterns

```bash
/style:learn
```

Analyzes your work and suggests/applies rules automatically.

### 4. Validate Work

```bash
/style:validate
```

Checks recent changes against style guide.

## Commands

### `/style:init`
Initialize CLAUDE.md with context-tagged style guide.

**Auto-detects:**
- Languages (TypeScript, Python, etc.)
- Build tools (justfile, Makefile, npm)
- Testing frameworks (Jest, Vitest)
- Frameworks (React, Vue)

**Creates:**
- Context-tagged CLAUDE.md
- Learning configuration
- Documentation structure

### `/style:add`
Add new rule with context tags.

```bash
/style:add "rule text" --context tag1,tag2
```

**Examples:**
```bash
/style:add "Use justfile recipes" --context build,tools
/style:add "Prefer const over let" --context code,typescript
/style:add "Conventional commits" --context git,commit
```

### `/style:learn`
Analyze patterns and auto-update style guide.

**What it learns:**
- Tool preferences (justfile vs bash)
- Code patterns (const vs let)
- Commit message formats
- Workflow sequences
- Error corrections

**Confidence levels:**
- High (>0.75): Auto-apply or strongly suggest
- Medium (0.5-0.75): Ask for confirmation
- Low (<0.5): Keep observing

### `/style:validate`
Validate work against style guide.

**Validates:**
- Tool usage (Did you use justfile?)
- Commit messages (Conventional format?)
- Code style (Following patterns?)
- File operations (Edit vs Write?)
- Documentation (Updated docs?)

**Output:**
- Violations (must fix)
- Warnings (should fix)
- Suggestions (nice to have)
- Compliance score

### `/style:extract`
Extract patterns from codebase into rules.

**Analyzes:**
- Code files (style patterns)
- Git history (commit formats)
- Config files (ESLint, Prettier)
- Build tools (justfile, package.json)
- Documentation (JSDoc usage)

**Confidence-based suggestions:**
- High confidence (>80%): Strongly suggest
- Medium confidence (60-80%): Review with user
- Low confidence (<60%): Track but don't suggest

### `/style:optimize`
Optimize CLAUDE.md token usage.

**Strategies:**
- Move details to docs/
- Consolidate redundant rules
- Shorten verbose text
- Remove low-value rules

**Target:** <800 tokens for CLAUDE.md

### `/style:contexts`
Manage rule contexts for smart loading.

**Features:**
- List all contexts
- View context details
- Add new contexts
- Analyze efficiency
- Export context map

## How It Works

### Context-Based Loading

Traditional approach:
```
Every interaction → Load all 1,270 tokens
100 interactions → 127,000 tokens
```

Contextual approach:
```
Editing code → Load code+typescript contexts (520 tokens)
Running builds → Load build+tools contexts (280 tokens)
Making commits → Load git+commit contexts (240 tokens)

100 interactions → ~33,000 tokens (74% savings!)
```

### Context Tags

Rules are tagged with contexts:

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

### Auto-Detection

Contexts auto-load based on:
- File types (*.ts → code, typescript)
- Tool usage (Bash → build, tools)
- Commands (/spec:new → spec, planning)
- Directories (docs/ → docs, documentation)

### Learning System

```
You correct Claude 3× → Pattern detected → Suggest rule → User approves → Added to CLAUDE.md → Claude follows automatically
```

**Pattern tracking:**
```json
{
  "pattern": "use-justfile",
  "observations": 3,
  "confidence": 0.85,
  "status": "ready"
}
```

## File Structure

```
project/
├── CLAUDE.md                      # Main style guide (committed)
├── .codevoyant/style/
│   ├── patterns.json              # Learning data (gitignored)
│   └── compliance.json            # Validation history (gitignored)
├── .codevoyant/
│   └── style.json                 # Settings (committed)
├── docs/
│   └── style-guide/               # Detailed docs (committed)
│       ├── README.md
│       ├── build.md
│       ├── typescript.md
│       ├── git.md
│       └── contexts.md
└── .gitignore
    # Add:
    .codevoyant/style/patterns.json
    .codevoyant/style/compliance.json
    !.codevoyant/style.json
```

## Configuration

### `.codevoyant/style.json`

```json
{
  "version": "1.0.0",
  "contextual": true,
  "autoLearn": true,

  "tokenBudget": {
    "max": 1500,
    "warn": 1000,
    "target": 800
  },

  "learning": {
    "enabled": true,
    "confidenceThreshold": 0.75,
    "minObservations": 3,
    "autoApply": false
  },

  "contexts": {
    "build": {
      "priority": "high",
      "autoDetect": ["justfile", "Makefile", "package.json"],
      "tokenBudget": 200
    },
    "code": {
      "priority": "high",
      "autoDetect": ["*.ts", "*.js", "*.py"],
      "tokenBudget": 300
    },
    "git": {
      "priority": "critical",
      "autoDetect": ["git"],
      "tokenBudget": 150
    }
  },

  "validation": {
    "enabled": true,
    "strictMode": false,
    "autoFix": true
  }
}
```

## Hooks Integration

### Automatic Learning

Add to `justfile`:

```just
# Learn from patterns after session
style-auto-learn:
    @echo "Learning from recent patterns..."
    # Runs in background, updates CLAUDE.md if confident
```

Configure in Claude Code:
```json
{
  "hooks": {
    "on-session-end": "just style-auto-learn"
  }
}
```

### Pre-Commit Validation

```just
# Validate before committing
style-pre-commit:
    @echo "Validating against style guide..."
    # Returns exit code 1 if violations found
```

Git hook:
```bash
#!/bin/bash
# .git/hooks/pre-commit
just style-pre-commit || exit 1
```

## Workflows

### Individual Developer Workflow

```bash
# Day 1: Setup
/style:init
/style:extract
# Review and customize CLAUDE.md
git add CLAUDE.md .codevoyant/style/ .gitignore
git commit -m "feat: add style guide"

# Ongoing: Work normally
# Plugin observes patterns automatically

# Weekly: Review learned patterns
/style:learn
# Approve/reject suggestions

# Before commits
/style:validate
```

### Team Workflow

```bash
# Team lead: Initialize
/style:init
/style:extract
# Customize for team

# Commit to git
git add CLAUDE.md .codevoyant/style.json docs/style-guide/
git commit -m "feat: add team style guide"
git push

# Team members: Pull and it's active
git pull
# CLAUDE.md automatically loaded by Claude Code

# Team: Continuous improvement
# Anyone can /style:add rules
# Review in PRs like any code change
```

## Examples

### Example: Justfile Preference

```bash
# You correct Claude 3 times:
You: "Use just test, not npm test"
Claude: [corrects]

# After 3rd correction:
/style:learn
→ Pattern detected: "Use justfile over npm"
→ Confidence: 0.85
→ Auto-applied to CLAUDE.md

# CLAUDE.md now has:
<!-- @context: build, tools -->
## Build System
Use justfile recipes. Check `just --list` first.

# Next time:
Claude: [automatically uses just test] ✓
```

### Example: Code Style

```bash
# Extract patterns from codebase:
/style:extract

→ Detected: const used 85% over let
→ Detected: Named imports 78% of time
→ Detected: Functions avg 32 lines
→ All added to CLAUDE.md with high confidence

# Validate before commit:
/style:validate

→ Found: 2 instances of let that could be const
→ Warning: 1 function exceeds 50 lines
→ Fix suggested
```

## Best Practices

### Rule Writing
- Keep rules concise (1-2 sentences)
- Focus on "what" and "why", not "how"
- Link to docs for detailed explanations
- Use examples sparingly
- Tag with specific contexts

### Context Design
- Use specific contexts (typescript vs code)
- Aim for <200 tokens per context
- Test auto-detection thoroughly
- Review context overlap
- Keep total contextual load <500 tokens

### Learning
- Start with autoApply: false
- Review suggestions before applying
- Ignore one-off corrections
- Trust patterns with 3+ observations
- Audit learned rules quarterly

### Token Management
- Target: <800 tokens for CLAUDE.md
- Warn at: 1,000 tokens
- Optimize at: 1,200+ tokens
- Move details to docs/
- Use links liberally

## Troubleshooting

### Rules not loading
- Check context tags in CLAUDE.md
- Verify context configuration in config.json
- Ensure contextual loading enabled
- Review auto-detect patterns

### Learning not working
- Check learning.enabled in config
- Increase minObservations if too sensitive
- Review patterns.json for accumulated data
- Ensure you're correcting Claude consistently

### Token count too high
- Run /style:optimize
- Move explanations to docs/
- Consolidate redundant rules
- Remove low-value rules

### Validation false positives
- Adjust validation.strictMode
- Add exceptions to config
- Update skipPatterns
- Report issues

## Contributing

Improvements welcome! See main [codevoyant repository](https://github.com/codevoyant/codevoyant).

## License

MIT - See LICENSE file

---

*Part of the [codevoyant](https://github.com/codevoyant/codevoyant) plugin suite*
