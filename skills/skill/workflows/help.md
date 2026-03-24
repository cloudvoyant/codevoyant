# help

List all available `skill` subcommands.

## Commands

| Verb | Argument hint | Description |
|------|--------------|-------------|
| `explore` | `[topic] [--thorough]` | Research existing skills on agentskill.sh before building |
| `new` | `[skill-name] [--research <path>]` | Create a new Claude Code compatible skill |
| `update` | `[skill-name-or-plan]` | Update or improve an existing skill |
| `critique` | `<skill-name\|path/to/SKILL.md>` | Evaluate skill quality across 5 dimensions |
| `help` | | Show this reference |

## Aliases

| Alias | Resolves to |
|-------|------------|
| `create` | `new` |
| `improve` | `update` |
| `review` | `critique` |

## Examples

```
/skill explore          # browse skills by topic
/skill new my-skill     # create a new skill
/skill update my-skill  # improve an existing skill
/skill critique dev:plan # evaluate skill quality
```
