---
title: cz
---

# cz

Commitizen version introspection — show current version and predicted next version.

## Usage

```
/cz
```

Detects commitizen config (`.cz.toml`, `pyproject.toml [tool.commitizen]`) and reports the current version and what version a `cz bump` would produce. Falls back to git tags + conventional commit analysis when commitizen is not installed.

## Output

```
commitizen version introspection
  Config:   .cz.toml
  Current:  1.4.2
  Next:     1.5.0  (Minor bump)
  Reason:   3 features, 2 fixes since v1.4.2
```

## References

- [commitizen](https://commitizen-tools.github.io/commitizen/)
