#!/usr/bin/env bash
# Cross-platform desktop notification for Claude Code background agents.
# Usage: notify.sh <title> <message>
# Auto-prepends [project @ branch] to identify the source window when multiple
# projects are open. Project = git root basename; branch = current HEAD.
# Exits 0 on success, 1 if no notification method available (bell fallback always fires).

TITLE="${1:-Claude Code}"
MESSAGE="${2:-Task complete}"

# Detect project and branch for multi-window disambiguation
_GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -n "$_GIT_ROOT" ]; then
  PROJECT="$(basename "$_GIT_ROOT")"
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
else
  PROJECT="$(basename "$(pwd)")"
  BRANCH=""
fi

if [ -n "$BRANCH" ] && [ "$BRANCH" != "HEAD" ]; then
  CONTEXT="[$PROJECT @ $BRANCH]"
else
  CONTEXT="[$PROJECT]"
fi

# Sanitise for safe embedding in osascript / PowerShell strings
TITLE="${TITLE//\"/\\\"}"
MESSAGE="${MESSAGE//\"/\\\"}"
CONTEXT="${CONTEXT//\"/\\\"}"

_notify_macos() {
  # terminal-notifier: title = context, subtitle = skill title, body = message
  if command -v terminal-notifier &>/dev/null; then
    terminal-notifier \
      -title   "$CONTEXT" \
      -subtitle "$TITLE" \
      -message  "$MESSAGE" \
      -sound default 2>/dev/null && return 0
  fi
  # osascript subtitle supported on macOS 10.9+
  osascript -e "display notification \"$MESSAGE\" with title \"$CONTEXT\" subtitle \"$TITLE\" sound name \"default\"" 2>/dev/null
}

_notify_linux() {
  local FULL_TITLE="$CONTEXT — $TITLE"
  if command -v notify-send &>/dev/null; then
    notify-send -a "Claude Code" "$FULL_TITLE" "$MESSAGE" 2>/dev/null && return 0
  fi
  if command -v kdialog &>/dev/null; then
    kdialog --passivepopup "$FULL_TITLE: $MESSAGE" 5 2>/dev/null & return 0
  fi
  if command -v zenity &>/dev/null; then
    zenity --notification --text="$FULL_TITLE: $MESSAGE" 2>/dev/null & return 0
  fi
  return 1
}

_notify_windows_powershell() {
  # Works on native Windows (Git Bash / MSYS2 / Cygwin) and WSL
  command -v powershell.exe &>/dev/null || return 1
  local FULL_TITLE="$CONTEXT — $TITLE"
  powershell.exe -WindowStyle Hidden -NonInteractive -Command "
    try {
      \$null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
      \$tpl  = [Windows.UI.Notifications.ToastTemplateType]::ToastText02
      \$xml  = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(\$tpl)
      \$nodes = \$xml.GetElementsByTagName('text')
      \$nodes[0].AppendChild(\$xml.CreateTextNode('$FULL_TITLE'))  | Out-Null
      \$nodes[1].AppendChild(\$xml.CreateTextNode('$MESSAGE')) | Out-Null
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Claude Code').Show(
        [Windows.UI.Notifications.ToastNotification]::new(\$xml)
      )
    } catch {
      # Fallback: legacy message box (blocking — only as last resort)
      msg '\''%username%'\'' '$FULL_TITLE: $MESSAGE' 2>NUL
    }
  " 2>/dev/null
}

_is_wsl() {
  grep -qi microsoft /proc/version 2>/dev/null
}

case "${OSTYPE:-}" in
  darwin*)
    _notify_macos || printf '\a'
    ;;
  linux*)
    if _is_wsl; then
      _notify_windows_powershell || _notify_linux || printf '\a'
    else
      _notify_linux || printf '\a'
    fi
    ;;
  msys*|cygwin*|mingw*)
    _notify_windows_powershell || printf '\a'
    ;;
  *)
    # Unknown OS — try everything
    _notify_macos 2>/dev/null || _notify_windows_powershell 2>/dev/null || _notify_linux 2>/dev/null || printf '\a'
    ;;
esac
