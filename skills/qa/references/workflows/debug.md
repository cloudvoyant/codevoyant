# qa debug workflow

## Step 0: Parse arguments

```
SLUG          first non-flag arg (required; slug for report directory)
DESCRIPTION   --desc "..."  (optional one-line description of the bug)
```

`REPORT_DIR = .codevoyant/qa/{slug}/`

## Step 1: Create report directory

Before the first `mkdir`, run the vendored store initializer — it ensures the in-repo `.codevoyant` is a symlink to the shared per-project store (`~/.codevoyant/<project-slug>/`), so worktrees and regular clones share one store. Idempotent; never migrates an existing real dir (that is `/migrate`'s job). Substitute `{SKILL_ROOT}` with this skill's package root (the directory containing the qa skill's SKILL.md, as reported when the skill loaded).

```bash
# {SKILL_ROOT} = the qa skill's package root (substitute the real path)
python3 "{SKILL_ROOT}/scripts/cv_init_store.py" >/dev/null
mkdir -p .codevoyant/qa/{slug}
```

## Step 2: Investigate

Perform a structured investigation:
1. Reproduce the bug if a description is given (read relevant files, trace code paths)
2. Identify root cause or narrow down the suspected area
3. Document what was tried

## Step 3: Write debug report

Write `.codevoyant/qa/{slug}/debug-report.md` using `references/templates/debug-report.md`.

Fill in all sections:
- **Title** — one-line summary
- **Environment** — OS, runtime/version, relevant config (read from project files where possible: package.json, pyproject.toml, mise.toml)
- **Steps to Reproduce** — numbered, concrete
- **Expected Behavior**
- **Actual Behavior**
- **Root Cause Analysis** — what you found; mark as `Unknown` if not determined
- **Suggested Fix** — optional; include if root cause is clear
- **Severity** — Critical / High / Medium / Low
- **Files Investigated** — list of files read during investigation

## Step 4: Report

```
✓ Debug report written to .codevoyant/qa/{slug}/debug-report.md

To post as an issue:
  /qa report {slug} --github            # post to GitHub
  /qa report {slug} --gitlab            # post to GitLab
  /qa report {slug} --linear --team ENG # post to Linear
```
