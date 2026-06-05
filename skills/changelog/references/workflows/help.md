# changelog — help

Changelog and conventional commit hygiene.

## Commands

**`/changelog retcon`**  
Propose commit message edits for all commits on the current branch vs PR/MR base.  
Writes a proposal file you can review and edit before applying.

**`/changelog retcon --apply`**  
Apply proposed edits via `git rebase` + `git push --force-with-lease`.  
Requires a clean working tree and an open PR/MR.

**`/changelog preview`**  
Show the predicted changelog and next version for commits since last tag.  
Prints to conversation — no files created.

## Aliases

- `/gh retcon` — same as `changelog retcon` with GitHub platform pre-detected
- `/glab retcon` — same as `changelog retcon` with GitLab platform pre-detected

## Companion skills

- `/cz` — show current and predicted next version using commitizen
- `/release` — show current and predicted next version using semantic-release or release-it

## Requirements

- `gh` CLI (for GitHub) or `glab` CLI (for GitLab)
- Force-push permission on your feature branch (for `--apply`)
- Clean working tree (for `--apply`)
