---
description: Add a new rule to the style guide (CLAUDE.md) with context tags. Use when the user wants to add, create, or register a new style rule.
argument-hint: '"rule description" [--context tag1,tag2]'
disable-model-invocation: true
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


Add a new rule to the style guide with context tags.

## Usage

```
/style:add "rule description" --context tag1,tag2
/style:add "always use justfile recipes" --context build,tools
```

## Step 1: Parse Arguments

Extract rule text and context tags from arguments:

```bash
RULE_TEXT="$1"  # First argument is the rule
CONTEXTS="${2#--context }"  # Extract contexts after --context flag
```

If no rule text provided, ask user:
```
What rule would you like to add?
Example: "Always use justfile recipes instead of bash commands"
```

If no contexts provided, use **AskUserQuestion**:
```
question: "Which contexts should this rule apply to?"
header: "Rule Contexts"
multiSelect: true
options:
  - label: "build"
    description: "Build system and tooling commands"
  - label: "code"
    description: "General code style and patterns"
  - label: "git"
    description: "Version control and commits"
  - label: "test"
    description: "Testing practices"
  - label: "tools"
    description: "Tool preferences (Read, Edit, Bash)"
  - label: "docs"
    description: "Documentation standards"
```

## Step 2: Read Current CLAUDE.md

```bash
if [ ! -f CLAUDE.md ]; then
  echo "Error: CLAUDE.md not found. Run /style:init first."
  exit 1
fi
```

Read CLAUDE.md to find appropriate section.

## Step 3: Determine Section

Based on context tags, determine which section to add to:

```javascript
{
  "build": "Build System",
  "code": "Code Style",
  "typescript": "TypeScript Style",
  "git": "Git Commit Messages",
  "test": "Testing",
  "tools": "File Operations",
  "docs": "Documentation"
}
```

If section doesn't exist, use **AskUserQuestion**:
```
question: "Section '{Section Name}' doesn't exist. Create it with @context: {contexts}?"
header: "New Section"
multiSelect: false
options:
  - label: "Yes, create section"
    description: "Add new section to CLAUDE.md"
  - label: "No, pick existing section"
    description: "Choose from available sections instead"
```

## Step 4: Format Rule

Format the rule appropriately:

**For bullet lists:**
```markdown
- {RULE_TEXT}
```

**For critical rules:**
```markdown
**CRITICAL:** {RULE_TEXT}
```

**For detailed rules:**
```markdown
**{Short Title}:**
{RULE_TEXT}

**Why:** {Explanation}
```

Ask user which format:
```
question: "How should this rule be formatted?"
header: "Rule Format"
multiSelect: false
options:
  - label: "Bullet point"
    description: "Simple list item (recommended for short rules)"
  - label: "Critical warning"
    description: "Emphasize as critical rule"
  - label: "Detailed explanation"
    description: "Include rationale and examples"
```

## Step 5: Add to CLAUDE.md

Insert the rule into the appropriate section:

1. Find the section header with matching context tags
2. Insert rule under the header
3. Maintain alphabetical or logical ordering
4. Ensure proper markdown formatting

Example insertion:
```markdown
<!-- @context: build, tools -->
## Build System

**CRITICAL:** This project uses justfile for all build commands.
- Always check `just --list` before running bash commands
{NEW RULE INSERTED HERE}
- Use justfile recipes over npm scripts when available
```

## Step 6: Update Token Count

After inserting the rule, read the updated CLAUDE.md and estimate the section's token count:

```
# Rough estimate: 4 characters ≈ 1 token
Read the section text from CLAUDE.md, count characters, divide by 4
TOKEN_ESTIMATE = section_character_count / 4
```

If token count exceeds target, warn:
```
⚠️  This section is now {TOKEN_ESTIMATE} tokens (target: <200 per section)

Consider:
- Moving details to docs/style-guide/
- Consolidating similar rules
- Run /style:optimize to reorganize
```

## Step 7: Update Learning Database

Add to `.codevoyant/style/patterns.json` as a manually added rule:

```json
{
  "patterns": [
    {
      "id": "rule-{timestamp}",
      "type": "manual",
      "rule": "{RULE_TEXT}",
      "contexts": ["build", "tools"],
      "addedBy": "user",
      "addedAt": "{timestamp}",
      "confidence": 1.0,
      "status": "applied"
    }
  ]
}
```

## Step 8: Report Success

```
✓ Rule added to CLAUDE.md

Section: {Section Name}
Contexts: {contexts}
Format: {format type}

Added rule:
"{RULE_TEXT}"

Token impact:
- Section: {TOKEN_ESTIMATE} tokens
- Total CLAUDE.md: {TOTAL_TOKENS} tokens
{if TOTAL_TOKENS > 1000}
⚠️  Consider running /style:optimize
{endif}

The rule is now active and will be loaded when contexts match.

Next steps:
- Commit CLAUDE.md to share with team
- Validate with: /style:validate
```

## Examples

### Example 1: Build Tool Rule
```
/style:add "Always check justfile before using npm commands" --context build,tools

→ Adds to "Build System" section
→ Tagged with: @context: build, tools
→ Active when: Using Bash tool or in build workflow
```

### Example 2: Code Style Rule
```
/style:add "Prefer const over let" --context code,typescript

→ Adds to "TypeScript Style" section
→ Tagged with: @context: code, typescript
→ Active when: Editing .ts files
```

### Example 3: Git Rule
```
/style:add "Reference issue numbers in commit footer" --context git,commit

→ Adds to "Git Commit Messages" section
→ Tagged with: @context: git, commit
→ Active when: Making commits
```

## Notes

**Context Tags:**
- Multiple contexts = rule applies in multiple scenarios
- More contexts = loaded more often = higher token usage
- Be specific with contexts to minimize unnecessary loading

**Rule Guidelines:**
- Keep rules concise (1-2 sentences ideal)
- Focus on "what" and "why", not "how"
- Link to detailed docs for complex topics
- Use critical/warning format sparingly

**Token Management:**
- Target: <200 tokens per section
- Total target: <800 tokens for CLAUDE.md
- Run /style:optimize if exceeding targets
