# qa report workflow

## Step 0: Parse arguments

```
SLUG          first non-flag arg (slug of existing QA report)
--github      post to GitHub (delegates to /gh report-issue)
--gitlab      post to GitLab (delegates to /glab report-issue)
--linear      post to Linear (delegates to /linear report-issue)
--team KEY    Linear team key (passed through to /linear)
--project ID  Linear project ID (passed through to /linear)
--repo R      GitHub/GitLab repo (passed through)
```

At least one of --github / --gitlab / --linear required.

## Step 1: Locate report

Look for `.codevoyant/qa/{slug}/debug-report.md` first, then `smoke-report.md`. Error if neither exists.

## Step 1b: Dependency Check

Before delegating, verify the required skill is available in your context for each flag used:

- `--github` → check `/gh` is loaded; if missing: `Required skill not installed: gh — Install: npx skills add codevoyant/codevoyant`
- `--gitlab` → check `/glab` is loaded; if missing: `Required skill not installed: glab — Install: npx skills add codevoyant/codevoyant`
- `--linear` → check `/linear` is loaded; if missing: `Required skill not installed: linear — Install: npx skills add codevoyant/codevoyant`

## Step 2: Delegate

Based on flag:
- `--github` → invoke `/gh report-issue` workflow logic with `--from .codevoyant/qa/{slug}/{report}.md`
- `--gitlab` → invoke `/glab report-issue` workflow logic with same
- `--linear` → invoke `/linear report-issue` workflow logic with same

Read each target skill's `report-issue.md` workflow and execute it, passing the report file path.

Multiple flags allowed — post to all specified trackers.

## Step 3: Report

```
✓ Issue posted:
  GitHub: {url}
  GitLab: {url}
  Linear: {identifier} — {url}
```
