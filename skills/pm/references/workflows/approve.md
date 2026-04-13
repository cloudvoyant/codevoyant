# approve

## Critical Rules

- Always run pm review before promoting — do not skip
- The draft in `.codevoyant/roadmaps/` remains after promotion (source of truth for history)
- Research artifacts from `.codevoyant/explore/{slug}/` and `.codevoyant/plans/{slug}/research/` are both copied flat into `docs/product/roadmaps/{slug}/research/`
- Linear sync is always optional and always last
- Never force-overwrite an existing committed roadmap without user confirmation
- pm approve may create or update Linear **initiatives** only. Never create Linear projects — that is em approve's responsibility.

## Step 0: Parse arguments

```bash
SLUG="${1:-}"
LINEAR_SYNC=false; LINEAR_URL=""; SILENT=false
if [[ "$*" =~ --push ]]; then
  LINEAR_SYNC=true
  # Capture optional URL immediately following --push
  if [[ "$*" =~ --push[[:space:]]+(https://linear\.app/[^[:space:]]+) ]]; then
    LINEAR_URL="${BASH_REMATCH[1]}"
  fi
fi
[[ "$*" =~ --silent ]] && SILENT=true
```

### Detect artifact type

```bash
# Detect artifact type from SLUG or interactive selection
# Roadmap drafts: .codevoyant/roadmaps/*.md
# PRD drafts:     .codevoyant/prds/{slug}/{slug}.md
if [ -n "$SLUG" ] && ls .codevoyant/prds/"$SLUG"/"$SLUG".md 2>/dev/null; then
  ARTIFACT_TYPE="prd"
elif [ -n "$SLUG" ] && ls .codevoyant/roadmaps/*"$SLUG"*.md 2>/dev/null; then
  ARTIFACT_TYPE="roadmap"
else
  ARTIFACT_TYPE=""  # ask in Step 1
fi
```

If ARTIFACT_TYPE is empty, ask:

```
AskUserQuestion:
  question: "What do you want to approve?"
  header: "Artifact type"
  options:
    - label: "Roadmap — .codevoyant/roadmaps/"
    - label: "PRD — .codevoyant/prds/"
```

Set ARTIFACT_TYPE to "roadmap" or "prd" based on the user's choice.

**If ARTIFACT_TYPE is "roadmap":** proceed with the Roadmap flow (Steps 1–6 below).

**If ARTIFACT_TYPE is "prd":** skip to the PRD flow (Steps 1P–6P below).

---

## Roadmap Flow

## Step 1: Locate draft

If SLUG provided, resolve to `.codevoyant/roadmaps/{SLUG}.md` or the most recent file matching `*{SLUG}*`.

If no SLUG, list files in `.codevoyant/roadmaps/` sorted by modification time and ask:

```
AskUserQuestion:
  question: "Which draft roadmap do you want to approve?"
  header: "Draft"
  options:
    - label: "Most recent draft"
    - label: "I'll specify the filename"
```

Read the selected roadmap. Set DRAFT_PATH and FILENAME.

Parse DATE and TIMESCALE from FILENAME:

```bash
# e.g. "260322-half-roadmap.md" → DATE=260322, TIMESCALE=half
if [[ "$FILENAME" =~ ^([0-9]{6})-([a-z]+)-roadmap ]]; then
  DATE="${BASH_REMATCH[1]}"
  TIMESCALE="${BASH_REMATCH[2]}"
else
  DATE=$(date +%y%m%d)
  TIMESCALE="roadmap"
fi
COMMIT_DIR="docs/product/${DATE}-${TIMESCALE}"
```

## Step 2: Run pm review

Run `/pm review` on the draft. If critical issues are found, surface them and ask:

```
AskUserQuestion:
  question: "pm review found critical issues. How do you want to proceed?"
  header: "Review result"
  options:
    - label: "Fix issues first (use pm update)"
    - label: "Approve anyway — I'll address issues later"
    - label: "Cancel"
```

If fix or cancel, stop here.

## Step 3: Confirm promotion

COMMIT_DIR was set in Step 0 (e.g. `docs/product/260322-half/`).

Check if COMMIT_DIR already exists. If it does, warn:

```
AskUserQuestion:
  question: "A committed roadmap already exists at {COMMIT_DIR}. Overwrite?"
  header: "Overwrite?"
  options:
    - label: "Yes — overwrite"
    - label: "Save as new version (add -v2 suffix to dir name)"
    - label: "Cancel"
```

Ask for final confirmation:

