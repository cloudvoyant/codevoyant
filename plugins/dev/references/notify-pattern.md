# Notification Pattern for Background Agents

Use this pattern at the end of any background agent prompt that should notify the user on completion. Pass `SILENT=true` to suppress.

## Preferred — use the shared script

```bash
# Find notify.sh (works if codevoyant plugins are in the project or in ~/.claude)
_NOTIFY_SCRIPT=""
for _candidate in \
  "$(git rev-parse --show-toplevel 2>/dev/null)/plugins/dev/scripts/notify.sh" \
  "$HOME/.claude/plugins/dev/scripts/notify.sh" \
  "$(dirname "$(which claude 2>/dev/null)")/plugins/dev/scripts/notify.sh"; do
  [ -f "$_candidate" ] && _NOTIFY_SCRIPT="$_candidate" && break
done

if [ -n "$_NOTIFY_SCRIPT" ]; then
  bash "$_NOTIFY_SCRIPT" "{TITLE}" "{MESSAGE}"
else
  # Inline fallback — no external dependency
  case "${OSTYPE:-}" in
    darwin*) osascript -e 'display notification "{MESSAGE}" with title "{TITLE}" sound name "default"' 2>/dev/null ;;
    linux*)  notify-send "{TITLE}" "{MESSAGE}" 2>/dev/null || printf '\a' ;;
    msys*|cygwin*) powershell.exe -WindowStyle Hidden -Command "msg '%username%' '{TITLE}: {MESSAGE}'" 2>/dev/null || printf '\a' ;;
    *) grep -qi microsoft /proc/version 2>/dev/null && powershell.exe -WindowStyle Hidden -Command "msg '%username%' '{TITLE}: {MESSAGE}'" 2>/dev/null || printf '\a' ;;
  esac
fi
```

Replace `{TITLE}` and `{MESSAGE}` with actual values before embedding in the agent prompt. Wrap the whole block in `if [ "$SILENT" != "true" ]; then ... fi`.
