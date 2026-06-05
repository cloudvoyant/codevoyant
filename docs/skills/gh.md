# gh

GitHub skill — wraps the `gh` CLI to monitor CI pipelines, manage PR review comments, and publish draft reviews.

## Requirements

- `gh` CLI — [cli.github.com](https://cli.github.com/) — authenticate with `gh auth login`

## Commands

### ci — watch GitHub Actions

Watch GitHub Actions pipelines for the current branch and notify on pass or fail.

```bash
/gh ci                        # watch Actions for current branch
/gh ci --branch <name>        # watch a specific branch
/gh ci --autofix              # fix failures and re-push automatically
/gh ci --silent               # suppress desktop notification
```

### pull-comments — fetch PR review threads

Fetch unresolved PR review threads and write them to a local document.

```bash
/gh pull-comments [pr-number]                                    # fetch to default path
/gh pull-comments --output .codevoyant/review/my-feature/comments.md
```

### push-comments — post inline review comments

Post inline review comments from a local review document to a PR as a pending draft review.

```bash
/gh push-comments [pr-number]                                    # read from default doc
/gh push-comments --doc .codevoyant/review/my-feature/new-review.md
```

### draft — create or update a pending review

Create or update a pending (unpublished) PR review body.

```bash
/gh draft [pr-number]
/gh draft --body "Overall: looks good, one blocking issue"
/gh draft --review-id <id>    # update an existing pending review
```

### resolve-comments — mark threads resolved

Mark PR review threads as resolved via the GitHub GraphQL API.

```bash
/gh resolve-comments [pr-number]
/gh resolve-comments --thread-ids <id1,id2>    # resolve specific threads only
```

### complete — publish a draft review

Publish a pending draft PR review.

```bash
/gh complete [pr-number]
/gh complete --event APPROVE             # approve the PR
/gh complete --event REQUEST_CHANGES     # request changes
/gh complete --event COMMENT             # comment only (default)
/gh complete --body "LGTM after fixes"
```

### report-issue — create a GitHub issue

Create a GitHub issue from a bug report or QA report file.

```bash
/gh report-issue --title "Login crashes on Safari 17"
/gh report-issue --from .codevoyant/qa/login-crash/debug-report.md
```

### retcon — propose commit message edits

**`/gh retcon`** — propose commit message edits for the current branch's open PR; delegates to `/changelog retcon`.

```bash
/gh retcon                  # propose edits for the current PR
/gh retcon --apply          # apply edits via rebase and force-push
```

### help — list all commands

```bash
/gh help
```

## References

- [GitHub CLI documentation](https://cli.github.com/manual/)
- [GitHub REST API — Pull Requests](https://docs.github.com/en/rest/pulls)
