---
description: Initialize a context-tagged CLAUDE.md style guide for a project. Use when the user wants to set up, create, or bootstrap a new style guide.
disable-model-invocation: true
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


Initialize a context-tagged CLAUDE.md style guide for your project.

## Overview

Creates a CLAUDE.md file at your repository root with intelligent context tagging for contextual rule loading. The file is committed to git and shared with your entire team.

## Step 1: Check Existing CLAUDE.md

Check if `CLAUDE.md` already exists in repo root:

```bash
[ -f CLAUDE.md ] && echo "exists" || echo "not found"
```

If exists, use **AskUserQuestion** tool:
```
question: "CLAUDE.md already exists. What would you like to do?"
header: "Style Guide Exists"
multiSelect: false
options:
  - label: "Merge with existing"
    description: "Add context tags and style features to existing file"
  - label: "Backup and replace"
    description: "Save current as CLAUDE.md.backup and create new tagged version"
  - label: "Cancel"
    description: "Keep existing file, don't modify"
```

## Step 2: Detect Project Context

Analyze the project to pre-populate relevant rules. Use Glob and Grep tools — not raw bash `find`/`grep`:

Check for:
- **Languages**: `tsconfig.json` (TypeScript), `package.json` (JS), `pyproject.toml`/`requirements.txt` (Python), `go.mod` (Go), `Cargo.toml` (Rust)
- **Build tools**: `justfile`/`Justfile`, `Makefile`, `taskfile.yml`, `mise.toml`
- **Frameworks**: scan `package.json` dependencies for react, vue, next, etc.
- **Testing**: scan `package.json` for jest, vitest, mocha; look for `pytest.ini`, `go test`, etc.

**LSP and linting configuration** — scan for:
- `tsconfig.json` / `tsconfig.strict.json` — TypeScript LSP config
- `.eslintrc.*` / `eslint.config.*` — ESLint rules
- `.prettierrc.*` — Prettier formatting
- `pyrightconfig.json` / `.pyright/` — Pyright (Python LSP)
- `mypy.ini` / `pyproject.toml [mypy]` — MyPy
- `rust-analyzer` config in `.vscode/` or `Cargo.toml`
- `.golangci.yml` — Go linting
- `.editorconfig` — cross-editor baseline

Store detected LSP/lint tools as `LSP_TOOLS` — these will be referenced in the generated CLAUDE.md style guide.

