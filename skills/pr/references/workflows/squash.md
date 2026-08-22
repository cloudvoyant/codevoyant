# squash

Collapse all commits on the current PR/MR branch into **one or more coherent, changelog-ready commits**. The goal is a clean, reviewable history: each resulting commit is a self-contained logical change with a conventional-commit subject and a well-organized, properly wrapped body.

Use before merging when a branch has accumulated noisy WIP / fixup / "address review" / "fix CI" commits.

## Arguments

- `PR_ID` (optional positional) — the PR/MR whose branch to squash; defaults to the current branch's PR/MR
- `--base <branch>` — base to squash against (default: the PR/MR base, else `main`)
- `--onto <n>` — force the result into exactly `n` commits (default: agent chooses 1, or a few if the branch spans clearly separate concerns)
- `--single` — force a single commit (shorthand for `--onto 1`)
- `--yes` / `-y` — skip the confirmation prompt
- `--no-push` — rewrite locally but do not force-push

## Step 0: Preconditions

1. Confirm a clean working tree: `git status --porcelain` must be empty. If not, stop: `✗ Commit or stash your working changes before squashing.`
2. Resolve `BRANCH = git rev-parse --abbrev-ref HEAD`. Refuse to run on `main`/`master`: `✗ Refusing to squash the default branch.`
3. Resolve `BASE`:
   - If `--base` given, use it.
   - Else detect the PR/MR base: GitHub `gh pr view {PR_ID} --json baseRefName -q .baseRefName`; GitLab `glab mr view {PR_ID}` target branch. Fall back to `main`.
4. Compute the merge base and range:
   ```bash
   MERGE_BASE=$(git merge-base "$BASE" HEAD)
   git log --oneline "$MERGE_BASE"..HEAD
   ```
   If the range has 0 or 1 commits: report `Nothing to squash (branch has {N} commit(s) on top of {BASE}).` and exit.
5. **Safety net:** record the pre-squash tip so the user can recover:
   ```bash
   git tag -f "pre-squash/$BRANCH" HEAD
   ```
   Report: `↩ Backup ref: pre-squash/{BRANCH} (restore with: git reset --hard pre-squash/{BRANCH})`.

## Step 1: Analyze the changes

Gather the full picture of what the branch does (not what the intermediate commits said):

```bash
git log "$MERGE_BASE"..HEAD --format='%h %s%n%b'      # existing messages, for context
git diff --stat "$MERGE_BASE"..HEAD                    # files + churn
git diff "$MERGE_BASE"..HEAD                           # the actual net change
```

Read the **net diff** as the source of truth — intermediate commits may have added then reverted things; the changelog should describe the final delta, not the journey.

## Step 2: Decide the commit grouping

Default to **one** commit. Split into a small number (2–4) only when the branch contains clearly independent concerns that a changelog would want listed separately — e.g. a feature plus an unrelated bug fix plus a docs-only change. Do not over-split; coherence beats granularity.

