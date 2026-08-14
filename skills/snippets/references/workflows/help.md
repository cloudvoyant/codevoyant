# snippets — Raycast Snippet Manager

Manage a store of topic-isolated Raycast snippet markdown files (one `.md` per language/framework/topic) with a generated `.json` beside each.

| Command | Description |
|---|---|
| `/snippets add [topic] <name> <keyword> <body...>` | Add a snippet into a topic `.md`, rebuild that topic's `.json` |
| `/snippets update [topic|name]` | Update an existing snippet; with no argument, rebuild the whole store |
| `/snippets sync [repo-url]` | Git-sync the store (commit / pull / push); configures `snippetRepo` if unset |
| `/snippets get <query>` | Find a snippet by keyword, name, or body and print it |
| `/snippets help` | Print this reference |

## Store location

The store resolves to `snippetDir` from `~/.codevoyant/meta.json` if present, else `~/.codevoyant/snippets`.

## Requirements

- `python3` (converter) — always.
- `git` and a configured `snippetRepo` — only for `sync`.
- `jq` — to read `~/.codevoyant/meta.json`.

## Snippet format

Each topic file: optional `tags:` frontmatter → `# Title` → optional keyword→snippet table → one section per snippet (`## <name>`, a `` `;keyword` `` line, then a fenced code block). After any change to a `.md`, re-run the converter and re-import via **Raycast → Settings → Snippets → Import**.
