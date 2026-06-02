# draft

Post a draft note on an MR, or toggle the MR itself into Draft state. GitLab has no separate pending-review concept, so this workflow either creates a regular note or flips the MR title prefix.

## Arguments

- `MR_IID` (optional positional) — defaults to MR for current branch
- `--body <text>` — note body (optional)
- `--draft` — toggle MR to Draft state (prepends `Draft:` to title)

## Step 1: Verify `glab` CLI

```bash
command -v glab >/dev/null 2>&1 || { echo "glab not installed. Run: brew install glab"; exit 1; }
glab auth status >/dev/null 2>&1 || { echo "glab not authenticated. Run: glab auth login"; exit 1; }
```

## Step 2: Resolve MR

Detect `MR_IID` from branch if not given (see `pull-comments.md` Step 2).

## Step 3: Post Note (if `--body`)

```bash
glab mr note "${MR_IID}" --message "${BODY}"
```

## Step 4: Toggle Draft State (if `--draft`)

Read current title:

```bash
TITLE=$(glab api "projects/:id/merge_requests/${MR_IID}" --jq '.title')
```

If `TITLE` already starts with `Draft:` or `WIP:`, skip and note `MR !{iid} is already a draft.`

Otherwise:

```bash
glab api "projects/:id/merge_requests/${MR_IID}" \
  --method PUT --field "title=Draft: ${TITLE}"
```

## Step 5: Report

- If `--body` only: `✓ Note posted to MR !{MR_IID}.`
- If `--draft` only: `✓ MR !{MR_IID} set to Draft.`
- If both: both lines.

## Error Handling

- **Neither `--body` nor `--draft`:** report usage and exit
- **No MR for branch:** caught in Step 2
