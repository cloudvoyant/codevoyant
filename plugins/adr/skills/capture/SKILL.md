---
description: "Use when capturing technical decisions made during a session as ADRs. Triggers on: \"capture decisions\", \"adr capture\", \"save decisions\", \"record architecture decision\", \"document decision\". Reviews the current session and writes Architectural Decision Records for significant choices."
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


Review the current session conversation and capture any significant technical decisions as ADRs (Architectural Decision Records).

## Instructions

1. Analyze the conversation to identify key decisions that should be documented:
   - Technology choices (tools, frameworks, languages)
   - Architecture changes (structure, patterns, organization)
   - Process changes (workflows, conventions, standards)
   - Design patterns or approaches
   - Trade-offs that were explicitly discussed

2. For each decision identified:
   - Determine the next available ADR number by reading docs/decisions/README.md
   - Create a new ADR file: `docs/decisions/XXX-title-in-kebab-case.md`
   - Include:
     - Clear title describing the decision
     - Status: Accepted (for decisions already made in session)
     - Date: Today's date
     - Context: Why this decision was needed
     - Decision: What was decided
     - Alternatives Considered: Options that were discussed but not chosen
     - Rationale: Why this decision was made over alternatives

3. Update docs/decisions/README.md to add the new ADR(s) to the index

4. Present a summary of what decisions were captured and where

## Guidelines

- Only create ADRs for significant decisions (not trivial implementation details)
- Use clear, objective language
- Focus on the "why" behind decisions
- Keep ADRs concise but complete
- If uncertain about whether something warrants an ADR, ask the user first

## Example Decision Types

✅ Create ADR for:
- "We decided to consolidate tests to reduce redundancy"
- "Using git archive with export-ignore for GitHub templates"
- Major refactoring i.e. changes to APIs, design, architecture.

❌ Don't create ADR for:
- Fixing a typo
- Adding a comment
- Running a command
- Trivial bugfixes
- Minor refactoring
