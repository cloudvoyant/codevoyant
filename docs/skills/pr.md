# pr

AI-powered code review skill: open draft PRs/MRs, generate inline review comments, address change requests, and publish completed reviews.

## Requirements

- `gh` — [GitHub CLI](https://cli.github.com/) (`gh auth login`)
- `glab` — [GitLab CLI](https://gitlab.com/gitlab-org/cli) (`glab auth login`)

## Local vs platform (`--local`)

`open`, `review`, and `address` **draft directly on the PR/MR by default** — you review the agent's work in the GitHub/GitLab UI. Pass `--local` to instead write the work to `.codevoyant/review/{slug}/*.md` and stop, so you can read and edit it locally before anything reaches the platform. Re-run without `--local` (or `/pr publish`) to push it. Use `/pr update` to tweak whatever was produced last.

## Commands

### open — Create draft PR/MR

Create a draft PR (GitHub) or draft MR (GitLab) from the current branch with a structured template body.

```bash
/pr open                              # feature template, current branch -> main
/pr open --bug                        # bug template
/pr open --title "Add dark mode" --base develop
/pr open --local                      # write the body to a local file, don't create the PR yet
```

Aliases: `/pr create`, `/pr draft`.

The body is written in a **terse, human, junior-dev-friendly voice** — short sentences, no AI boilerplate or hype, respectful, with external references when they help. See `references/voice.md`.

### review — Generate inline review

Read a PR/MR diff and generate AI-authored inline comments. Comments are terse (see the voice guide): one or two sentences — problem, then ask — with a code suggestion where it's clearer. Severities are `BLOCKING`, `CONSIDER`, `NOTE`.

Reviews evaluate the change against its **stated intent** first — does the diff actually deliver the PR/MR's purpose end-to-end (tracing the headline use case), not just whether the code is clean? A well-formed change that fails its intent is flagged `BLOCKING`.

Runs a **dedicated slop-detector pass** in parallel: a subagent whose only job is catching AI slop and unwanted agent-introduced change — unnecessary/out-of-scope edits, stochastic churn (random renames, reordering, reformatting), verbose boilerplate, dead/debug leftovers, dependency creep. A prevalent problem with agentic coding. Its findings are prefixed `Slop:`.

```bash
/pr review                            # draft the review directly on the PR/MR
/pr review 42                         # review a specific PR/MR number
/pr review 42 --local                 # write the review to a local file for review
```

Alias: `/pr new`. By default the review is posted as a pending draft on the PR/MR; `--local` keeps it in a file.

### address — Address review comments

Pull unresolved review threads, propose and apply fixes, then respond to and **resolve** the addressed threads. Use `--local` to write proposals and stop for local review; `--no-resolve` to respond without resolving.

```bash
/pr address                           # apply fixes, respond + resolve threads
/pr address 42 --local                # write proposals locally, don't apply
/pr address 42 --no-resolve           # apply + respond, leave threads open
```

### update — Edit the last artifact

Adjust whatever `open` / `review` / `address` produced last — its PR description, review, or fix proposals. Drive it two ways: add `<!-- > … -->` (minor) / `<!-- >> … -->` (major) annotations inline to the local `.md` file, or pass a plain-language request. If the artifact was already pushed, `update` re-syncs it to the platform.

```bash
/pr update                            # apply <!-- > … --> / <!-- >> … --> annotations in the last artifact's file
/pr update "tighten the summary and drop the note on foo.ts"
/pr update --type review              # target the review specifically
```

### squash — Squash into changelog-ready commits

Collapse a branch's noisy history (WIP / fixup / "fix CI" commits) into one or more coherent commits before merging. Each result gets a conventional-commit subject and a well-organized body whose lines are hard-wrapped at 72 columns so changelog tools and `git log` render them without truncation. Defaults to a single commit; splits into a few only when the branch spans clearly separate concerns.

```bash
/pr squash                            # squash current branch onto its base
/pr squash 42                         # squash a specific PR/MR's branch
/pr squash --single                   # force exactly one commit
/pr squash --onto 2                   # force two coherent commits
/pr squash --no-push                  # rewrite locally, don't force-push
```

Rewrites via a soft reset (no interactive rebase) and force-pushes with `--force-with-lease`. A `pre-squash/<branch>` backup tag is created first (`git reset --hard pre-squash/<branch>` to undo). Commit messages never include agent self-attribution.

### publish — Publish a draft PR/MR (and its review)

The umbrella publish step. In one command it submits any **pending draft review** and marks the **draft PR/MR** ready for review — running whichever applies. Scope it with `--review-only` or `--ready-only`.

```bash
/pr publish                           # publish pending review + mark ready
/pr publish 42                        # specific PR/MR number
/pr publish --review-only             # just submit the pending review
/pr publish --ready-only              # just mark ready, leave the review as draft
/pr publish --event APPROVE           # submit the review as an approval
/pr publish --push                    # push unpushed commits first
/pr publish --yes                     # skip the confirmation prompt
```

Alias: `/pr ready`. Warns (does not block) if commits are unpushed or CI isn't green. For review-only publishing, `/pr complete` does the same as `--review-only`.

### complete — Publish draft review

Publish a pending draft **review** (the inline comments from `pr review`/`pr address`) on a PR/MR. To mark the PR/MR itself ready, use `pr publish`.

```bash
/pr complete                          # publish pending draft review for current branch
/pr complete 42                       # specific PR/MR number
/pr complete --event APPROVE          # approve
/pr complete --event REQUEST_CHANGES  # request changes
```
