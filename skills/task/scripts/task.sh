#!/usr/bin/env bash
# task.sh — single-process task-runner dispatcher for the `task`/`tasks` skill.
# One source of truth for detection, listing, running, and the no-match offer.
# Usage:
#   task.sh [list]            detect runner and list tasks (default)
#   task.sh detect            print machine-readable runner variables + report
#   task.sh run <query> [..]  match <query> to a task and run it (extra args passed through)
set -u

# Scratch file for the last enumeration's stderr (see list_task_names).
ENUM_ERR="$(mktemp "${TMPDIR:-/tmp}/task-enum.XXXXXX")"
trap 'rm -f "$ENUM_ERR"' EXIT

# ---- Detection (single place; order: mise -> just -> Taskfile -> package.json -> none) ----
detect_runner() {
  if [ -f mise.toml ] || [ -f .mise.toml ]; then
    RUNNER_NAME="mise"; RUNNER="mise run"; LIST_CMD="mise tasks ls"
  elif [ -f justfile ] || [ -f Justfile ]; then
    RUNNER_NAME="just"; RUNNER="just"; LIST_CMD="just --list"
  elif [ -f Taskfile.yml ] || [ -f Taskfile.yaml ]; then
    RUNNER_NAME="task"; RUNNER="task"; LIST_CMD="task --list"
  elif [ -f package.json ] && jq -e '.scripts' package.json >/dev/null 2>&1; then
    if command -v pnpm >/dev/null 2>&1; then RUNNER="pnpm run"; else RUNNER="npm run"; fi
    RUNNER_NAME="package.json"; LIST_CMD="$RUNNER"
  else
    RUNNER_NAME="none"; RUNNER=""; LIST_CMD=""
  fi
}

# ---- Enumerate task names, one per line, for matching ----
# Writes the runner's enumeration error (if any) to $ENUM_ERR (a temp file) so
# callers can distinguish "couldn't enumerate" from "no such task". Returns the
# underlying command's exit status; a non-zero status OR a non-empty error means
# enumeration failed and MUST NOT be treated as "the task does not exist".
list_task_names() {
  : > "$ENUM_ERR"
  case "$RUNNER_NAME" in
    mise)  mise tasks ls --no-header 2>"$ENUM_ERR" | awk 'NF{print $1}' ;;
    just)  just --summary 2>"$ENUM_ERR" | tr ' ' '\n' ;;
    task)  task --list 2>"$ENUM_ERR" | awk '/^\* /{print $2}' | sed 's/:$//' ;;
    package.json) jq -r '.scripts | keys[]' package.json 2>"$ENUM_ERR" ;;
    *) : ;;
  esac
}

print_listing() {
  if [ "$RUNNER_NAME" = "none" ]; then
    printf 'No task runner found in this project.\n'
    printf 'Recommended: add a mise.toml with a [tasks] table to declare your build/test/lint commands.\n'
    return 0
  fi
  printf 'RUNNER: %s (%s)\n\n' "$RUNNER_NAME" "$RUNNER"
  # shellcheck disable=SC2086
  $LIST_CMD 2>/dev/null || {
    # package.json fallback when the bare runner does not print scripts
    if [ "$RUNNER_NAME" = "package.json" ]; then jq '.scripts' package.json 2>/dev/null; fi
  }
}

cmd_detect() {
  detect_runner
  printf 'RUNNER_NAME=%s\n' "$RUNNER_NAME"
  printf 'RUNNER=%s\n' "$RUNNER"
  printf 'LIST_CMD=%s\n' "$LIST_CMD"
  if [ "$RUNNER_NAME" = "none" ]; then
    printf '\nNo task runner found. Recommended: add a mise.toml with a [tasks] table.\n'
  else
    printf '\nTask runner: %s (%s)\nList command: %s\n' "$RUNNER_NAME" "$RUNNER" "$LIST_CMD"
  fi
}

cmd_list() {
  detect_runner
  print_listing
}

