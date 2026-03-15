---
description: Diagnose and fix CLAUDE.md health — brings outdated style guides up to current standards (adds missing Critical Rules block, fixes context tag format, repairs structure), then optimizes for brevity. Use when the style guide is too large, hasn't been touched in a while, is missing the Critical Rules block, or needs to be reorganized. Triggers on keywords like style doctor, fix style guide, update CLAUDE.md, optimize style guide, style guide outdated.
disable-model-invocation: true
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


Diagnose and heal CLAUDE.md — fix structural issues first, then optimize for brevity.

## Overview

Runs a two-phase process: (1) **diagnosis** — detect and fix structural issues that prevent the style guide from working correctly across agents; (2) **optimization** — reduce token count while preserving all important rules.

## Step 0: Diagnose Structural Issues

Read CLAUDE.md and check for known structural problems. Report findings before doing anything:

**Check 1 — Critical Rules block**
- Missing entirely → **fix**: prepend the block using the format from `style:init` Step 3.5
- Present but stale (rules don't reflect current high-priority sections) → **fix**: refresh rules from current content
- Present and healthy → ✅

**Check 2 — Context tags**
- Sections missing `<!-- @context: ... -->` tags → **fix**: infer likely tags from section headings and insert them
- Tags present → ✅

**Check 3 — Agent reminder in Critical Rules block**
- Missing the `> **For agents:** ...` prompt-to-load line → **fix**: insert it
- Present → ✅

**Check 4 — Deprecated patterns**
- References to `.claude/skills/style-brief/` (old approach) → **fix**: remove, note that the Critical Rules block replaces it
- Any other known deprecated structure → **fix**: update

**Check 5 — Legacy `.style/` directory**
- Run `[ -d .style ]` to detect the old data directory
- If present → **fix**: migrate to `.codevoyant/style/`:
  ```bash
  mkdir -p .codevoyant/style
  cp -r .style/. .codevoyant/style/
  rm -rf .style
  ```
  Then update `.gitignore`: replace `.style/` entries with `.codevoyant/style/` equivalents.
  Report: `✓ Migrated .style/ → .codevoyant/style/`
- If absent → ✅

**Check 6 — Legacy config location `.codevoyant/style/config.json`**
- Run `[ -f .codevoyant/style/config.json ]` to detect the old config path
- If present → **fix**: move to the new location `.codevoyant/style.json`:
  ```bash
  mkdir -p .codevoyant
  mv .codevoyant/style/config.json .codevoyant/style.json
  ```
  Then update `.gitignore`: replace any `!.codevoyant/style/config.json` line with `!.codevoyant/style.json`.
  Report: `✓ Migrated .codevoyant/style/config.json → .codevoyant/style.json`
- If absent → ✅

Report findings:
```
🔍 CLAUDE.md diagnosis

Critical Rules block:  ❌ missing           → will add
Context tags:          ⚠️  3/8 sections      → will infer + insert
Agent reminder:        ✅ present
Deprecated patterns:   ❌ style-brief ref    → will remove
Legacy .style/ dir:    ⚠️  found             → will migrate to .codevoyant/style/
Legacy config path:    ⚠️  found             → will migrate to .codevoyant/style.json

Proceeding to fix structural issues, then optimize...
```

If no issues found, skip to Step 1.

## Step 1: Analyze Current State

Read CLAUDE.md and calculate metrics:

```bash
# Token estimation (rough: 4 chars ≈ 1 token)
TOTAL_CHARS=$(wc -c < CLAUDE.md)
ESTIMATED_TOKENS=$((TOTAL_CHARS / 4))

# Count sections
SECTION_COUNT=$(grep -c "^## " CLAUDE.md)

# Count rules
RULE_COUNT=$(grep -c "^- \|^\* \|^[0-9]" CLAUDE.md)

# Detect long sections
grep -n "^## " CLAUDE.md | while read line; do
  SECTION_START=$(echo "$line" | cut -d: -f1)
  NEXT_SECTION=$(grep -n "^## " CLAUDE.md | grep -A1 "^$SECTION_START:" | tail -1 | cut -d: -f1)
  SECTION_SIZE=$((NEXT_SECTION - SECTION_START))

  if [ $SECTION_SIZE -gt 50 ]; then
    echo "Large section at line $SECTION_START ($SECTION_SIZE lines)"
  fi
done
```

Report current state:
```
📊 CLAUDE.md Analysis

Current State:
- Token Count: 1,245 tokens (target: <800)
- Sections: 8
- Rules: 34
- Average per section: 156 tokens

Issues Detected:
⚠️  Exceeds target by 445 tokens (56% over)
⚠️  3 sections exceed 200 tokens
⚠️  Redundant rules detected (2 duplicates)
⚠️  Verbose explanations in Build System section

Optimization Potential: ~500 tokens (40% reduction)
```

## Step 2: Identify Optimization Opportunities

### Check for Redundancy
```bash
# Find duplicate or similar rules
# Look for repeated phrases across sections
```

**Example redundancy:**
```
Section 1: "Always use justfile recipes"
Section 3: "Check justfile before running commands"
→ Can consolidate into one rule
```

### Check for Verbosity
```bash
# Find long explanations that could be shortened
# Look for examples that could be links to docs
```

**Example verbosity:**
```
Before (150 tokens):
"This project uses justfile which is a command runner similar to make
but with a better syntax. The reason we use justfile is because it
provides cross-platform compatibility and better error messages. To use
justfile, first check the available recipes with `just --list`, then
run the appropriate recipe..."

After (30 tokens):
"Use justfile recipes. Check: `just --list`"
Details: [docs/style-guide/build.md]
```

### Check for Low-Value Rules
```bash
# Rules with generic advice that doesn't add value
# Rules that duplicate tool documentation
```

**Example low-value:**
```
"Write clean code" → Too vague, remove
"Use meaningful variable names" → Generic, remove
```

### Check Context Tag Coverage
```bash
# Rules without context tags can't be contextually loaded
# Rules with too many contexts are loaded too often
```

## Step 3: Propose Optimization Strategy

Generate optimization plan:

```
🔧 Optimization Strategy

Priority 1: Move Details to Docs (Save ~300 tokens)
- Build System explanations → docs/style-guide/build.md
- TypeScript style examples → docs/style-guide/typescript.md
- Testing guidelines → docs/style-guide/testing.md

Priority 2: Consolidate Redundant Rules (Save ~100 tokens)
- Merge 2 justfile rules into 1
- Combine 3 TypeScript type rules

Priority 3: Shorten Verbose Rules (Save ~80 tokens)
- 5 rules can be condensed
- Remove redundant explanations

Priority 4: Remove Low-Value Rules (Save ~40 tokens)
- 2 generic rules add no value
- 1 rule duplicates ESLint config

Total Potential Savings: ~520 tokens (42% reduction)
Target Achievement: 725 tokens (9% under target ✓)
```

## Step 4: Confirm Optimization

Use **AskUserQuestion**:
```
question: "Optimize CLAUDE.md? This will reduce from 1,245 to ~725 tokens."
header: "Optimize Style Guide"
multiSelect: true
options:
  - label: "Move details to docs/"
    description: "Extract detailed explanations (save ~300 tokens)"
  - label: "Consolidate redundant rules"
    description: "Merge similar rules (save ~100 tokens)"
  - label: "Shorten verbose rules"
    description: "Make rules more concise (save ~80 tokens)"
  - label: "Remove low-value rules"
    description: "Delete generic rules (save ~40 tokens)"
  - label: "Auto-optimize (all)"
    description: "Apply all optimizations automatically"
```

## Step 5: Execute Optimizations

### Move Details to Docs
```bash
# Create docs/style-guide/ if it doesn't exist
mkdir -p docs/style-guide

# Extract Build System details
sed -n '/## Build System/,/^## /p' CLAUDE.md > docs/style-guide/build.md

# Update CLAUDE.md with link
# Replace long explanation with:
## Build System
Use justfile recipes. [Details](docs/style-guide/build.md)
```

### Consolidate Rules
```markdown
Before:
- Always use justfile recipes
- Check `just --list` before bash commands
- Prefer justfile over npm scripts

After:
- Use justfile recipes (check `just --list`). [Why](docs/style-guide/build.md#justfile)
```

### Shorten Rules
```markdown
Before:
"When modifying existing files, always use the Edit tool instead of the
Write tool because Edit is designed for modifications and will fail if
the file doesn't exist, preventing accidental overwrites."

After:
- Prefer Edit over Write for modifications
```

### Remove Low-Value
```markdown
Remove:
- "Write clean, maintainable code" (too generic)
- "Use TypeScript strict mode" (duplicate of tsconfig.json)
```

## Step 6: Verify Context Tags

Ensure all sections have appropriate context tags:

```bash
# Find sections without tags
grep -B1 "^## " CLAUDE.md | grep -v "@context" | grep "^## "

# Add tags where missing
```

**Before optimization:**
```markdown
## Build System
Use justfile...
```

**After optimization:**
```markdown
<!-- @context: build, tools -->
## Build System
Use justfile recipes. [Details](docs/style-guide/build.md)
```

## Step 7: Reorder by Priority

Organize sections by loading frequency/importance:

```markdown
1. Critical rules (loaded most often)
2. High-priority rules (common contexts)
3. Medium-priority rules
4. Low-priority rules (rare contexts)
```

**Reordered CLAUDE.md:**
```markdown
# Project Style Guide

<!-- @context: build, tools -->
## Build System
[Critical - loaded often]

<!-- @context: code, typescript -->
## Code Style
[High priority - loaded for all code]

<!-- @context: git, commit -->
## Git Commits
[High priority - loaded for commits]

<!-- @context: docs -->
## Documentation
[Lower priority - loaded for docs only]
```

## Step 8: Create Documentation Structure

Create detailed docs that CLAUDE.md links to:

```bash
docs/style-guide/
├── README.md          # Overview of all rules
├── build.md           # Build system details
├── typescript.md      # TypeScript style guide
├── git.md             # Git workflow details
├── testing.md         # Testing practices
└── tools.md           # Tool usage guide
```

Each doc file contains:
- Full explanations
- Examples and counter-examples
- Rationale for rules
- Links to external resources

## Step 8.5: Refresh Critical Rules Block

After all content changes are complete, update the `## Critical Rules` block at the top of CLAUDE.md:

1. Re-read all context-tagged sections to find the highest-priority rules
2. Pick the 3–5 that apply most broadly (prefer `build`, `git`, `code` contexts)
3. Replace the existing block content between `<!-- CRITICAL RULES -->` and `<!-- END CRITICAL RULES -->` with fresh terse imperatives
4. Keep the agent reminder line intact:
   > **For agents:** This file has additional context-specific rules in tagged sections below. Before starting any task, load the section(s) relevant to what you're doing.

Do not change the block structure or markers — only the bullet-point rules inside.

## Step 9: Measure Results

```bash
# Calculate new metrics
NEW_TOKENS=$(($(wc -c < CLAUDE.md) / 4))
SAVINGS=$((ESTIMATED_TOKENS - NEW_TOKENS))
SAVINGS_PERCENT=$((SAVINGS * 100 / ESTIMATED_TOKENS))
```

Report optimization results:
```
✓ Optimization Complete!

Before:
- Tokens: 1,245
- Sections: 8
- Rules: 34
- Issues: 4

After:
- Tokens: 725 (↓ 520 tokens, 42% reduction)
- Sections: 8 (reorganized by priority)
- Rules: 28 (↓ 6 redundant/low-value)
- Issues: 0

Performance:
✓ Under target (725 < 800)
✓ Context tags complete (8/8 sections)
✓ Documentation links added
✓ Priority ordering applied

Token Savings Breakdown:
- Moved to docs: 300 tokens
- Consolidated rules: 100 tokens
- Shortened text: 80 tokens
- Removed low-value: 40 tokens

Created Documentation:
- docs/style-guide/build.md (detailed build rules)
- docs/style-guide/typescript.md (code style examples)
- docs/style-guide/git.md (git workflow)

Next Steps:
1. Review optimized CLAUDE.md
2. Commit both CLAUDE.md and docs/
3. Team will get concise rules + detailed docs

Your style guide is now lean and efficient!
```

## Step 10: Update Config

Update `.codevoyant/style.json` with optimization metadata:

```json
{
  "optimization": {
    "lastRun": "{timestamp}",
    "beforeTokens": 1245,
    "afterTokens": 725,
    "savings": 520,
    "savingsPercent": 42,
    "method": "auto",
    "docFiles": [
      "docs/style-guide/build.md",
      "docs/style-guide/typescript.md",
      "docs/style-guide/git.md"
    ]
  }
}
```

## Configuration

Control optimization in `.codevoyant/style.json`:

```json
{
  "optimization": {
    "enabled": true,
    "autoRun": false,              // Auto-optimize when over target
    "targetTokens": 800,
    "maxTokens": 1200,             // Auto-optimize at this threshold
    "strategies": {
      "moveToDoc": true,
      "consolidate": true,
      "shorten": true,
      "removeLowValue": true
    },
    "preserve": [
      "## Critical Rules",         // Never optimize this block — refresh via Step 8.5 instead
      "build-system"
    ]
  }
}
```

## Notes

**Safe Optimization:**
- The "Move details to docs/" and "Shorten" strategies never lose information
- The "Remove low-value" strategy (Step 5) does permanently delete rules — this is intentional but irreversible; the user confirms via AskUserQuestion before it runs
- Detailed information is preserved in docs/ when moved
- Context tags ensure right rules load at right time

**When to Optimize:**
- CLAUDE.md exceeds 1,000 tokens
- Adding many new rules
- After extraction or bulk learning
- Quarterly maintenance

**Best Practices:**
- Keep CLAUDE.md as quick reference
- Move explanations/examples to docs/
- Use links liberally
- Maintain context tags for smart loading
- Test after optimization to ensure rules still work
