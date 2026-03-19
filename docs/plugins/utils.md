<script setup>
import { withBase } from 'vitepress'
</script>

<img :src="withBase('/icons/utils.svg')" width="64" height="64" style="margin-bottom: 1rem" />

# Utils (Internal)

Shared utility content used by all codevoyant plugins. Not a plugin — not installed directly.

`utils` is a source directory. Its scripts, markdown patterns, and skills are distributed into every plugin automatically via `just sync-utils`. You never install utils separately; each plugin already includes its own copy.

## What's Included

### `scripts/notify.sh`

Cross-platform desktop notification script. Supports macOS (osascript / terminal-notifier), Linux (notify-send / kdialog / zenity), Windows, and WSL.

Automatically prepends `[project @ branch]` to every notification so you can tell which project and branch a background agent is reporting from.

Each plugin gets its own copy at `plugins/{name}/scripts/notify.sh`.

### `md/notify.md`

Documents the notification invocation pattern. Copied to `plugins/{name}/references/notify.md`.

### `skills/help/SKILL.md`

Canonical help skill. Copied to every plugin with `{plugin}` substituted for the plugin name. Maintains a single source of truth for the `/help` command across all plugins.

## For Plugin Authors

After modifying anything in `plugins/utils/`, run:

```bash
just sync-utils
```

This propagates changes to all plugins.