```
AskUserQuestion:
  question: "Promote draft to {COMMIT_DIR}?"
  header: "Confirm promotion"
  options:
    - label: "Promote"
    - label: "Cancel"
```

## Step 4: Promote

```bash
mkdir -p "{COMMIT_DIR}"
cp "$DRAFT_PATH" "{COMMIT_DIR}/roadmap.md"

# Sources: .codevoyant/explore/{SLUG}/ and .codevoyant/plans/{SLUG}/research/ (if present)
EXPLORE_DIR=".codevoyant/explore/{SLUG}"
RESEARCH_DIR=".codevoyant/plans/{SLUG}/research"
if { [ -d "$EXPLORE_DIR" ] && [ "$(ls -A $EXPLORE_DIR 2>/dev/null)" ]; } || \
   { [ -d "$RESEARCH_DIR" ] && [ "$(ls -A $RESEARCH_DIR 2>/dev/null)" ]; }; then
  mkdir -p "{COMMIT_DIR}/research"
  [ -d "$EXPLORE_DIR"  ] && cp "$EXPLORE_DIR/"*.md  "{COMMIT_DIR}/research/" 2>/dev/null
  [ -d "$RESEARCH_DIR" ] && cp "$RESEARCH_DIR/"*.md "{COMMIT_DIR}/research/" 2>/dev/null
fi
```

Update agent-kit status:

```bash
npx @codevoyant/agent-kit plans update-status --name "{DATE}-{TIMESCALE}" --status Approved
```

Report: "Roadmap promoted to `{COMMIT_DIR}/roadmap.md`."

## Step 5: Linear sync (optional)

If `--push` flag not passed, ask:

```
AskUserQuestion:
  question: "Sync this roadmap to Linear?"
  header: "Linear sync"
  options:
    - label: "Yes — create a new Linear initiative"
    - label: "Yes — use an existing initiative (I'll provide the URL)"
    - label: "No — skip Linear sync"
```

If "use an existing initiative", ask:

```
AskUserQuestion:
  question: "Paste the Linear initiative URL:"
  header: "Initiative URL"
  freeform: true
```

Set LINEAR_URL to the provided value.

If not syncing, skip to Step 6.

### 5a: Resolve the initiative

**If LINEAR_URL is provided:**
- Extract the initiative slug from the URL (last path segment before any trailing slash)
- Call `mcp__claude_ai_Linear__get_initiative` to verify it exists
- Call `mcp__claude_ai_Linear__save_initiative` to update its description with the roadmap content

**If LINEAR_URL is empty (create new):**
- Call `mcp__claude_ai_Linear__save_initiative` with `name` = roadmap title (from first H1) and `description` = roadmap content
- Note the returned initiative URL as LINEAR_URL

### 5b: Upload research artifacts as initiative documents

> **Important:** `mcp__claude_ai_Linear__create_document` does NOT support `initiativeId`. Use the browser-first pattern below for each research file.

Collect research files to upload:
- `{COMMIT_DIR}/research/*.md` (all files copied in Step 4)

For each research file:

1. **Browser navigate** to the initiative overview page (LINEAR_URL + `/overview` if not already there)
2. **Browser click** "Add document or link..." button (use `find` tool with query "Add document or link")
3. **Browser click** "Create new document..." from the dropdown
   - Wait for the tab URL to change to `/document/untitled-{slug}` — this confirms the blank doc is linked to the initiative
   - If URL does not change within ~3 seconds, retry the click once. If still no change, log the failure and skip this file.
4. **Extract slug** from the tab URL (the part after `/document/`)
5. **Immediately** call `mcp__claude_ai_Linear__update_document`:
   - `id`: extracted slug
   - `title`: humanised filename (e.g. `market` → `Research: Market Validation`)
   - `content`: file content — **strip all local markdown links** before uploading: replace `[text](./path)`, `[text](../path)`, and `[text](relative/path)` with just `text` (keep the link text, discard the URL). Absolute `https://` links are safe to keep.
   - Do this BEFORE navigating away — blank docs are garbage-collected on navigation
6. **JS-navigate** back to initiative: execute `window.location.href = '{LINEAR_URL}/overview'` via browser javascript tool (bypasses "Leave site?" dialog)
7. Repeat for next file

Report each uploaded document title or failure.

## Step 6: Notify

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify \
    --title "pm approve complete" \
    --message "Roadmap committed to {COMMIT_DIR}"