# Resolve $1 (query) against available task names.
#   return 0 — unique match; echoes the resolved name.
#   return 1 — enumeration failed (runner present but could not list tasks);
#              echoes the runner's error. NOT the same as "no such task".
#   return 2 — ambiguous (2+ candidates); echoes the candidate names.
#   return 3 — no candidates matched a query that could be enumerated.
# All matching is literal (grep -F / case) — the query is never treated as a pattern.
resolve_task() {
  query="$1"
  names="$(list_task_names)"
  enum_status=$?
  # A runner is configured but enumeration errored or produced nothing: this is
  # "couldn't enumerate," not "no such task." Surface it rather than offering create.
  if [ "$enum_status" -ne 0 ] || [ -s "$ENUM_ERR" ] || [ -z "$names" ]; then
    cat "$ENUM_ERR" 2>/dev/null
    return 1
  fi
  # 1. exact (case-sensitive, literal)
  if printf '%s\n' "$names" | grep -qxF -- "$query"; then printf '%s\n' "$query"; return 0; fi
  # 2. case-insensitive exact (literal)
  ci="$(printf '%s\n' "$names" | grep -ixF -- "$query")"
  if [ "$(printf '%s\n' "$ci" | grep -c .)" = "1" ]; then printf '%s\n' "$ci"; return 0; fi
  # 3. prefix (case-insensitive, literal): lowercase both sides and compare via case.
  lq="$(printf '%s' "$query" | tr '[:upper:]' '[:lower:]')"
  pre="$(printf '%s\n' "$names" | while IFS= read -r n; do
    ln="$(printf '%s' "$n" | tr '[:upper:]' '[:lower:]')"
    case "$ln" in "$lq"*) printf '%s\n' "$n" ;; esac
  done)"
  npre=$(printf '%s\n' "$pre" | grep -c .)
  if [ "$npre" = "1" ]; then printf '%s\n' "$pre"; return 0; fi
  if [ "$npre" -gt 1 ]; then printf '%s\n' "$pre"; return 2; fi
  # 4. substring (case-insensitive, literal via grep -iF)
  sub="$(printf '%s\n' "$names" | grep -iF -- "$query")"
  nsub=$(printf '%s\n' "$sub" | grep -c .)
  if [ "$nsub" = "1" ]; then printf '%s\n' "$sub"; return 0; fi
  if [ "$nsub" -gt 1 ]; then printf '%s\n' "$sub"; return 2; fi
  return 3
}

cmd_run() {
  detect_runner
  if [ "$RUNNER_NAME" = "none" ]; then
    printf 'NO_RUNNER\n'
    printf 'No task runner is configured. Add a mise.toml with a [tasks] table, then retry.\n'
    return 4
  fi
  if [ "$#" -eq 0 ]; then
    printf 'RUNNER: %s (%s)\n\n' "$RUNNER_NAME" "$RUNNER"
    print_listing
    printf '\nNO_QUERY\n'
    return 2
  fi
  query="$1"; shift
  resolved="$(resolve_task "$query")"
  case $? in
    0) : ;;  # unique match — fall through to exec
    1)  # enumeration failed: runner present but tasks couldn't be listed
        printf 'RUNNER: %s (%s)\n\n' "$RUNNER_NAME" "$RUNNER"
        printf 'Could not enumerate tasks for %s:\n' "$RUNNER_NAME"
        [ -n "$resolved" ] && printf '%s\n' "$resolved"
        if [ "$RUNNER_NAME" = "mise" ]; then
          printf 'If this is a fresh clone, the config may be untrusted — run: mise trust\n'
        fi
        printf '\nENUM_FAILED:%s\n' "$query"
        return 5 ;;
    2)  # ambiguous — 2+ candidates; disambiguate, do NOT offer to create
        printf 'RUNNER: %s (%s)\n\n' "$RUNNER_NAME" "$RUNNER"
        printf 'Multiple tasks match "%s":\n' "$query"
        printf '%s\n' "$resolved"
        printf '\nAMBIGUOUS:%s\n' "$query"
        return 6 ;;
    *)  # genuine no-match against a runner whose tasks enumerated cleanly
        printf 'RUNNER: %s (%s)\n\n' "$RUNNER_NAME" "$RUNNER"
        print_listing
        printf '\nNO_MATCH:%s\n' "$query"
        return 3 ;;
  esac
  # shellcheck disable=SC2086
  exec $RUNNER "$resolved" "$@"
}

main() {
  verb="${1:-list}"
  case "$verb" in
    detect) shift; cmd_detect ;;
    list)   shift; cmd_list ;;
    run)    shift; cmd_run "$@" ;;
    "")     cmd_list ;;
    *)      # unknown first token => treat as a run query
            cmd_run "$@" ;;
  esac
}

main "$@"
