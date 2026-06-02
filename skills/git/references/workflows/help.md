# help

## git — Git Workflows

| Command | Description |
|---|---|
| `/git commit [flags]` | Create a conventional commit with CI monitoring |
| `/git rebase` | Interactive rebase helper |
| `/git help` | Show this reference |

### commit flags

- `--yes` / `-y` — skip commit message confirmation
- `--no-push` — commit only, do not push
- `--autofix` — auto-fix CI failures after push
- `--atomic` — create one commit per logical change group

## Migrating from `git ci`

`/git ci` has been replaced by platform-specific skills:
- GitHub: `/gh ci`
- GitLab: `/glab ci`