fi
```

Report: "Done. Roadmap is at `{COMMIT_DIR}/roadmap.md`. Research at `{COMMIT_DIR}/research/`."

---

## PRD Flow

## Step 1P: Locate draft

If SLUG provided, resolve to `.codevoyant/prds/{SLUG}/{SLUG}.md`.

If no SLUG, list directories in `.codevoyant/prds/` sorted by modification time and ask:

```
AskUserQuestion:
  question: "Which draft PRD do you want to approve?"
  header: "Draft PRD"
  options:
    - label: "Most recent draft"
    - label: "I'll specify the slug"
```

Read the selected PRD. Set DRAFT_PATH and SLUG.

## Step 2P: Skip review

PRDs use the pm prd quality checkpoint inline (Step 4 of pm prd). No separate review step needed.

## Step 3P: Confirm promotion

```bash
COMMIT_DIR="docs/prd/${SLUG}"
```

Check if COMMIT_DIR already exists. If it does, warn:

```
AskUserQuestion:
  question: "A committed PRD already exists at {COMMIT_DIR}. Overwrite?"
  header: "Overwrite?"
  options:
    - label: "Yes — overwrite"
    - label: "Save as new version (add -v2 suffix to dir name)"
    - label: "Cancel"
```

Ask for final confirmation:

```
AskUserQuestion:
  question: "Promote PRD draft to {COMMIT_DIR}?"
  header: "Confirm promotion"
  options:
    - label: "Promote"
    - label: "Cancel"
```

## Step 4P: Promote

```bash
mkdir -p "docs/prd/${SLUG}/research"
cp ".codevoyant/prds/${SLUG}/${SLUG}.md" "docs/prd/${SLUG}/${SLUG}.md"
# Copy research from explore dir if present
if [ -d ".codevoyant/explore/${SLUG}" ]; then
  cp ".codevoyant/explore/${SLUG}/summary.md" "docs/prd/${SLUG}/research/" 2>/dev/null || true
  cp ".codevoyant/explore/${SLUG}/research/"*.md "docs/prd/${SLUG}/research/" 2>/dev/null || true
fi
```

Update agent-kit status:

```bash
npx @codevoyant/agent-kit plans update-status --name "${SLUG}-prd" --status Approved
```

Report: "PRD promoted to `docs/prd/{SLUG}/{SLUG}.md`."

## Step 5P: Linear sync (optional)

If `--push` flag not passed, ask:

```
AskUserQuestion:
  question: "Sync this PRD to Linear?"
  header: "Linear sync"
  options:
    - label: "Yes — attach to an existing initiative (I'll provide the URL)"
    - label: "No — skip Linear sync"
```

If "attach to an existing initiative", ask:

```
AskUserQuestion:
  question: "Paste the Linear initiative URL:"
  header: "Initiative URL"
  freeform: true
```

Set LINEAR_URL to the provided value.

If not syncing, skip to Step 6P.

### 5Pa: Upload PRD as initiative document

Upload the PRD as a Linear document using the browser-first pattern:

1. **Browser navigate** to the initiative overview page (LINEAR_URL + `/overview` if not already there)
2. **Browser click** "Add document or link..." button (use `find` tool with query "Add document or link")
3. **Browser click** "Create new document..." from the dropdown
   - Wait for the tab URL to change to `/document/untitled-{slug}` — this confirms the blank doc is linked to the initiative
   - If URL does not change within ~3 seconds, retry the click once. If still no change, log the failure and skip.
4. **Extract slug** from the tab URL (the part after `/document/`)
5. **Immediately** call `mcp__claude_ai_Linear__update_document`:
   - `id`: extracted slug
   - `title`: humanised feature name from SLUG (e.g. slug "persistent-memory" -> "Persistent Memory") — never a generic title like "PRD" or "prd.md"
   - `content`: PRD file content — **strip all local markdown links** before uploading: replace `[text](./path)`, `[text](../path)`, and `[text](relative/path)` with just `text` (keep the link text, discard the URL). Absolute `https://` links are safe to keep.
   - Do this BEFORE navigating away — blank docs are garbage-collected on navigation
6. **JS-navigate** back to initiative: execute `window.location.href = '{LINEAR_URL}/overview'` via browser javascript tool

Report uploaded document title or failure.

## Step 6P: Notify

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify \
    --title "pm approve complete" \
    --message "PRD committed to docs/prd/${SLUG}/${SLUG}.md"
fi
```

Report: "Done. PRD is at `docs/prd/{SLUG}/{SLUG}.md`. Research at `docs/prd/{SLUG}/research/`."
