---
description: "Use when comparing two repositories for structural differences. Triggers on: \"compare repos\", \"how does this compare to\", \"what changed since we forked\", \"dev diff\", \"diff against\", \"repo comparison\". Identifies divergence from a template or upstream, useful for migration planning and architectural study."
argument-hint: "<repository-url>"
disable-model-invocation: true
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

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


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

Create `.claude/diff.md` using the full report structure in `references/report-template.md` (in this skill's directory). Load that file — it covers both similar-structure (file-by-file diff) and different-structure (architectural comparison) layouts, with all section headers and placeholders ready to fill in.

### Step 6: Cleanup

1. Remove the temporary directory:
   ```bash
   rm -rf <temp-dir>
   ```

2. Confirm successful cleanup

3. Display completion message:

   ```
   ✅ Repository comparison complete!

   Report saved to: .claude/diff.md

   Summary:
   - <X> files analyzed
   - <Y> meaningful change groups identified
   - <Z> key insights extracted
   ```

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

## Examples

### Example 1: Template Comparison

```bash
/diff https://github.com/original/template-repo
```

**User Objective:** "Track changes from template/fork"

**Result:** Detailed file-by-file diff showing customizations made to template

### Example 2: Architectural Study

```bash
/diff https://github.com/competitor/similar-product
```

**User Objective:** "Architectural comparison"

**Result:** High-level comparison of design patterns, tech stack, and organization

### Example 3: Migration Analysis

```bash
/diff https://github.com/company/legacy-app
```

**User Objective:** "Migration analysis"

**Result:** Detailed breakdown of changes needed for migration, grouped by complexity
