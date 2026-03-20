# Shared Utilities

Common patterns used across the ux:prototype skill.

## BG_MODE Notification Pattern

Cross-platform desktop notification for background agents. Uses `@codevoyant/agent-kit` CLI.

```bash
npx @codevoyant/agent-kit notify --title "{TITLE}" --message "{MESSAGE}"
```

With silent support:

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify --title "{TITLE}" --message "{MESSAGE}"
fi
```

Replace `{TITLE}` and `{MESSAGE}` before embedding.

## Slug Derivation

Convert a human-readable name to a URL/filesystem-safe slug:

1. Convert to lowercase
2. Replace spaces and underscores with hyphens
3. Strip all characters that are not alphanumeric or hyphens
4. Collapse consecutive hyphens into a single hyphen
5. Trim leading/trailing hyphens

Examples:
- `"My Dashboard App"` -> `my-dashboard-app`
- `"E-Commerce_Platform"` -> `e-commerce-platform`
- `"Auth & Sessions"` -> `auth-sessions`

In bash:

```bash
SLUG=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | tr ' _' '-' | sed 's/[^a-z0-9-]//g' | sed 's/-\{2,\}/-/g' | sed 's/^-//;s/-$//')
```

## codevoyant.json Read/Write

The `codevoyant.json` file at the project root tracks prototypes and other metadata.

### Reading

```bash
if [ -f codevoyant.json ]; then
  EXISTING=$(cat codevoyant.json)
else
  EXISTING='{"prototypes":[]}'
fi
```

### Writing a new prototype entry

Read the existing file, append to the `prototypes` array, and write back. Use the tool environment's file-writing capabilities (not shell redirection) to avoid corruption.

Structure:

```json
{
  "prototypes": [
    {
      "name": "my-prototype",
      "path": "prototypes/my-prototype/",
      "location": "in-repo",
      "created": "2026-03-20T12:00:00Z"
    }
  ]
}
```

Fields:
- `name` -- the prototype slug
- `path` -- relative path from project root (or absolute for out-of-repo)
- `location` -- `"in-repo"` or `"out-of-repo"`
- `created` -- ISO-8601 timestamp

### Checking for duplicates

Before adding a new entry, check if a prototype with the same `name` already exists. If it does, warn the user and ask whether to overwrite or choose a different name.

## MCP Tool Patterns

### AskUserQuestion

Used for interactive prompts with predefined options:

```
AskUserQuestion:
  question: "Your question here"
  header: "Section Header"
  multiSelect: false
  options:
    - label: "Option 1"
      description: "Description of option 1"
    - label: "Option 2"
      description: "Description of option 2"
```

If `AskUserQuestion` is unavailable, fall back to presenting options as a numbered list and waiting for the user's reply.
