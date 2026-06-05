---
title: changelog
---

# changelog

Changelog and conventional commit hygiene for open PRs and MRs.

## Commands

**`/changelog retcon`** — propose commit message edits for all commits on the current branch. Writes a proposal file at `.codevoyant/changelog/{branch}/{id}/retcon.md` for review.

**`/changelog retcon --apply`** — apply proposed edits via `git rebase` and `git push --force-with-lease`.

**`/changelog preview`** — show predicted changelog and next version inline. No files created.

## Aliases

- `/gh retcon` — retcon with GitHub PR pre-detected
- `/glab retcon` — retcon with GitLab MR pre-detected

## Companion Skills

- [cz](./cz) — commitizen version introspection
- [release](./release) — semantic-release / release-it version introspection

## Requirements

- `gh` CLI (GitHub) or `glab` CLI (GitLab) — for `retcon`
- Force-push permission on feature branch — for `--apply`
- Clean working tree — for `--apply`

## Safety

`retcon --apply` only runs on feature branches (refuses on main, master, develop). It rewrites commit messages only — never tree content. Uses `--force-with-lease` to prevent overwriting concurrent pushes.

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [git rebase --interactive](https://git-scm.com/docs/git-rebase)
