# help

## git — Git Workflows

| Command | Description |
|---|---|
| `/git commit [flags]` | Create a conventional commit with CI monitoring |
| `/git hooks [install\|status\|uninstall]` | Manage the commit-msg hook that strips agent self-attribution |
| `/git rebase` | Interactive rebase helper |
| `/git help` | Show this reference |

### commit flags

- `--yes` / `-y` — skip commit message confirmation
- `--no-push` — commit only, do not push
- `--autofix` — background best-effort auto-fix of CI failures after push (non-blocking)
- `--fix` — blocking: fix and re-push until CI is green (bounded retries)
- `--atomic` — create one commit per logical change group

### Commit messages never self-attribute

Every commit (including `--fix`/`--autofix` follow-ups) omits agent self-attribution — no `Co-Authored-By: Claude`, no "Generated with Claude Code", no 🤖. Run `/git hooks install` once per clone for a git-level backstop that strips these from any commit, even ones made outside `/git commit`.

## Migrating from `git ci`

`/git ci` has been replaced by platform-specific skills:
- GitHub: `/gh ci`
- GitLab: `/glab ci`
