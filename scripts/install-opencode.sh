#!/usr/bin/env bash
# Optionally install an opencode command wrapper for one or more dispatcher
# skills, so "/skill-name verb args" forwards arguments the same way Claude
# Code does.
#
# OpenCode's skill tool accepts only a name; args typed after the command only
# reach the SKILL.md dispatcher via a command file (~/.config/opencode/command/
# {skill}.md) whose $ARGUMENTS placeholder opencode substitutes. Skills that
# follow skills/shared/arg-handling.md degrade to "ask the user" when args are
# missing, so this installer is OPTIONAL -- a convenience, not a requirement.
# The same shared template (skills/shared/opencode-command/template.md) is applied to
# every skill; nothing per-skill is checked into the repo.
#
# Usage:
#   bash scripts/install-opencode.sh                # wrappers for all dispatcher skills
#   bash scripts/install-opencode.sh spec docs      # wrappers for named skills
#   bash scripts/install-opencode.sh --list         # dry-run: print targets
#   bash scripts/install-opencode.sh --uninstall    # remove wrappers

set -euo pipefail

REPO="${CODEVOYANT_REPO:-}"
UNINSTALL=false
LIST_ONLY=false
TARGETS=()
for arg in "$@"; do
  case "$arg" in
    --uninstall) UNINSTALL=true ;;
    --list)      LIST_ONLY=true ;;
    -*)          : ;;
    *)           TARGETS+=("$arg") ;;
  esac
done

# Resolve the repo root. When piped via curl, BASH_SOURCE is missing, so clone
# into a temp dir.
if [[ -z "$REPO" ]]; then
  if [[ -f "${BASH_SOURCE[0]}" ]]; then
    REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  else
    TMP_DIR="$(mktemp -d)"
    trap 'rm -rf "$TMP_DIR"' EXIT
    echo "Cloning codevoyant (detached from a curl pipe)..." >&2
    git clone --depth=1 https://github.com/cloudvoyant/codevoyant.git "$TMP_DIR" >/dev/null 2>&1
    REPO="$TMP_DIR"
  fi
fi

COMMAND_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/command"
TEMPLATE="$REPO/skills/shared/opencode-command/template.md"

dispatcher_skills() {
  # A dispatcher skill parses command args and dispatches to per-verb
  # workflows: its SKILL.md has a "## Step 0: Parse Arguments" block (or the
  # "VERB = first non-flag" pattern) AND a references/workflows/ directory.
  # This excludes query/cheatsheet skills (cz, hx, vim, zellij, ...) that have
  # a "Step 0" section but no verb dispatch.
  for skill_dir in "$REPO"/skills/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_file="$skill_dir/SKILL.md"
    [[ -f "$skill_file" ]] || continue
    [[ -d "$skill_dir/references/workflows" ]] || continue
    if grep -qE '^## Step 0: Parse Arguments|VERB = first non-flag' "$skill_file"; then
      basename "$skill_dir"
    fi
  done | sort
}

skill_description() {
  # Pull the `description:` frontmatter line and strip the leading field plus
  # any surrounding YAML single/double quotes. sed (not awk -F) is used so a
  # description that itself contains ': ' (e.g. "Triggers on: spec new") is not
  # truncated at the first colon-space.
  sed -n 's/^description:[[:space:]]*//p' "$1" | head -1 | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//'
}

if [[ ${#TARGETS[@]} -eq 0 ]]; then
  TARGETS=()
  while IFS= read -r skill; do TARGETS+=("$skill"); done < <(dispatcher_skills)
fi

if $LIST_ONLY; then
  echo "Dispatcher skills that would get an opencode command wrapper:"
  printf '  %s\n' "${TARGETS[@]}"
  exit 0
fi

if $UNINSTALL; then
  echo "Removing codevoyant command wrappers from $COMMAND_DIR..."
  removed=0
  for skill in "${TARGETS[@]}"; do
    if [[ -f "$COMMAND_DIR/$skill.md" ]]; then
      rm -f "$COMMAND_DIR/$skill.md"
      echo "  removed $COMMAND_DIR/$skill.md"
      removed=$((removed + 1))
    fi
  done
  echo "Removed $removed codevoyant command wrapper(s). Skills are left untouched."
  exit 0
fi

mkdir -p "$COMMAND_DIR"
count=0
for skill in "${TARGETS[@]}"; do
  [[ -n "$skill" ]] || continue
  skill_file="$REPO/skills/$skill/SKILL.md"
  [[ -f "$skill_file" ]] || { echo "  skip $skill (no SKILL.md)"; continue; }
  description="$(skill_description "$skill_file")"
  [[ -n "$description" ]] || description="$skill commands"
  # Substitute template tokens with python (not sed) so descriptions containing
  # '/', '&', or backslashes cannot corrupt the wrapper.
  python3 - "$TEMPLATE" "$COMMAND_DIR/$skill.md" "$skill" "$description" <<'PY'
import sys
template_path, out_path, skill, description = sys.argv[1:]
with open(template_path) as f:
    content = f.read()
content = content.replace("{skill}", skill).replace("{description}", description)
with open(out_path, "w") as f:
    f.write(content)
PY
  count=$((count + 1))
  echo "  wrote $COMMAND_DIR/$skill.md"
done

echo "Installed $count opencode command wrapper(s) in $COMMAND_DIR."
echo "Restart opencode (or reload) for the new /commands to appear."
