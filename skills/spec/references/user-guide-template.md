# User Guide Template

Write this file to `$PLAN_DIR/user-guide.md` when creating a plan. Fill in what is knowable now; mark the rest with `<!-- TODO: fill in during/after execution -->`. The execution agent must keep this updated as code is built.

```markdown
# {Plan Name} — User Guide

> {One-sentence description of what this does and who it's for.}

## Introduction

{2–4 sentences describing what was built. Focus on what it does, not how. Who is this for? What problem does it solve?}

<!-- TODO: fill in during/after execution -->

## Requirements

{Prerequisites the user must have before using this: tools installed, permissions needed, config to set up.}
- {prerequisite 1}
- {prerequisite 2}

<!-- TODO: fill in during/after execution -->

## Implementation

### Quick Start

```{language}
{Minimal working example — the simplest possible usage}
```

### {Primary Use Case}

{Describe the most common way to use this. Show a concrete example.}

### API Reference

{List public interfaces, functions, commands, or configuration options.}

#### `{functionName / command / config key}`

{What it does in one sentence.}

**Parameters:** `{param}` — {type, required/optional, description}

**Returns:** {What the caller gets back}

### Configuration

{Any config files, environment variables, or flags. Leave empty if none.}

<!-- TODO: fill in during/after execution -->

## Future Work / Troubleshooting

### Known Limitations
- {what this doesn't handle}

### Common Issues

#### {Common Issue}
{How to diagnose and fix it}

<!-- TODO: fill in during/after execution -->

## References
- {Links to related skills, plans, or external documentation}
```

**Rules:**
- No implementation details (no class internals, no database schema, no algorithm explanations)
- Focus on what the user sees and interacts with, not how it works inside
- Every code example must be runnable as-is (or clearly marked as pseudo-code)
- Update this file incrementally during execution — don't leave it as a stub
