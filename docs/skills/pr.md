# pr

AI-powered code review skill: open draft PRs/MRs, generate inline review comments, address change requests, publish completed reviews, and merge the PR/MR.

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

The description **opens with a clear intent** — one plain-language paragraph, derived from BOTH the diff AND any spec plan executed on the branch (matched by the plan's branch), saying what the branch sets out to do and why. When no spec plan is on the branch, the intent comes from the diff alone. The body is written in a **terse, human, junior-dev-friendly voice** — short sentences, no AI boilerplate or hype, respectful, with external references when they help. See `references/voice.md`.

### review — Generate inline review

Read a PR/MR diff and generate AI-authored inline comments. Comments are terse (see the voice guide): one or two sentences — problem, then ask — with a code suggestion where it's clearer. Severities are `BLOCKING`, `CONSIDER`, `NOTE`.

Reviews evaluate the change against its **stated intent** first — does the diff actually deliver the PR/MR's purpose end-to-end (tracing the headline use case), not just whether the code is clean? A well-formed change that fails its intent is flagged `BLOCKING`.

Assesses the change with **four subagents in parallel**, one per dimension, then merges their findings into one review:

- **Intent-match** — does the diff deliver the stated intent (from the description, linked issue, or executed spec plan) end-to-end? A well-formed change that fails its intent is `BLOCKING`.
- **Unnecessary changes** — a dedicated **slop-detector**: scope creep, stray edits, dead/commented code, accidental reverts, stochastic churn (random renames, reordering, reformatting), boilerplate, debug leftovers, dependency creep. Findings prefixed `Slop:`. A prevalent problem with agentic coding.
- **Code quality** — a **code-quality-auditor** judges the added/edited code against the relevant codevoyant skill (`typescript`, `python`, `react`, `svelte`, `sveltekit`, …) or the language/framework standard. Findings prefixed `Quality:`.
- **Docs freshness** — a **docs-freshness-checker** decides whether docs should have been updated. By default review stays read-only: stale docs are reported as a `Docs:` finding recommending `/docs update`. Pass `--update-docs` to opt in to having the pass run `/docs update` and refresh docs during the review. Findings prefixed `Docs:`.

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

Alias: `/pr ready`. Warns (does not block) if commits are unpushed or CI isn't green. To publish only the pending draft **review** (the inline comments from `pr review`/`pr address`) and leave the PR/MR itself a draft, use `/pr publish --review-only`.

### merge — Merge the PR/MR

Merge the current-branch PR/MR (or a specific `pr-id`) via `gh pr merge` / `glab mr merge`. Squash by default, with `--rebase`/`--merge`. Pre-flight **hard-blocks** on a draft or merge conflicts, and **warns** (without blocking) on non-green CI or unpushed commits (offer `--push`).

It's **semantic-release aware**: for a squash merge onto the release branch (`main`), the squashed commit's subject becomes the release trigger, so `merge` ensures that subject is a conventional-commit line — using `--subject`, the PR title if it already qualifies, or a derived candidate you confirm — so a release is never silently skipped. Non-squash methods and non-release bases skip this guard.

```bash
/pr merge                             # squash-merge the current-branch PR/MR
/pr merge 42                          # specific PR/MR number
/pr merge --rebase                    # rebase merge
/pr merge --merge                     # merge commit (no squash)
/pr merge --delete-branch             # delete the source branch after merge
/pr merge --subject "feat: add merge" # supply the squash commit subject
/pr merge --yes                       # skip confirmation and subject prompt
```

Alias: `/pr land`. Reports the merge commit SHA and resulting state.
