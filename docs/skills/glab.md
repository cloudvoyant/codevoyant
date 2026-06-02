# glab

GitLab-specific skill — CI monitoring, MR review management, and draft review publishing.

The `glab` skill owns all GitLab platform interactions: watching CI pipelines, fetching and posting inline MR discussion notes, and managing draft MRs through their full lifecycle. It provides the primitives that [`/pr`](/skills/pr) delegates to for GitLab projects.

## Installation

**Claude Code:**
```bash
npx skills add cloudvoyant/codevoyant
```

**OpenCode / VS Code Copilot:** See the [installation guide](/user-guide#installation).

## Requirements

- [`glab` CLI](https://gitlab.com/gitlab-org/cli) installed and authenticated (`glab auth login`)
- Active Git repository with a GitLab remote

## Typical Workflows

### Watch CI after a push

```bash
/glab ci                          # watch pipeline for current branch
/glab ci --branch feature/foo    # watch a specific branch
/glab ci --autofix               # fix failures and re-push automatically
```

### Run a code review

```bash
/rev new          # generate AI-powered review — calls /glab push-comments internally
/rev address      # fix review comments — calls /glab pull-comments internally
/rev complete     # publish the draft — calls /glab complete internally
```

### Manually manage an MR review

```bash
/glab pull-comments               # fetch unresolved threads to .codevoyant/review/{branch}/comments.md
/glab push-comments               # post inline notes from a review doc to the MR
/glab draft                       # post a note or toggle MR to draft state
/glab resolve-comments            # resolve MR discussion threads
/glab complete                    # publish the draft MR or approve
```

## Skills

### CI Monitor

Watch GitLab CI pipelines for the current branch. Runs in the **background** and sends a desktop notification when jobs pass or fail.

```bash
/glab ci
/glab ci --branch <name>    # watch a specific branch (default: current)
/glab ci --autofix          # fix failures and re-push (max 2 attempts)
/glab ci --silent           # suppress desktop notification
```

What happens:
1. Lists recent pipelines for the branch via `glab ci list`
2. Spawns a background agent that polls `glab ci status` until all jobs finish
3. On failure: streams logs via `glab ci trace <job-id>`
4. If `--autofix`: applies fixes, commits, pushes, re-monitors

> **Migrated from `/git ci`** — If you used `/git ci` before, use [`/gh ci`](/skills/gh) for GitHub projects and `/glab ci` for GitLab.

### Pull Comments

Fetch unresolved MR discussion threads and write them to a local document:

```bash
/glab pull-comments [mr-iid]
/glab pull-comments --output .codevoyant/review/my-feature/comments.md
```

Writes to `.codevoyant/review/{branch}/comments.md` by default. Uses the GitLab Discussions API to list all unresolved threads with file path, line, reviewer, comment body, and diff hunk.

### Push Comments

Post inline review notes from a local review document to an MR:

```bash
/glab push-comments [mr-iid]
/glab push-comments --doc .codevoyant/review/my-feature/new-review.md
```

Uses the GitLab diff position API to anchor each note at the correct file and line in the latest diff version.

### Draft

Post a general note or toggle the MR into draft state:

```bash
/glab draft [mr-iid] --body "Ready for initial review"    # post a note
/glab draft [mr-iid] --draft                              # set MR title to "Draft: ..."
```

### Resolve Comments

Resolve MR discussion threads via the GitLab API:

```bash
/glab resolve-comments [mr-iid]
/glab resolve-comments --discussion-ids <id1,id2>    # resolve specific threads only
```

### Complete

Publish a draft MR (remove "Draft:" prefix) and optionally approve:

```bash
/glab complete [mr-iid]
/glab complete --approve        # approve the MR after publishing
/glab complete --body "Addressed all feedback"
```

### List All Commands

```bash
/glab help
```
