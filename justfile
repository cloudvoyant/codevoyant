# justfile - Command runner for Claude Code plugin
# Requires: just (https://github.com/casey/just)

set shell   := ["bash", "-c"]

# Project metadata
PROJECT     := "claudevoyant"
VERSION     := `cat version.txt`

# Color codes for output
INFO        := '\033[0;34m'
SUCCESS     := '\033[0;32m'
WARN        := '\033[1;33m'
ERROR       := '\033[0;31m'
NORMAL      := '\033[0m'

# ==============================================================================
# CORE DEVELOPMENT
# ==============================================================================

# Default recipe (show help)
_default:
    @just --list --unsorted

# ==============================================================================
# UTILS SYNC
# ==============================================================================

# Sync shared utils into all plugins — run after changing anything in plugins/utils/
[group('dev')]
sync-utils:
    #!/usr/bin/env bash
    set -euo pipefail
    UTILS="plugins/utils"
    PLUGINS=(adr dev em pm spec style)
    echo "Syncing utils..."

    # scripts + md → every skill dir in every plugin
    for plugin in "${PLUGINS[@]}"; do
        for skill_dir in "plugins/$plugin/skills"/*/; do
            [ -d "$skill_dir" ] || continue
            skill="$(basename "$skill_dir")"
            if [ -d "$UTILS/scripts" ] && [ -n "$(ls "$UTILS/scripts"/*.sh 2>/dev/null)" ]; then
                mkdir -p "$skill_dir/scripts"
                for f in "$UTILS/scripts"/*.sh; do
                    cp "$f" "$skill_dir/scripts/$(basename "$f")"
                    chmod +x "$skill_dir/scripts/$(basename "$f")"
                done
                echo "  ✓ scripts/* → plugins/$plugin/skills/$skill/scripts/"
            fi
            if [ -f "$UTILS/utils.md" ]; then
                mkdir -p "$skill_dir/references"
                cp -n "$UTILS/utils.md" "$skill_dir/references/utils.md"
                echo "  ✓ utils.md → plugins/$plugin/skills/$skill/references/ (no-clobber)"
            fi
        done
    done

    # skills → plugins/{name}/skills/{skill}/ with {plugin} substituted
    for plugin in "${PLUGINS[@]}"; do
        if [ -d "$UTILS/skills" ]; then
            for skill_dir in "$UTILS/skills"/*/; do
                skill="$(basename "$skill_dir")"
                mkdir -p "plugins/$plugin/skills/$skill"
                for f in "$skill_dir"*.md; do
                    [ -f "$f" ] || continue
                    sed "s/{plugin}/$plugin/g" "$f" > "plugins/$plugin/skills/$skill/$(basename "$f")"
                    echo "  ✓ skills/$skill/$(basename "$f") → plugins/$plugin/skills/$skill/ [{plugin}=$plugin]"
                done
            done
        fi
    done

    echo "Done."

# ==============================================================================
# TESTING
# ==============================================================================

# Run tests
[group('dev')]
test:
    # TODO: Implement tests
    @echo -e "{{WARN}}No tests configured{{NORMAL}}"

# ==============================================================================
# DOCS
# ==============================================================================

# Generate favicons from SVGs in docs/public/
[group('docs')]
favicons:
    #!/usr/bin/env bash
    set -euo pipefail
    for variant in light dark; do
        for size in 16 32 48; do
            npx sharp-cli -i docs/public/cloudvoyant-logo-${variant}.svg \
                -o docs/public/favicon-${variant}-${size}.png \
                resize ${size} ${size}
        done
        convert docs/public/favicon-${variant}-16.png \
                docs/public/favicon-${variant}-32.png \
                docs/public/favicon-${variant}-48.png \
                docs/public/favicon-${variant}.ico
        rm docs/public/favicon-${variant}-{16,32,48}.png
    done
    echo "Favicons generated: favicon-light.ico, favicon-dark.ico"

# Start local docs dev server
[group('docs')]
docs:
    npm run docs:dev

# Build docs site
[group('docs')]
docs-build:
    npm run docs:build

# Preview built docs
[group('docs')]
docs-preview:
    npm run docs:preview

# ==============================================================================
# CI/CD
# ==============================================================================

# Get current version
[group('ci')]
version:
    @echo "{{VERSION}}"

# Create new version (run semantic-release)
[group('ci')]
upversion:
    npx semantic-release

# Publish the plugin (placeholder - plugins don't need traditional publishing)
[group('ci')]
publish:
    @echo -e "{{SUCCESS}}Plugin published via git tag and GitHub release{{NORMAL}}"
    @echo -e "{{INFO}}Users install via: /plugin marketplace add cloudvoyant/claudevoyant{{NORMAL}}"
