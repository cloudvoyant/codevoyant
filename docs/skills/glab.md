# glab

GitLab skill — wraps the `glab` CLI to monitor CI pipelines, manage MR review comments, and publish draft reviews.

## Requirements

- `glab` CLI — [gitlab.com/gitlab-org/cli](https://gitlab.com/gitlab-org/cli) — authenticate with `glab auth login`

## Commands

### ci — watch GitLab CI

Watch GitLab CI pipelines for the current branch and notify on pass or fail.

```bash
/glab ci                        # watch pipeline for current branch
/glab ci --branch <name>        # watch a specific branch
/glab ci --autofix              # fix failures and re-push automatically
/glab ci --silent               # suppress desktop notification
```

### pull-comments — fetch MR discussion threads

Fetch unresolved MR discussion threads and write them to a local document.

```bash
/glab pull-comments [mr-iid]
/glab pull-comments --output .codevoyant/review/my-feature/comments.md
```

### push-comments — post inline review notes

Post inline review notes from a local review document to an MR using the GitLab diff position API.

```bash
/glab push-comments [mr-iid]
/glab push-comments --doc .codevoyant/review/my-feature/new-review.md
```

### draft — post a note or toggle draft state

Post a general note or toggle the MR into draft state.

```bash
/glab draft [mr-iid] --body "Ready for initial review"    # post a note
/glab draft [mr-iid] --draft                              # set MR title to "Draft: ..."
```

### resolve-comments — resolve MR discussion threads

Resolve MR discussion threads via the GitLab API.

```bash
/glab resolve-comments [mr-iid]
/glab resolve-comments --discussion-ids <id1,id2>    # resolve specific threads only
```

### complete — publish a draft MR

Remove the "Draft:" prefix and optionally approve the MR.

```bash
/glab complete [mr-iid]
/glab complete --approve                          # approve after publishing
/glab complete --body "Addressed all feedback"
```

### report-issue — create a GitLab issue

Create a GitLab issue from a bug report or QA report file.

```bash
/glab report-issue --title "Login crashes on Safari 17"
/glab report-issue --from .codevoyant/qa/login-crash/debug-report.md
```

### help — list all commands

```bash
/glab help
```

## References

- [GitLab CLI documentation](https://gitlab.com/gitlab-org/cli/-/tree/main/docs)
- [GitLab REST API — Merge Requests](https://docs.gitlab.com/ee/api/merge_requests.html)
