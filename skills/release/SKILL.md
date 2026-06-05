---
name: release
description: 'semantic-release and release-it version introspection. Show current version and predicted next version. Triggers on: "release version", "semantic release preview", "release-it dry run", "what will the next release be", "release preview".'
license: MIT
compatibility: 'Works on Claude Code and any platform with git available. semantic-release / release-it CLI optional — falls back to git tag analysis.'
argument-hint: '[--tool semantic-release|release-it|auto]'
---

# release

Show the current project version and predicted next version using semantic-release or release-it conventions.

## Critical Rules

- **Read-only** — only run dry-run modes; never trigger an actual release
- **Always fall back** — if neither tool is installed, use git tags + conventional commits
- **One answer** — print current version and next version, then stop

## Step 0: Detect config and tool

```bash
TOOL=""
CONFIG=""

# semantic-release detection (priority order)
[ -f ".releaserc" ]        && TOOL="semantic-release" && CONFIG=".releaserc"
[ -f ".releaserc.json" ]   && TOOL="semantic-release" && CONFIG=".releaserc.json"
[ -f ".releaserc.yml" ]    && TOOL="semantic-release" && CONFIG=".releaserc.yml"
[ -f ".releaserc.yaml" ]   && TOOL="semantic-release" && CONFIG=".releaserc.yaml"
[ -f ".releaserc.js" ]     && TOOL="semantic-release" && CONFIG=".releaserc.js"
{ [ -f "package.json" ] && grep -q '"release"' package.json; } && TOOL="semantic-release" && CONFIG="package.json"

# release-it detection (overrides if .release-it.* found)
[ -f ".release-it.json" ]  && TOOL="release-it" && CONFIG=".release-it.json"
[ -f ".release-it.yml" ]   && TOOL="release-it" && CONFIG=".release-it.yml"
[ -f ".release-it.toml" ]  && TOOL="release-it" && CONFIG=".release-it.toml"
```

Override with `--tool` flag if provided.

## Step 1: Get current version

```bash
# Try package.json first
[ -f "package.json" ] && jq -r '.version // empty' package.json

# Then git tag
git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//'

# Fallback
echo "0.0.0"
```

## Step 2: Predict next version

If `TOOL=semantic-release` and `npx semantic-release` available:
```bash
npx semantic-release --dry-run --no-ci 2>&1 | grep -E "next release|The next release"
```

If `TOOL=release-it` and `npx release-it` available:
```bash
npx release-it --dry-run --no-npm.publish 2>&1 | grep -E "release|version"
```

If neither tool available: fall back to conventional commit + semver analysis (same as `changelog preview`).

## Step 3: Report

```
release version introspection
  Tool:     {semantic-release|release-it|(fallback: git tags)}
  Config:   {CONFIG or "(none)"}
  Current:  {current version}
  Next:     {next version}  ({Major|Minor|Patch|None} bump)
  Reason:   {N breaking | M features | P fixes since {last tag}}
```

Note any configuration issues detected (e.g., missing `branches` config in semantic-release).
