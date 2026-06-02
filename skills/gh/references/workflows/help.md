# gh — GitHub Workflows

| Command | Description |
|---|---|
| `/gh ci [--branch <name>] [--autofix] [--silent]` | Watch GitHub Actions CI for a branch |
| `/gh pull-comments [pr] [--output <path>]` | Fetch unresolved PR review threads to a doc |
| `/gh push-comments [pr] [--doc <path>]` | Submit inline comments from a doc to a PR |
| `/gh draft [pr] [--body <text>] [--review-id <id>]` | Create or update a pending draft review |
| `/gh resolve-comments [pr] [--thread-ids <ids>]` | Mark review threads resolved |
| `/gh complete [pr] [--event APPROVE|REQUEST_CHANGES|COMMENT]` | Publish a pending draft review |
| `/gh help` | Print this reference |

## Requirements
- `gh` CLI installed and authenticated (`gh auth login`)
