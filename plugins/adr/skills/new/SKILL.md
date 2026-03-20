---
description: "Use when creating a new Architectural Decision Record from scratch. Triggers on: \"new adr\", \"adr new\", \"create adr\", \"document decision\", \"new architecture decision\", \"record a decision\". Interactively guides through context, decision, and consequences."
disable-model-invocation: true
hooks:
  PostToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          command: |
            INPUT=$(cat)
            FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
            if [[ "$FILE" == *"docs/decisions/"* ]] && [[ "$FILE" == *.md ]]; then
              MISSING=""
              for section in "## Status" "## Context" "## Decision"; do
                grep -q "$section" "$FILE" 2>/dev/null || MISSING="$MISSING $section"
              done
              if [ -n "$MISSING" ]; then
                echo "⚠️  ADR missing required sections:$MISSING" >&2
              fi
            fi
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially.


Guide the user through creating a new Architectural Decision Record (ADR) interactively.

## Workflow

### Step 1: Understand the Decision

Ask: "What decision needs to be documented?"

Wait for the user's response describing the decision or problem being addressed.

### Step 2: Research Context

Based on the decision topic:
- Search the codebase for relevant files and patterns
- Check existing ADRs in docs/decisions/ for related decisions
- Identify relevant tools, patterns, or approaches already in use
- Read any relevant documentation

Present findings: "Here's what I found related to this decision: [summary]"

### Step 3: Explore Options

Ask: "What options have you considered or should we explore?"

If the user hasn't fully explored options:
- Research and present 2-4 viable alternatives
- For each alternative, provide:
  - Brief description
  - Key pros
  - Key cons
  - Similar usage in industry or codebase

Format as a clear comparison to help decision-making.

### Step 4: Make the Decision

Ask: "Which option do you want to choose, and why?"

Wait for the user to specify:
- The chosen approach
- Their reasoning/rationale
- Any important trade-offs they're accepting

### Step 5: Create the ADR

1. Determine the next ADR number by reading docs/decisions/README.md
2. Create ADR file: `docs/decisions/XXX-title-in-kebab-case.md`
3. Create the ADR with:
   - Status: Ask user if this should be "Accepted" or "Work In Progress"
   - Date: Today's date (from env)
   - Context: Summarize why this decision is needed
   - Decision: State what was decided
   - Alternatives Considered: List options that were evaluated
   - Rationale: Explain why this decision was made

4. Update docs/decisions/README.md to add the new ADR

### Step 6: Review

Present the ADR content and ask: "Does this accurately capture the decision? Any changes needed?"

Wait for confirmation or edits before finalizing.

## Status Options

- Work In Progress: Decision is being explored but not yet finalized
- Accepted: Decision has been made and is being implemented
- Superseded: Later superseded by another ADR (reference it)
- Deprecated: No longer recommended but kept for historical context
- Rejected: Considered but ultimately not chosen

## Example Interaction

```
Assistant: What decision needs to be documented?

User: We need to decide on a testing framework
