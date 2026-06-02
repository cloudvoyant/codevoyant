# glab — GitLab Workflows

| Command | Description |
|---|---|
| `/glab ci [--branch <name>] [--autofix] [--silent]` | Watch GitLab CI for a branch |
| `/glab pull-comments [mr] [--output <path>]` | Fetch unresolved MR discussion threads to a doc |
| `/glab push-comments [mr] [--doc <path>]` | Submit inline comments from a doc to an MR |
| `/glab draft [mr] [--body <text>] [--draft]` | Post a note or toggle MR to draft state |
| `/glab resolve-comments [mr] [--discussion-ids <ids>]` | Resolve MR discussion threads |
| `/glab complete [mr] [--approve] [--body <text>]` | Publish a draft MR and/or approve |
| `/glab help` | Print this reference |

## Requirements
- `glab` CLI installed and authenticated (`glab auth login`)
