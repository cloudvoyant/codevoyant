# snippets: add workflow

Add one or more new snippets into the correct topic `.md`, then rebuild that topic's `.json`.

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

## Step 2: Collect the snippet

From `$REMAINING_ARGS` gather:

- **topic** — the language/framework/topic file to add to (e.g. `bash`, `rust`, `mise`). Optional; resolved in Step 3.
- **name** — the `## <name>` heading (human-readable title).
- **keyword** — the Raycast expansion keyword. Normalize to start with exactly one `;` (add it if the user omitted it).
- **body** — the snippet text that goes inside the fenced code block. Preserve it verbatim, including `{cursor}` / `{clipboard}` Raycast placeholders.
- **lang** (optional) — fenced-block language hint; default to the topic name.

If name, keyword, or body is missing and cannot be inferred from the request, ask the user for the missing field (interactive) or surface `NEEDS_INPUT: {the missing field}` (flow context).

## Step 3: Resolve the target topic (ask / NEEDS_INPUT when ambiguous)

Snippets are **topic-isolated** — a snippet goes in the file for its language/framework/topic.

1. If a topic was given explicitly, use `$STORE/<topic>.md`.
2. Else infer it from the snippet's language/subject when it is unambiguous (e.g. a `cargo` command → `cargo.md`).
3. Else it is **ambiguous**. List the existing topics:
   ```bash
   ls "$STORE"/*.md 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/\.md$//'
   ```
   - **Interactive (direct user invocation):** ask the user which collection to add to (offer the existing topics plus "create a new topic <name>").
   - **Flow / non-interactive context:** stop and emit exactly:
     ```
     NEEDS_INPUT: which snippet collection should "<name>" go into? (existing: <list>)
     ```

Set `TOPIC` and `TARGET="$STORE/$TOPIC.md"`.

## Step 4: Ensure the topic file is well-formed, then append the snippet

If `$TARGET` does not exist, create it with a minimal valid header:

```markdown
---
tags: [snippets, <topic>]
---

# <topic>
```

Append a new section in the **exact** format the converter requires — a `## <name>` heading, a line containing exactly `` `;keyword` ``, then a fenced block whose contents are the body:

~~~markdown

## <name>

`;keyword`

```<lang>
<body>
```
~~~

Enforcement rules (so `md2snippets.py` parses cleanly):
- The keyword line is backtick-wrapped and starts with a single `;` — nothing else on the line.
- Exactly one fenced block per section; do not leave it unterminated.
- Keep the optional keyword→snippet table (if the file has one) in sync by adding a `| `;keyword` | [[#<name>]] |` row.
- Do not put a snippet for one topic into another topic's file.

## Step 5: Rebuild that topic's JSON

```bash
# SKILL_DIR is exported by SKILL.md (the skill package root); fall back to the installed copy.
CONV="${SKILL_DIR:-$HOME/.claude/skills/snippets}/scripts/md2snippets.py"
python3 "$CONV" --src "$STORE" --out-dir "$STORE" "$TARGET"
```

(The converter writes `<topic>.json` beside `<topic>.md`.) If the converter reports a parse error, fix the section to match Step 4 and re-run.

## Step 6: Tell the user to re-import

Report the added snippet(s) and instruct:

> Re-import into Raycast: **Raycast → Settings → Snippets → Import** and select `<topic>.json`.
