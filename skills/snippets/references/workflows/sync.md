# snippets: sync workflow

Sync the snippet store with git — configure the remote if needed, then commit, pull, and push.

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

## Step 2: Determine the store's git remote

```bash
if git -C "$STORE" rev-parse --git-dir >/dev/null 2>&1; then
  REMOTE=$(git -C "$STORE" remote get-url origin 2>/dev/null || true)
else
  REMOTE=""
fi
REPO_FROM_META=$( [ -f "$META" ] && command -v jq >/dev/null 2>&1 && jq -r '.snippetRepo // empty' "$META" )
```

## Step 3: Configure the repo if no remote is set

If there is no `origin` remote:

1. Prefer `snippetRepo` from `~/.codevoyant/meta.json` if present. Otherwise:
   - **Interactive:** ask the user for the repo URL.
   - **Flow context:** emit `NEEDS_INPUT: what git repo URL should the snippet store sync to?` and stop.
2. Persist it to `~/.codevoyant/meta.json` under `snippetRepo` (create the file if absent, valid JSON):
   ```bash
   REPO_URL="<the-url>"
   tmp=$(mktemp)
   if [ -f "$META" ]; then
     jq --arg r "$REPO_URL" '.snippetRepo = $r' "$META" > "$tmp" && mv "$tmp" "$META"
   else
     printf '{\n  "snippetRepo": "%s"\n}\n' "$REPO_URL" > "$META"
   fi
   ```
3. Initialize the store repo (if not already one) and wire the remote:
   ```bash
   git -C "$STORE" rev-parse --git-dir >/dev/null 2>&1 || git -C "$STORE" init -b main
   git -C "$STORE" remote get-url origin >/dev/null 2>&1 || git -C "$STORE" remote add origin "$REPO_URL"
   ```

## Step 4: Commit, pull, push

```bash
git -C "$STORE" add -A
git -C "$STORE" diff --cached --quiet || git -C "$STORE" commit -m "chore(snippets): sync store"
BR=$(git -C "$STORE" rev-parse --abbrev-ref HEAD 2>/dev/null); BR="${BR:-main}"
git -C "$STORE" pull --rebase origin "$BR" 2>/dev/null || true
git -C "$STORE" push -u origin "$BR"
```

If `pull --rebase` reports conflicts, stop and ask the user to resolve them rather than force-pushing.

Report the result (committed / pushed / already up to date).
