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
/git commit --autofix         # fix CI failures and re-push automatically (background)
/git commit --fix             # blocking: fix and re-push until CI is green
```

Commit messages **never carry agent self-attribution** — no `Co-Authored-By: Claude`, no "Generated with Claude Code", no 🤖 — on any commit, including `--fix`/`--autofix` follow-ups.

### hooks — enforce no self-attribution

Install a `commit-msg` git hook that strips agent self-attribution from **every** commit in the repo, not just those made through `/git commit`. This is the robust backstop for when other agents or ad-hoc fix commits would otherwise add a `Co-Authored-By: Claude` or "Generated with" line.

```bash
/git hooks install            # install the commit-msg hook (once per clone)
/git hooks status             # check whether it's installed
/git hooks uninstall          # remove it (restores any prior hook)
```

`.git/hooks/` is not tracked, so re-run `install` after a fresh clone; for a team-wide hook, point `core.hooksPath` at a committed directory containing the script.

### rebase — safe interactive rebase

Safely rebase the current branch onto an updated base branch using a pre-rebase intent snapshot to prevent silent change loss.

```bash
/git rebase                   # rebase onto default base branch
/git rebase main              # rebase onto main
/git rebase main --push       # rebase and push with --force-with-lease
```

### worktree — create a branch and/or worktree

Create or switch a git branch and/or create a git worktree. Branch and worktree are **independent** — request either, both, or neither, and neither implies the other. This is the shared routine that `/spec new`'s `--branch` and `--worktree` flags delegate to, so the branch/worktree logic lives in one place.

```bash
/git worktree --branch                    # create/switch to a branch (name derived from the slug)
/git worktree --branch my-branch          # create/switch to a branch with an explicit name
/git worktree --worktree                  # create a worktree at .codevoyant/worktrees/<branch>
/git worktree --worktree ../wt            # create a worktree at an explicit path
/git worktree --branch feat --worktree ../wt  # branch + worktree at an explicit path
```

When a worktree is requested without an explicit branch name, the branch is derived from the slug. The default worktree path is `.codevoyant/worktrees/<branch>`.

### help — list all commands

```bash
/git help                     # list all commands
/git help <verb>              # show details for a specific command
```

## References

- [git documentation](https://git-scm.com/doc)
- [Conventional Commits specification](https://www.conventionalcommits.org/)
