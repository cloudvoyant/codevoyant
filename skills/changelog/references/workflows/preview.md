# preview

Show the predicted changelog and next version for the current branch — based on conventional commits since the last version tag. Prints to conversation only; no files created.

## Step 1: Find base version

```bash
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
CURRENT_VERSION=${LAST_TAG#v}   # strip leading 'v'
[ -z "$CURRENT_VERSION" ] && CURRENT_VERSION="0.0.0"
```

Also check for version files (in priority order):
1. `.cz.toml` or `pyproject.toml [tool.commitizen]` → `version` field
2. `package.json` → `.version`
3. `version.txt`
4. Last git tag (fallback)

## Step 2: Get commits

```bash
if [ -n "$LAST_TAG" ]; then
  git log "$LAST_TAG"..HEAD --format="%s" --no-merges
else
  git log --format="%s" --no-merges
fi
```

## Step 3: Parse and group

Parse each subject with the conventional commit regex. Group into:
- **Breaking** (`feat!`, `fix!`, any `BREAKING CHANGE:` in body) → major bump
- **Features** (`feat`) → minor bump
- **Fixes/Improvements** (`fix`, `perf`, `refactor`) → patch bump
- **Ignored** (`docs`, `chore`, `ci`, `test`, `style`, `build`) → no bump

## Step 4: Determine next version

Apply semver rules (highest wins):
- Any breaking → major: `X+1.0.0`
- Any feat → minor: `X.Y+1.0`
- Any fix/perf/refactor → patch: `X.Y.Z+1`
- No qualifying commits → no version bump; report current version

## Step 5: Print preview

Print to conversation:

```
## Changelog Preview

Current version: {current}
Next version:    {next}
Bump type:       {Major|Minor|Patch|None}

### Breaking Changes
- {commit subject}

### Features
- {commit subject}

### Bug Fixes / Improvements
- {commit subject}

({N} commits total; {M} ignored as non-changelog types: docs, chore, ci, test)
```

If commitizen or semantic-release config is detected, note which tool would be used and whether the predicted version matches what the tool would produce (run dry-run if tool is installed).
