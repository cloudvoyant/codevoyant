---
title: release
---

# release

semantic-release and release-it version introspection — show current and predicted next version.

## Usage

```
/release
```

Detects semantic-release (`.releaserc*`) or release-it (`.release-it.*`) config and runs a dry-run to show what version the next release would produce. Falls back to git tags + conventional commit analysis when tools are not installed.

## Output

```
release version introspection
  Tool:     semantic-release
  Config:   .releaserc.json
  Current:  2.1.0
  Next:     2.2.0  (Minor bump)
  Reason:   2 features since v2.1.0
```

## References

- [semantic-release](https://semantic-release.gitbook.io/)
- [release-it](https://github.com/release-it/release-it)