For each planned commit determine:
- **type(scope)** — conventional-commit type (`feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `build`, `ci`) and a short scope (subsystem/skill).
- **subject** — imperative, ≤ 72 chars, no trailing period.
- **body** — grouped bullets describing the net change (see Step 3).
- **paths** — the files that belong to this commit (only needed when splitting into >1).

When splitting, every changed file must belong to exactly one group and the groups must together cover the entire diff (no file left behind).

## Step 3: Compose messages — changelog-ready and properly wrapped

Each message must read well in a changelog and in `git log`. Formatting rules:

- **Subject:** `type(scope): summary`, imperative mood, ≤ 72 chars, no period.
- **Blank line** between subject and body, and between body sections.
- **Body = bullet points**, one change/reason per bullet, grouped under short `**Heading**` lines when a commit spans several areas. Lead with the *why* when it isn't obvious.
- **Hard-wrap every body line at 72 columns.** Never emit a single long line and rely on the viewer to wrap — many changelog renderers and `git log` do not, so long lines get visually truncated. A bullet that exceeds 72 chars continues on the next line indented two spaces to align under its text. Prefer piping paragraphs through `fmt -w 72` (or wrap manually) before assembling the message.
- Do not hard-wrap inside code spans, URLs, or file paths — move them to their own line if needed rather than breaking them.
- **No agent self-attribution** — no `Co-Authored-By: <agent>`, no "Generated with", no 🤖 (see `/git commit` rules). Preserve genuine human `Co-Authored-By:` trailers found in the original commits.
- Optionally end with a `Refs:` / `Closes #<n>` footer when the branch resolves an issue.

Write each finished message to its own temp file (so newlines and wrapping survive exactly):

```bash
cat > /tmp/pr-squash-1.txt <<'EOF'
feat(scope): concise summary of the whole change

**Area one**
- first coherent change, wrapped to keep every line at or under
  seventy-two columns so changelog tools render it intact
- second change

**Area two**
- another change

Closes #NN
EOF
```

## Step 4: Confirm

Print the planned commit(s) — subject + body — as they will appear. Unless `--yes`, use **AskUserQuestion**:

```
question: "Squash {N} commits into {M} commit(s) and force-push?"
header: "Squash"
options:
  - label: "Squash and push"
    description: "Reset to {BASE} merge-base, re-commit, force-push with --force-with-lease"
  - label: "Squash, no push"
    description: "Rewrite locally only; you push later"
  - label: "Cancel"
    description: "Leave history untouched (backup tag already set)"
```

`--no-push` implies "Squash, no push". Cancel → exit (leave the `pre-squash/*` tag in place).

## Step 5: Rewrite history

Interactive rebase is **not** used (no TTY). Rewrite via soft reset so the working tree is untouched:

**Why raw `git commit` here.** The pr skill routes commit creation through the git commit skill (`/git commit`) per the pr skill's conventions, but squash is a deliberate exception: it commits from **predetermined message files** (`git commit -F /tmp/pr-squash-N.txt`) with **explicit per-group path staging**, neither of which `/git commit` can express (it composes messages itself and auto-detects `--atomic` groups from the tree). So squash calls `git commit` directly, but inherits the git commit skill's message rules from Step 3 — conventional-commit `type(scope)` subjects, imperative mood, no agent self-attribution — and squash's CI-watch is added separately in Step 6.5. Keep this note in sync if `/git commit` ever gains message-file or explicit-group support.

```bash
git reset --soft "$MERGE_BASE"          # all branch changes now staged, tree unchanged
```

**Single commit:**
```bash
git commit -F /tmp/pr-squash-1.txt
```

**Multiple commits** (in listed order): for each group, stage only its paths, then commit:
```bash
git reset            # unstage all (keep changes in working tree)
git add -- <paths for group 1> && git commit -F /tmp/pr-squash-1.txt
git add -- <paths for group 2> && git commit -F /tmp/pr-squash-2.txt
# ...
git status --porcelain    # MUST be empty — every change assigned to a commit
```
If `git status --porcelain` is non-empty after the last group, a file was missed: stop and report which, so nothing is silently dropped. (Recover with `git reset --hard pre-squash/{BRANCH}` if needed.)

## Step 6: Push

`PUSHED=false`. Unless `--no-push` / "Squash, no push":

```bash
git push --force-with-lease origin "$BRANCH"
PUSHED=true
```

`--force-with-lease` refuses to overwrite if the remote advanced since you last fetched — safer than `--force`. If it is rejected, fetch and re-check with the user before retrying; do not use `--force`.

## Step 6.5: Watch CI after the push (best-effort)

The rewrite is pushed — nothing here can undo it; this step only watches and notifies. Skip silently (leave `CI_STATUS` unset) if the rewrite was **not pushed** — via `--no-push` or the "Squash, no push" confirm option, i.e. `PUSHED != true` — if there is no remote, if the repo has no CI configured, or if the needed CLI (`gh` for GitHub, `glab` for GitLab) is not installed. Key the skip on `PUSHED` (did we actually push?) rather than the `--no-push` flag alone, so the "Squash, no push" confirm path is skipped too.

Watch the CI run that the force-push kicked off on the rewritten branch `{BRANCH}`, reusing the platform `ci` workflow — do NOT reimplement CI polling (this mirrors `merge.md` Step 7 and the git skill's `commit`/`rebase` behavior):

- **GitHub:** `/gh ci --branch {BRANCH}` (no `--autofix` — `squash` only watches and notifies).
- **GitLab:** `/glab ci --branch {BRANCH}`.

Capture the outcome into `CI_STATUS`:

- Watch completes green → `CI_STATUS = "green"`.
- Watch reports failure → `CI_STATUS = "failing"` and record the failing check names and the logs pointer (the failing-run URL, or the `gh run view --log-failed` / `glab ci trace` hint the `ci` workflow surfaces).
- No recent run found for `{BRANCH}`, or the check was skipped → leave `CI_STATUS` unset (treated as "not watched").

CI_STATUS feeds the report in Step 7; a failing post-squash CI never rewinds the rewrite — the branch is pushed and the PR/MR is updated, so a red result means "do not merge until fixed".

## Step 7: Report

```
✓ Squashed {N} → {M} commit(s) on {BRANCH}{, force-pushed to update the MR}.

  {short-sha}  {subject 1}
  {short-sha}  {subject 2}

  Backup: pre-squash/{BRANCH}  (git reset --hard pre-squash/{BRANCH} to undo)
```

Remind the user the backup tag is local-only and can be deleted once satisfied: `git tag -d pre-squash/{BRANCH}`.

If `CI_STATUS == "failing"`, NOTIFY prominently at the end — this is the headline, not a footnote:

```
⚠ CI is FAILING on {BRANCH} after the squash
  failing checks: {check names}
  logs: {failing-run URL or `gh run view <id> --log-failed` / `glab ci trace <job-id>`}
  The branch is rewritten and pushed. Fix on {BRANCH} (e.g. /git commit --fix) before merging the PR/MR.
```

If `CI_STATUS == "green"`, add a one-line `✓ CI is green on {BRANCH} after the squash`. If `CI_STATUS` is unset (not watched — rewrite not pushed, no remote, no CI, or no CLI), say nothing about CI.

## Error Handling

- **Dirty tree / on base branch / <2 commits:** caught in Step 0.
- **Force-push rejected (remote advanced):** stop, surface the rejection, offer to fetch + rebase before retrying. Never fall back to plain `--force`.
- **Unassigned files when splitting:** caught in Step 5 — stop rather than drop changes.
