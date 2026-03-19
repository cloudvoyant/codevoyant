#!/usr/bin/env bash
# Install codevoyant skills for VS Code Copilot
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/codevoyant/codevoyant/main/scripts/install-vscode.sh | bash
#
# Or from a local clone:
#   bash scripts/install-vscode.sh            # install all plugins
#   bash scripts/install-vscode.sh spec       # install one plugin
#   bash scripts/install-vscode.sh --uninstall

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

INSTALL_DIR="$HOME/.copilot/skills"

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

declare -A PLUGINS=( ["spec"]="spec" ["dev"]="dev" ["style"]="style" ["adr"]="adr" )

if $UNINSTALL; then
  echo -e "${YELLOW}Uninstalling codevoyant skills from $INSTALL_DIR...${RESET}"
  for prefix in spec dev style adr; do
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

    # Inject `name:` into frontmatter if not present
    skill_file="$target_dir/SKILL.md"
    if [[ -f "$skill_file" ]] && ! grep -q "^name:" "$skill_file"; then
      awk -v name="$target_name" '
        /^---$/ { count++; print; if (count == 1) { print "name: " name; } next }
        { print }
      ' "$skill_file" > "$skill_file.tmp" && mv "$skill_file.tmp" "$skill_file"
    fi

    echo -e "  ${GREEN}✓ $target_name${RESET}"
    installed=$((installed + 1))
  done
done

echo -e "${GREEN}Installed $installed skills.${RESET}"

# Install agent definitions to .github/agents/ in the current project (workspace-scoped)
# VS Code Copilot agents are project-specific and live in .github/agents/
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  WORKSPACE_ROOT="$(git rev-parse --show-toplevel)"
  AGENTS_DIR="$WORKSPACE_ROOT/.github/agents"
  echo -e "${BLUE}Installing codevoyant agents to $AGENTS_DIR ...${RESET}"
  mkdir -p "$AGENTS_DIR"

  agents_installed=0
  for plugin in "${!PLUGINS[@]}"; do
    [[ -n "$FILTER" && "$plugin" != "$FILTER" ]] && continue
    agents_src="$REPO/plugins/$plugin/agents"
    [[ -d "$agents_src" ]] || continue

    for agent_src in "$agents_src"/*.md; do
      [[ -f "$agent_src" ]] || continue
      agent_name="$(basename "$agent_src" .md)"
      target_file="$AGENTS_DIR/$agent_name.agent.md"

      cp "$agent_src" "$target_file"

      echo -e "  ${GREEN}✓ $agent_name${RESET}"
      agents_installed=$((agents_installed + 1))
    done
  done

  echo -e "${GREEN}Installed $agents_installed agents.${RESET}"
  echo
  echo -e "${YELLOW}Note:${RESET} Agent files were installed to $AGENTS_DIR"
  echo -e "Commit .github/agents/ to share agents with your team."
else
  echo -e "${YELLOW}Note:${RESET} Not in a git repository — agent definitions were not installed."
  echo -e "Run this script from your project root to install agents to .github/agents/."
fi

echo
echo -e "Skills are available globally in all VS Code workspaces."
echo -e "Restart VS Code or reload the Copilot extension to pick up new skills."
