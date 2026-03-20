#!/usr/bin/env bash
# Install codevoyant skills for OpenCode
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-opencode.sh | bash
#
# Or from a local clone:
#   bash scripts/install-opencode.sh           # install all plugins
#   bash scripts/install-opencode.sh spec      # install one plugin
#   bash scripts/install-opencode.sh --uninstall

set -euo pipefail

REPO="${CLAUDEVOYANT_REPO:-}"
FILTER="${1:-}"
UNINSTALL=false
if [[ "$FILTER" == "--uninstall" ]]; then
  UNINSTALL=true
  FILTER=""
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

INSTALL_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/skills"

# When piped via curl, clone the repo to a temp dir
if [[ -z "$REPO" ]]; then
  if [[ -f "${BASH_SOURCE[0]}" ]]; then
    REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  else
    TMP_DIR="$(mktemp -d)"
    trap 'rm -rf "$TMP_DIR"' EXIT
    echo -e "${BLUE}Cloning codevoyant...${RESET}"
    git clone --depth=1 https://github.com/cloudvoyant/codevoyant.git "$TMP_DIR" >/dev/null 2>&1
    REPO="$TMP_DIR"
  fi
fi

declare -A PLUGINS=( ["spec"]="spec" ["dev"]="dev" ["style"]="style" ["pm"]="pm" ["em"]="em" ["mem"]="mem" )

if $UNINSTALL; then
  echo -e "${YELLOW}Uninstalling codevoyant skills from $INSTALL_DIR...${RESET}"
  for prefix in spec dev style pm em mem; do
    for skill_dir in "$INSTALL_DIR"/"$prefix"-*/; do
      [[ -d "$skill_dir" ]] || continue
      rm -rf "$skill_dir"
      echo -e "  ${RED}✗ Removed $(basename "$skill_dir")${RESET}"
    done
  done
  echo -e "${GREEN}Done.${RESET}"
  exit 0
fi

echo -e "${BLUE}Installing codevoyant skills to $INSTALL_DIR...${RESET}"
mkdir -p "$INSTALL_DIR"

installed=0
for plugin in "${!PLUGINS[@]}"; do
  [[ -n "$FILTER" && "$plugin" != "$FILTER" ]] && continue
  prefix="${PLUGINS[$plugin]}"
  skills_dir="$REPO/plugins/$plugin/skills"
  [[ -d "$skills_dir" ]] || continue

  for skill_src in "$skills_dir"/*/; do
    [[ -d "$skill_src" ]] || continue
    skill_name="$(basename "$skill_src")"
    target_name="$prefix-$skill_name"
    target_dir="$INSTALL_DIR/$target_name"

    rm -rf "$target_dir"
    cp -r "$skill_src" "$target_dir"

    # Inject `name:` and strip Claude Code-specific fields (model:, disable-model-invocation:)
    # so OpenCode autocompletes on /prefix: and doesn't error on unknown frontmatter
    skill_file="$target_dir/SKILL.md"
    colon_name="$prefix:$skill_name"
    if [[ -f "$skill_file" ]]; then
      awk -v name="$colon_name" '
        /^---$/ { count++; print; if (count == 1 && name != "") { injected_name=1 }; next }
        count == 1 && injected_name && !name_printed && /^name:/ { name_printed=1 }
        count == 1 && !name_printed && injected_name { print "name: " name; name_printed=1 }
        count == 1 && /^model:/ { next }
        count == 1 && /^disable-model-invocation:/ { next }
        { print }
      ' "$skill_file" > "$skill_file.tmp" && mv "$skill_file.tmp" "$skill_file"
    fi

    echo -e "  ${GREEN}✓ $target_name${RESET}"
    installed=$((installed + 1))
  done
done

echo -e "${GREEN}Installed $installed skills.${RESET}"

# Install agent definitions to ~/.config/opencode/agents/
AGENTS_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/agents"
echo -e "${BLUE}Installing codevoyant agents to $AGENTS_DIR...${RESET}"
mkdir -p "$AGENTS_DIR"

agents_installed=0
for plugin in "${!PLUGINS[@]}"; do
  [[ -n "$FILTER" && "$plugin" != "$FILTER" ]] && continue
  agents_src="$REPO/plugins/$plugin/agents"
  [[ -d "$agents_src" ]] || continue

  for agent_src in "$agents_src"/*.md; do
    [[ -f "$agent_src" ]] || continue
    agent_name="$(basename "$agent_src" .md)"
    target_file="$AGENTS_DIR/$agent_name.md"

    # Strip Claude Code-specific frontmatter fields (tools: string, hooks: block)
    # and inject `name:` if missing — produces OpenCode-compatible agent files
    awk -v name="$agent_name" '
      /^---$/ {
        count++
        print
        if (count == 1 && name != "") { injected_name=1 }
        if (count == 2) { skip_block=0 }
        next
      }
      count == 1 && injected_name && !name_printed && /^name:/ { name_printed=1 }
      count == 1 && !name_printed && injected_name { print "name: " name; name_printed=1 }
      count == 1 && /^tools:/ { next }
      count == 1 && /^hooks:/ { skip_block=1; next }
      count == 1 && skip_block && /^[[:space:]]/ { next }
      count == 1 && skip_block && !/^[[:space:]]/ { skip_block=0 }
      { print }
    ' "$agent_src" > "$target_file"

    echo -e "  ${GREEN}✓ $agent_name${RESET}"
    agents_installed=$((agents_installed + 1))
  done
done

echo -e "${GREEN}Installed $agents_installed agents.${RESET}"
