# complete

Publish a draft MR (strip the `Draft:` prefix) and optionally approve and/or post a summary note.

## Arguments

- `MR_IID` (optional positional) — defaults to MR for current branch
- `--body <text>` — final summary note (optional)
- `--approve` — also approve the MR

## Step 1: Verify `glab` CLI

```bash
command -v glab >/dev/null 2>&1 || { echo "glab not installed. Run: brew install glab"; exit 1; }
glab auth status >/dev/null 2>&1 || { echo "glab not authenticated. Run: glab auth login"; exit 1; }
```

## Step 2: Resolve MR

Detect `MR_IID` from branch if not given (see `pull-comments.md` Step 2).

## Step 3: Strip Draft Prefix

Read current title:

```bash
TITLE=$(glab api "projects/:id/merge_requests/${MR_IID}" --jq '.title')
```

If `TITLE` starts with `Draft:` or `WIP:`, strip the prefix and update:

```bash
NEW_TITLE="${TITLE#Draft: }"
NEW_TITLE="${NEW_TITLE#WIP: }"

glab api "projects/:id/merge_requests/${MR_IID}" \
  --method PUT --field "title=${NEW_TITLE}"
```

Otherwise note `MR !{iid} is not a draft.` and continue.

## Step 4: Approve (if `--approve`)

```bash
glab mr approve "${MR_IID}"
```

## Step 5: Post Summary Note (if `--body`)

```bash
glab mr note "${MR_IID}" --message "${BODY}"
```

## Step 6: Report

```
✓ MR !{MR_IID} published. {mr-url}
```

Fetch the URL via `glab api "projects/:id/merge_requests/${MR_IID}" --jq .web_url`.

## Error Handling

- **MR already merged/closed:** surface state and exit
- **Approval not permitted:** surface the API error
