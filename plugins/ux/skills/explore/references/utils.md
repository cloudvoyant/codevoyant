# Shared Utilities

Common patterns used across the ux:explore skill.

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

## Open Command (Cross-Platform)

Open a file in the default browser on macOS or Linux:

```bash
open {FILE} 2>/dev/null || xdg-open {FILE} 2>/dev/null || echo "Open {FILE} in your browser"
```

- macOS: `open` is available natively
- Linux: `xdg-open` handles default browser
- Fallback: print path for manual opening

## AskUserQuestion Pattern

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
