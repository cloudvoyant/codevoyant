# Notification Pattern

Cross-platform desktop notification for Claude Code background agents.
Uses `@codevoyant/agent-kit` CLI — no shell script path resolution needed.

## Usage

```bash
npx @codevoyant/agent-kit notify --title "{TITLE}" --message "{MESSAGE}"
```

With silent support:

```bash
npx @codevoyant/agent-kit notify --title "{TITLE}" --message "{MESSAGE}"${SILENT:+ --silent}
```

Replace `{TITLE}` and `{MESSAGE}` before embedding. Wrap in `if [ "$SILENT" != "true" ]` for skills that support `--silent`.
