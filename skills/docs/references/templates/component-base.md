# {Component Name}

<!-- Component type: {api | library | frontend | infra} -->
<!-- Path: {e.g. libs/auth, apps/web/src/routes/api/images} -->

## Overview

{2-3 sentences:
1. What is this component? (what it does)
2. Where does it live? (path in the codebase)
3. Why does it exist? (what problem it solves / what would break without it)
}

<!-- language-guide rule: no class names, function names, or file paths here -->
<!-- language-guide rule: define acronyms on first use -->

## Requirements

<!-- What this component must do -- measurable properties, not implementation details. -->
<!-- Write requirements as obligations: "must", "must not", "returns", "rejects" -->

- {e.g. Must authenticate every request -- unauthenticated callers receive 401}
- {e.g. Must not store plaintext credentials}
- {e.g. Returns within 200ms under normal load}

## Design

<!-- Key design decisions. WHY before WHAT. -->
<!-- Every non-obvious choice should have a rationale sentence. -->

### {Key Design Section -- e.g. "Session Format", "Data Model", "Security Properties"}

{Describe the decision and why it was made.}

<!-- Use a table for 3+ related properties, enums, or configuration options. -->
<!-- Use a diagram for any multi-step flow or relationship. -->

## Implementation

### {Major Flow or Structure -- e.g. "Authentication Flow", "File Structure"}

<!-- Sequence diagram OR numbered list (choose the clearest; prefer diagram for 4+ steps) -->

<!-- For numbered flows: -->
1. {step description -- active voice, present tense}
2. {step description}

### Environment Variables / Configuration

<!-- Only include if the component has configurable inputs. Delete section if not. -->

| Variable | Description | Required |
|----------|-------------|----------|
| `{VAR_NAME}` | {what it controls -- plain English} | yes / no |

## References

<!-- Link to source files, related architecture docs, and external dependencies. -->
<!-- Rule: one link per line, with a brief description. -->

- `{path/to/main/file.ts}` -- {what this file does}
- [`docs/architecture/{related}.md`]({related}.md) -- {why it's related}
- [{External dependency name}]({url}) -- {why referenced}
