# pr

AI-powered code review skill: open draft PRs/MRs, generate inline review comments, address change requests, and publish completed reviews.

## Requirements

- `gh` — [GitHub CLI](https://cli.github.com/) (`gh auth login`)
- `glab` — [GitLab CLI](https://gitlab.com/gitlab-org/cli) (`glab auth login`)

## Commands

### open — Create draft PR/MR

Create a draft PR (GitHub) or draft MR (GitLab) from the current branch with a structured template body.

```bash
/pr open                              # feature template, current branch -> main
/pr open --bug                        # bug template
/pr open --title "Add dark mode" --base develop
```

Aliases: `/pr create`, `/pr draft`.

### review — Generate inline review

Read a PR/MR diff and generate AI-authored inline comments.

```bash
/pr review                            # auto-detects PR/MR from current branch
/pr review 42                         # review a specific PR/MR number
/pr review 42 --name auth-refactor    # save session under a custom slug
```

Alias: `/pr new`.

### address — Address review comments

Pull unresolved review threads and work through them interactively, proposing and applying fixes.

```bash
/pr address                           # current branch PR/MR
/pr address 42                        # specific PR/MR number
/pr address 42 --name auth-refactor   # pick up an existing named session
```

### complete — Publish draft review

Publish a pending draft review or convert a draft PR/MR to ready-for-review.

```bash
/pr complete                          # publish pending draft for current branch
/pr complete 42                       # specific PR/MR number
/pr complete --event APPROVE          # approve
/pr complete --event REQUEST_CHANGES  # request changes
```
