# snippets: get workflow

Find a snippet by searching the store's markdown files — matching on keyword, name, or body — and print it.

## Step 1: Resolve the store

```bash
META="$HOME/.codevoyant/meta.json"
if [ -f "$META" ] && command -v jq >/dev/null 2>&1; then
  STORE=$(jq -r '.snippetDir // empty' "$META")
fi
STORE="${STORE:-$HOME/.codevoyant/snippets}"
STORE="${STORE/#\~/$HOME}"
```

## Step 2: Search

`QUERY` = `$REMAINING_ARGS` (trimmed). If empty, list every snippet's topic / name / keyword and stop.

Scan each `## <name>` section in every `$STORE/*.md`, and print any whose **keyword**, **name**, or **body** contains `QUERY` (case-insensitive). One `awk` pass per file keeps this dependency-free:

```bash
QUERY="$REMAINING_ARGS"
for f in "$STORE"/*.md; do
  [ -e "$f" ] || continue
  topic=$(basename "$f" .md)
  awk -v q="$QUERY" -v topic="$topic" '
    function flush() {
      if (name != "" && (index(tolower(name) , tolower(q)) || index(tolower(keyword), tolower(q)) || index(tolower(body), tolower(q)))) {
        printf("=== %s / %s  (%s) ===\n%s\n\n", topic, name, keyword, body)
      }
      name=""; keyword=""; body=""
    }
    /^## /      { flush(); name=substr($0,4) }
    /^`;[^`]*`/ { if (!infence) { kw=$0; gsub(/`/,"",kw); keyword=kw } }
    /^```/      { infence = !infence; next }
    infence     { body = (body=="" ? $0 : body "\n" $0) }
    END         { flush() }
  ' "$f"
done
```

## Step 3: Report

- If matches were found, they are already printed (topic / name / keyword header + body).
- If none matched, tell the user no snippet matched `QUERY` and suggest `/snippets get` with no argument to list everything.
