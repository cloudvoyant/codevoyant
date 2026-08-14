# snippets: update workflow

Update existing snippet(s). With **no argument**, simply re-run the converter over the whole store so every `.json` is in sync with its `.md`.

## Step 1: Resolve the store

```bash
META="$HOME/.codevoyant/meta.json"
if [ -f "$META" ] && command -v jq >/dev/null 2>&1; then
  STORE=$(jq -r '.snippetDir // empty' "$META")
fi
STORE="${STORE:-$HOME/.codevoyant/snippets}"
STORE="${STORE/#\~/$HOME}"
mkdir -p "$STORE"
```

## Step 2: No argument → rebuild the whole store

If `$REMAINING_ARGS` is empty, run the converter over every topic and stop:

```bash
# SKILL_DIR is exported by SKILL.md (the skill package root); fall back to the installed copy.
CONV="${SKILL_DIR:-$HOME/.claude/skills/snippets}/scripts/md2snippets.py"
python3 "$CONV" --src "$STORE" --out-dir "$STORE"
```

Report the per-file snippet counts the converter prints, then remind the user to re-import via **Raycast → Settings → Snippets → Import** if any `.json` changed.

## Step 3: Targeted update

If an argument is given, treat it as a topic and/or snippet name to update:

1. Locate the topic file (`$STORE/<topic>.md`) and, within it, the `## <name>` section.
2. If the target is ambiguous (name exists in multiple topics, or no topic was given), list candidates:
   ```bash
   grep -rIn '^## ' "$STORE"/*.md
   ```
   Ask the user which one (interactive), or emit `NEEDS_INPUT: which snippet should I update? (matches: <list>)` (flow context).
3. Edit the section in place, keeping the **exact** format: the `## <name>` heading, the `` `;keyword` `` line, and one fenced block. Preserve topic isolation — never move a snippet into a different topic's file as part of an edit.
4. Rebuild just that topic's JSON:
   ```bash
   # SKILL_DIR is exported by SKILL.md (the skill package root); fall back to the installed copy.
   CONV="${SKILL_DIR:-$HOME/.claude/skills/snippets}/scripts/md2snippets.py"
   python3 "$CONV" --src "$STORE" --out-dir "$STORE" "$STORE/<topic>.md"
   ```
5. Tell the user to re-import via **Raycast → Settings → Snippets → Import**.
