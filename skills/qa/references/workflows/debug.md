# qa debug workflow

## Step 0: Parse arguments

```
SLUG          first non-flag arg (required; slug for report directory)
DESCRIPTION   --desc "..."  (optional one-line description of the bug)
```

`REPORT_DIR = .codevoyant/qa/{slug}/`

## Step 1: Create report directory

`cv_init_store` ensures the in-repo `.codevoyant` is a symlink to the shared per-project store (`~/.codevoyant/<project-slug>/`) **before** the first `mkdir` — otherwise a fresh clone would create `.codevoyant` as a real directory instead of the shared symlink. It is idempotent, never migrates an existing real dir (that is `/migrate`'s job), and computes the identical `<project-slug>` as the `/migrate` skill.

```bash
cv_init_store() {
  local root; root="$(git rev-parse --show-toplevel 2>/dev/null)" || root=""; [ -n "$root" ] || root="$PWD"
  local link="$root/.codevoyant"
  [ -L "$link" ] && return 0          # already a symlink → initialized
  [ -d "$link" ] && return 0          # old real dir → leave it; /migrate copies it in, never here
  local common name slug
  common="$(git rev-parse --git-common-dir 2>/dev/null)" || common=""
  if [ -n "$common" ]; then
    case "$common" in /*) : ;; *) common="$root/$common" ;; esac
    name="$(basename "$(cd "$(dirname "$common")" >/dev/null 2>&1 && pwd -P)")"
  else
    name="$(basename "$root")"
  fi
  slug="$(printf '%s' "$name" | LC_ALL=C tr '[:upper:]' '[:lower:]' | LC_ALL=C sed 's/[^a-z0-9][^a-z0-9]*/-/g; s/^-*//; s/-*$//')"
  [ -n "$slug" ] || slug="unnamed"    # empty-slug fallback — matches the /migrate skill
  local dest="$HOME/.codevoyant/$slug"
  mkdir -p "$dest"; ln -s "$dest" "$link"
  local gi="$root/.gitignore"
  { [ -f "$gi" ] && grep -qxF '.codevoyant' "$gi"; } || \
    printf '\n# codevoyant context store (symlink to ~/.codevoyant/<project-slug>/)\n.codevoyant\n' >> "$gi"
}

cv_init_store
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
