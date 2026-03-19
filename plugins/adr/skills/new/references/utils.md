# Notification Pattern

Cross-platform desktop notification for Claude Code background agents.
Source: `plugins/utils/scripts/notify.sh` — synced via `just sync-utils`.

## Usage

```bash
for _c in \
  "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/{plugin}/scripts/notify.sh" \
  "$HOME/.claude/plugins/{plugin}/scripts/notify.sh"; do
  [ -f "$_c" ] && bash "$_c" "{TITLE}" "{MESSAGE}" && break
done
```

Replace `{plugin}`, `{TITLE}`, and `{MESSAGE}` before embedding. Wrap in `if [ "$SILENT" != "true" ]` for skills that support `--silent`.
