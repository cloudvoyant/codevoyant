---
description: "Use when a PR or MR has review comments needing attention. Triggers on: \"pr fix\", \"fix review comments\", \"address pr feedback\", \"fix change requests\", \"respond to review\", \"mr fix\". Fetches open change requests and proposes fixes. Works with both GitHub and GitLab."
argument-hint: "[pr-id] [--github|--gitlab] [--silent]"
disable-model-invocation: true
model: claude-sonnet-4-6
---

> **Compatibility**: If `AskUserQuestion` is unavailable, present options as a numbered list and wait for the user's reply. If `Task` is unavailable, run parallel steps sequentially. On OpenCode, interpret `Agent:` blocks as `Task:` tool invocations (spawns a child session instead of a true background process).


## Arguments

- `pr-id` (optional positional): PR/MR number to fix. If omitted, processes all open PRs/MRs with pending review comments.
- `--github` / `--gitlab`: Override auto-detected provider
- `--silent`: Suppress desktop notification on completion

## Step 0: Detect Provider and Parse Arguments

Check arguments for `pr-id` (optional) and `--github`/`--gitlab` override flags.

Auto-detect provider from git remote:
- `git remote get-url origin` → contains "github" → PROVIDER=github
- contains "gitlab" → PROVIDER=gitlab
- Override with `--github` or `--gitlab` flags

Parse `--silent` flag: if present, set `SILENT=true`, else `SILENT=false`.

Store: `PROVIDER`, `TARGET_PR` (specific PR ID or empty for all), `SILENT`.

## Step 1: List Open PRs/MRs with Pending Reviews

**GitHub:**
```bash
gh pr list --state open --json number,title,headRefName,baseRefName,author,url
# For each PR, check for review threads:
gh pr view {number} --json reviewThreads --jq '.reviewThreads[] | select(.isResolved==false)'
```

**GitLab:**
```bash
glab mr list --state opened --output json
# For each MR with threads:
glab mr note list {number} --output json  # or: glab api projects/:id/merge_requests/{iid}/discussions
```

If `TARGET_PR` is set, only fetch that PR/MR. Otherwise list all open ones with unresolved review threads.

Filter to only PRs/MRs that have **unresolved review comments** or **change requests** (requested changes review state). Skip if none found, report: "No open PRs with pending review comments found."

## Step 2: Create PR Documents

Create `.codevoyant/pr-fix/` directory if it doesn't exist.

For each PR/MR with unresolved threads, create `.codevoyant/pr-fix/{pr-id}.md`:

**GitHub** — fetch full review data:
```bash
gh pr view {number} --json number,title,headRefName,baseRefName,author,url,reviewThreads,reviews
gh pr diff {number}  # for code context
```

**GitLab** — fetch MR notes/discussions:
```bash
glab mr view {number} --output json
glab api "projects/:id/merge_requests/{iid}/discussions"
```

Document format — use the template in `references/pr-document-template.md`.

Report: `✓ Created .codevoyant/pr-fix/{pr-id}.md — {N} change request(s)`

## Step 3: Launch Parallel Fixer Agents

For each created document, launch a Task agent in parallel (`run_in_background: true`, `model: claude-sonnet-4-6`):

```
Agent:
  description: "pr-fix: propose fixes for PR #{id}"
  run_in_background: true
  prompt: |
    Read .codevoyant/pr-fix/{pr-id}.md to understand the change requests.
    For each change request:
    1. Read the referenced file and line numbers from the repository
    2. Understand what the reviewer is asking for
    3. Write a concrete proposed fix in the "## Proposed Fixes" section of the document

    Each fix should include:
    - The action to take (what to change and why)
    - The exact code change (diff or replacement snippet)
    - Any caveats or things to verify

    Do NOT apply fixes to the actual code — only write proposals into the document.
    Keep proposals terse and actionable.
```

Wait for all agents with `TaskOutput(block=true)`.

After all agents complete, unless `SILENT=true`, use the Bash tool to send a desktop notification:

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify --title "Claude Code — PR Fix" --message "PR fix proposals ready — {N} PR(s), {N} change requests"
fi
```

## Step 4: Report

```
✓ PR fix proposals ready

  PR #{id}: {title}
    .codevoyant/pr-fix/{pr-id}.md — {N} change requests, {N} proposals written

  PR #{id}: {title}
    .codevoyant/pr-fix/{pr-id}.md — {N} change requests, {N} proposals written

To apply fixes:
  "Read .codevoyant/pr-fix/{pr-id}.md and apply every fix in the Proposed Fixes section."

To update GitHub/GitLab with a response:
  /dev:ci  (or push a fix commit and it triggers review)
```
