---
name: snippets
description: 'Manage Raycast snippets stored as topic-isolated markdown. Triggers on: "snippets add", "snippets update", "snippets sync", "snippets get", "snippets help", "add a snippet", "new raycast snippet", "sync snippets", "find a snippet".'
license: MIT
compatibility: Requires python3 and git (git only for `sync`). Works on Claude Code and any platform with a POSIX shell.
---

# snippets

Raycast snippets skill dispatcher. Manages a store of topic-isolated snippet markdown files (one file per language/framework/topic) plus a generated Raycast `.json` beside each `.md`.

## Skill directory resolution

Workflows invoke the vendored converter at `scripts/md2snippets.py`. Resolve the skill package root once and export it so every workflow uses the same path — this works both from the repo `skills/snippets/` checkout and from an installed copy. Do NOT rely on `$0` (it is the invoking shell, not this file):

```bash
# Resolve the skill package root (the directory containing this SKILL.md).
if [ -n "${BASH_SOURCE:-}" ]; then
  SKILL_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
else
  SKILL_DIR="${SKILL_DIR:-$HOME/.claude/skills/snippets}"
fi
export SKILL_DIR
```

When dispatching, resolve `SKILL_DIR` to the directory that contains this `SKILL.md` (the skill package root) and export it so the workflow bash blocks can invoke `python3 "$SKILL_DIR/scripts/md2snippets.py"`.

## Store resolution

Every workflow resolves the snippet store the same way — `snippetDir` from `~/.codevoyant/meta.json` if present, else `~/.codevoyant/snippets`:

```bash
META="$HOME/.codevoyant/meta.json"
if [ -f "$META" ] && command -v jq >/dev/null 2>&1; then
  STORE=$(jq -r '.snippetDir // empty' "$META")
fi
STORE="${STORE:-$HOME/.codevoyant/snippets}"
STORE="${STORE/#\~/$HOME}"   # expand a leading ~ if meta.json stored one
mkdir -p "$STORE"
```

## Snippet file format (enforced)

Snippets are **topic-isolated**: one `.md` per language/framework/topic (`bash.md`, `cargo.md`, `rust.md`, `mise.md`, `marimo.md`, …). A snippet always goes in the file for its topic. Each file has:

1. Optional YAML frontmatter with `tags:`.
2. A `# Title` heading.
3. An optional keyword→snippet reference table.
4. One section per snippet: a `## <name>` heading, then a line containing exactly `` `;keyword` `` (backtick-wrapped, leading `;`), then a fenced code block whose contents are the snippet text.

A generated `<topic>.json` sits beside each `<topic>.md`, produced by `scripts/md2snippets.py`.

## Critical Rules

- **Never execute workflow logic here** — this file only parses args and dispatches.
- **Step 0 always runs first** — no exceptions.
- **Unknown verb → run `help.md`** — never error silently.
- **Pass all remaining args through** — the workflow receives `$REMAINING_ARGS` unchanged.
- **Keep snippets topic-isolated** and always keep the format above parse-clean for `scripts/md2snippets.py`.
- **Markdown output: soft-wrap prose, never hard-wrap.**

## Step 0: Parse Arguments

The raw invocation args (filled by Claude Code / OpenCode slash commands): `$ARGUMENTS`. If this line is not filled in, read the verb and remaining args from the user's current message.

```bash
VERB="[first non-flag argument, or empty]"
REMAINING_ARGS="[everything after VERB, preserving order and flags]"

case "$VERB" in
  "")       VERB="help"   ;;
  "new")    VERB="add"    ;;
  "a")      VERB="add"    ;;
  "up")     VERB="update" ;;
  "build")  VERB="update" ;;
  "push")   VERB="sync"   ;;
  "pull")   VERB="sync"   ;;
  "find")   VERB="get"    ;;
  "search") VERB="get"    ;;
esac
```

## Step 1: Dispatch to Workflow

Read and execute `references/workflows/{VERB}.md`, passing `$REMAINING_ARGS` as the argument string.

If `references/workflows/{VERB}.md` does not exist, fall back to `references/workflows/help.md` and note the unknown verb.

## Workflow Index

- **add** (`references/workflows/add.md`) — add new snippet(s) into the correct topic `.md`, rebuild that topic's `.json`
- **update** (`references/workflows/update.md`) — update existing snippet(s); with no argument, rebuild the whole store
- **sync** (`references/workflows/sync.md`) — git-sync the store (commit / pull / push), configuring `snippetRepo` if needed
- **get** (`references/workflows/get.md`) — find a snippet by keyword, name, or body and print it
- **help** (`references/workflows/help.md`) — print command reference
