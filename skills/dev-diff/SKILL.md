---
description: 'Use when comparing two repositories for structural differences. Triggers on: "compare repos", "how does this compare to", "what changed since we forked", "dev diff", "diff against", "repo comparison". Identifies divergence from a template or upstream, useful for migration planning and architectural study.'
name: dev:diff
license: MIT
compatibility: 'Designed for Claude Code. Requires hooks or ${CLAUDE_SKILL_DIR} — non-functional on other platforms without modification.'
argument-hint: '<repository-url>'
context: fork
agent: general-purpose
hooks:
  Stop:
    - hooks:
        - type: command
          command: |
            # Clean up any leftover diff temp directories
            find /tmp -maxdepth 2 -name "target-repo" -type d 2>/dev/null | while read d; do
              PARENT=$(dirname "$d")
              rm -rf "$PARENT" 2>/dev/null && echo "Cleaned up diff temp dir: $PARENT" || true
            done
---

> **Compatibility**: Designed for Claude Code only. This skill uses hooks or `${CLAUDE_SKILL_DIR}` which are not available on other platforms. Run on Claude Code or adapt before using elsewhere.

Compare the current repository with another repository to identify changes and insights.

## Overview

The `/diff` skill enables comparison between the current repository and a target repository specified by URL. It identifies structural similarities, conducts detailed file-by-file analysis, and produces a comprehensive diff report with meaningful insights.

## Skill Syntax

```
/diff <repository-url>
```

Target repository: $ARGUMENTS

**Parameters:**

- `repository-url` (required): Git repository URL to compare against (HTTPS or SSH)

## Workflow

### Step 1: Gather Context

1. Ask the user for the diff objective using AskUserQuestion:
   - "What is the purpose of this comparison?"
   - Provide options:
     - "Track changes from template/fork" - Identify modifications made after forking
     - "Architectural comparison" - Compare design patterns and structure
     - "Migration analysis" - Understand differences for migration planning
     - "Code review" - Review changes between similar projects
     - "Custom" - User provides specific objective

2. Store the user's objective for the report

### Step 2: Clone Target Repository

1. Create a temporary directory using system temp location:

   ```bash
   mktemp -d
   ```

2. Clone the target repository into the temp directory:

   ```bash
   git clone <repository-url> <temp-dir>/target-repo
   ```

3. Handle clone errors gracefully:
   - Authentication failures
   - Invalid URLs
   - Network issues
   - Repository not found

### Step 3: Analyze Repository Structure

1. **Map directory structures** for both repositories:
   - Use `find` or directory traversal to build tree structures
   - Identify top-level directories and organization patterns
   - Note framework/language indicators (package.json, Cargo.toml, go.mod, etc.)

2. **Calculate structural similarity**:
   - Compare directory hierarchies
   - Identify common file patterns
   - Determine if repositories share a template/forking relationship

3. **Classification**:
   - **Similar structure** (>60% overlap): Proceed with detailed file-by-file diff
   - **Different structure** (<60% overlap): Focus on architectural comparison

### Step 4: Detailed Analysis

#### For Similar Structures (Template/Fork Relationship)

1. **File-level comparison**:
   - Generate list of all files in both repos
   - Categorize files:
     - Modified files (exist in both, different content)
     - Added files (only in current repo)
     - Removed files (only in target repo)
     - Identical files (same content)

2. **Conduct file-by-file diff**:
   - Use `git diff --no-index` for meaningful files
   - Focus on source code, configuration, and documentation
   - Skip binary files, dependencies (node_modules, vendor, etc.)
   - Capture line-level changes for key files

3. **Group changes meaningfully**:
   - By feature/functionality (auth changes, UI updates, etc.)
   - By file type (configuration, source code, tests, docs)
   - By impact level (breaking, enhancement, refactor, fix)

4. **Extract insights**:
   - Identify patterns in modifications
   - Detect new features or capabilities
   - Note removed functionality
   - Highlight configuration differences

#### For Different Structures (Architectural Comparison)

1. **Architectural analysis**:
   - Identify framework and language differences
   - Compare project organization patterns
   - Note build system differences
   - Identify dependency management approaches

2. **Design pattern comparison**:
   - Frontend architecture (if applicable)
   - Backend architecture (if applicable)
   - State management approaches
   - API design patterns
   - Testing strategies

3. **Coding style analysis**:
   - Language/framework choices
   - Naming conventions
   - Code organization philosophy
   - Documentation approaches
   - Error handling patterns

### Step 5: Generate Diff Report

**Check for changelog:** Look for `CHANGELOG.md`, `CHANGELOG`, or `RELEASES.md` in both repos. If found, scan recent entries to guide characterization of changes — they often name features and breaking changes explicitly.

Determine the output filename: `.codevoyant/diffs/{YYYY-MM-DD}-{target-repo-name}.md`

Write the report using `references/report-template.md` as the structure. Keep each section to **5 bullets or fewer**. File trees should show `*` next to modified/added files. Only include sections that have meaningful content.

### Step 6: Cleanup

1. Remove the temporary directory:

   ```bash
   rm -rf <temp-dir>
   ```

2. Confirm successful cleanup

3. Report: `✓ Diff saved to .codevoyant/diffs/{filename}`

## Error Handling

1. **Clone failures**:
   - Display clear error message
   - Suggest authentication setup if needed
   - Verify repository URL format

2. **Permission issues**:
   - Check write access to temp directory
   - Verify .claude/ directory exists and is writable

3. **Large repositories**:
   - Warn if repository is very large (>1GB)
   - Ask user to confirm before proceeding
   - Consider shallow clone: `git clone --depth=1`

4. **Binary file handling**:
   - Skip binary files in detailed diff
   - List binary files separately in report

5. **Memory/performance**:
   - Use streaming for large diffs
   - Limit diff context for very large files
   - Sample files if repository has thousands of files
