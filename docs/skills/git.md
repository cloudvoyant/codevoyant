# git

Git skill — wraps core `git` operations for conventional commits and safe interactive rebase.

## Requirements

- `git` — [git-scm.com](https://git-scm.com/)

## Commands

### commit — create a conventional commit

Generate a conventional commit message from staged changes, review it, then commit and push.

```bash
/git commit                   # commit staged changes
/git commit --atomic          # split logical groups into separate commits
/git commit --yes             # skip confirmation and auto-approve message
/git commit --no-push         # commit only, do not push or monitor CI
/git commit --autofix         # fix CI failures and re-push automatically
```

### rebase — safe interactive rebase

Safely rebase the current branch onto an updated base branch using a pre-rebase intent snapshot to prevent silent change loss.

```bash
/git rebase                   # rebase onto default base branch
/git rebase main              # rebase onto main
/git rebase main --push       # rebase and push with --force-with-lease
```

### help — list all commands

```bash
/git help                     # list all commands
/git help <verb>              # show details for a specific command
```

## References

- [git documentation](https://git-scm.com/doc)
- [Conventional Commits specification](https://www.conventionalcommits.org/)