**Community skills** — check [agentskill.sh](https://agentskill.sh/) for skills relevant to the detected stack (e.g., a TypeScript review skill, a Go linting skill). Note any found as recommendations in the generated CLAUDE.md under a "Recommended Skills" comment.

Report detected technologies:
```
Detected project technologies:
✓ TypeScript
✓ justfile (build system)
✓ Claude Code plugins
✓ Jest testing

I'll create a style guide with relevant sections.
```

## Step 3: Create Initial CLAUDE.md

Create `CLAUDE.md` with context-tagged sections based on detected technologies:

```markdown
# {Project Name} Style Guide

<!-- This file is automatically loaded by Claude Code -->
<!-- Context tags enable smart, contextual rule loading -->
<!-- Format: <!-- @context: tag1, tag2 --> before each section -->

## How to Use This Guide

This style guide uses context tags for efficient loading:
- Rules are only loaded when relevant to your current task
- Add rules with: /style:add "rule description" --context build,code
- Learn automatically: /style:learn
- Validate work: /style:validate

---

{if HAS_JUSTFILE}
<!-- @context: build, tools, shell -->
## Build System

**CRITICAL:** This project uses justfile for all build commands.

**Before running any npm/bash/make command:**
1. Check if a recipe exists: `just --list`
2. Use the justfile recipe if available
3. Only use direct commands if no recipe exists

**Common recipes:**
- `just test` - Run test suite
- `just build` - Build project
- `just dev` - Start development server

**Why:** Justfile ensures consistent commands across team and CI/CD.
{endif}

{if HAS_TYPESCRIPT}
<!-- @context: code, typescript, javascript -->
## TypeScript Style

**Type Safety:**
- Use strict mode (tsconfig.json)
- Prefer `const` over `let`, never use `var`
- Explicit types for function parameters and returns
- Use `unknown` over `any` when type is truly unknown

**Imports:**
- Use named imports over default imports when possible
- Group imports: external → internal → relative
- Remove unused imports before committing

**Code Organization:**
- One exported class/function per file (exceptions for utilities)
- Prefer pure functions over classes when possible
- Keep functions under 50 lines (extract helpers if needed)
{endif}

<!-- @context: git, commit, vcs -->
## Git Commit Messages

**Format:** Use Conventional Commits
```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance (deps, config)
- `docs:` - Documentation only
- `refactor:` - Code restructuring
- `test:` - Test changes

**Rules:**
- Subject line max 72 characters
- Use imperative mood ("add feature" not "added feature")
- No period at end of subject
- Reference issues in footer: `Closes #123`

**AI Contributions:**
Always add: `Co-Authored-By: Claude <noreply@anthropic.com>`

{if HAS_CLAUDE_CODE}
<!-- @context: claude-code, plugins -->
## Claude Code Plugins

**Plugin Development:**
- Store plugins in `plugins/{plugin-name}/`
- Use `plugin.json` for metadata
- Command files in `commands/*.md` with clear steps
- Use AskUserQuestion tool for all user prompts (not [Y/n] or numbered lists)

**Testing:**
- Test all commands before committing
- Document examples in plugin README
- Include error handling in command flows
{endif}

<!-- @context: code, edit, tools -->
## File Operations

**Tool Preferences:**
- **Read** files before editing them (required)
- **Edit** tool for modifications (not Write)
- **Write** tool only for new files
- **Grep** for searching content (not bash grep)
- **Glob** for finding files (not bash find)

**Why:** Dedicated tools are faster and more reliable than bash commands.

{if HAS_JEST || HAS_VITEST}
<!-- @context: test, code -->
## Testing

**Coverage Requirements:**
- All new features must have tests
- Aim for >80% coverage on new code
- Test edge cases and error conditions

**Test Organization:**
- Co-locate tests with source: `feature.ts` → `feature.test.ts`
- Use descriptive test names: `it('should handle empty array gracefully')`
- Group related tests with `describe` blocks

**Running Tests:**
- `just test` - Run all tests
- `just test:watch` - Watch mode
- `just test:coverage` - Coverage report
{endif}

<!-- @context: docs, documentation -->
## Documentation

**Code Comments:**
- Document "why" not "what" (code shows what)
- Use JSDoc/TSDoc for public APIs
- Update docs when changing behavior

**README Files:**
- Every plugin/module needs a README
- Include: purpose, usage, examples, API reference
- Keep examples up-to-date with code

---

## Context Tags Reference

Available contexts for this project:
- `build` - Build system and tooling
- `code` - General code style
- `typescript`, `javascript` - Language-specific rules
- `git`, `commit` - Version control
- `test` - Testing practices
- `docs` - Documentation
- `tools` - Tool preferences
- `claude-code` - Claude Code plugin development

Learn more: /style:contexts

---

*Last updated: {timestamp}*
*Managed by: /style plugin*
```

## Step 3.5: Prepend Critical Rules Block to CLAUDE.md

Insert a `## Critical Rules` block at the **very top** of the CLAUDE.md file just created — before any context-tagged sections. This block is the always-present, cross-agent anchor: every AI tool reads the top of CLAUDE.md on load, so these rules land in context first and survive compaction.

The block format:

```markdown
<!-- CRITICAL RULES — always apply these; load relevant sections below for your current task -->
## Critical Rules

- {highest-priority rule — terse imperative, e.g. "Use `just <recipe>` for all build/test/run commands"}
- {second rule}
- {third rule}
- {fourth rule, if needed}
- {fifth rule, if needed — keep to 3–5 max}

> **For agents:** This file has additional context-specific rules in tagged sections below.
> Before starting any task, load the section(s) relevant to what you're doing (e.g. `## Build`, `## Git`, `## TypeScript`).
<!-- END CRITICAL RULES -->
```

**Implementation:** Scan the newly created CLAUDE.md sections. Pick the 3–5 rules that apply most broadly across contexts (`build`, `git`, `code`). Write them as terse imperatives. Prepend this block to the file — it must come before the first `<!-- @context: ... -->` tag. Keep it under 15 lines total.

## Step 4: Create Support Directory

Create `.codevoyant/style/` directory for pattern tracking:

```bash
mkdir -p .style
```

Create `.codevoyant/style.json`:
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
    "build": { "priority": "high", "autoDetect": ["justfile", "Makefile", "package.json"] },
    "code": { "priority": "high", "autoDetect": ["*.ts", "*.js", "*.py"] },
    "typescript": { "priority": "medium", "autoDetect": ["*.ts", "*.tsx"] },
    "git": { "priority": "critical", "autoDetect": ["git"] },
    "test": { "priority": "medium", "autoDetect": ["*.test.*", "*.spec.*"] },
    "docs": { "priority": "low", "autoDetect": ["*.md", "docs/"] }
  }
}
```

Create `.codevoyant/style/patterns.json`:
```json
{
  "version": "1.0.0",
  "patterns": [],
  "history": []
}
```

## Step 5: Update .gitignore

Add to `.gitignore`:
```
# Style guide learning data (personal observations)
.codevoyant/style/patterns.json
.codevoyant/style/history.jsonl

# Keep config (team settings)
!.codevoyant/style.json
```

Report what was added.

## Step 6: Create Justfile Hooks (Optional)

If justfile exists, offer to add helper recipes:

Use **AskUserQuestion**:
```
question: "Add style recipes to justfile for easy access?"
header: "Justfile Integration"
multiSelect: false
options:
  - label: "Yes, add recipes"
    description: "Add style commands to justfile"
  - label: "No, use /style commands"
    description: "Use Claude Code commands directly"
```

If yes, add to justfile:
```just
# Style guide management
[group('dev')]
style-validate:
    # Validate current work against style guide
    @echo "TODO: Implement validation"

[group('dev')]
style-learn:
    # Analyze patterns and suggest rules
    @echo "TODO: Implement learning"
```

## Step 7: Report Success

```
✓ Style guide initialized successfully!

Created files:
- CLAUDE.md (context-tagged style guide)
- .codevoyant/style.json (learning settings)
- .codevoyant/style/patterns.json (pattern tracking)
- Updated .gitignore

Next steps:
1. Review and customize CLAUDE.md for your team
2. Run /style:extract to populate rules from existing code patterns
3. Commit to git: git add CLAUDE.md .codevoyant/style/ .gitignore
4. Add rules: /style:add "your rule" --context build
5. Start learning: /style:learn

Your style guide is now active and will be loaded by Claude Code automatically.

Context tags enable smart loading - only relevant rules load per task.
Token usage: ~{token_count} tokens (target: <800)

Commands:
- /style:add - Add new rules
- /style:validate - Check compliance
- /style:learn - Auto-learn from patterns
- /style:optimize - Reduce token usage
```

## Notes

**Team Collaboration:**
- CLAUDE.md is committed to git and shared with team
- Everyone gets the same rules automatically
- .codevoyant/style.json is shared (learning settings)
- .codevoyant/style/patterns.json is gitignored (personal observations)

**Context Tags:**
- Format: `<!-- @context: tag1, tag2, tag3 -->`
- Place before each major section
- Multiple tags per section allowed
- Tags enable contextual loading via hooks

**Auto-Detection:**
- Hooks detect current activity context
- Only load relevant rules (saves ~70% tokens)
- See /style:contexts for details
