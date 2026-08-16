# Diff: {source-repo} vs {target-repo}

{timestamp} · `{target-url}`

---

## Repository Structure

**{target-repo}:**
```
{target directory tree — use * to mark files that differ from source}
```

**{source-repo}:**
```
{source directory tree — use * to mark files that differ from target}
```

`*` = modified or added

- {1-2 bullets noting the most significant structural differences}

---

## Architectural Changes

- {up to 5 bullets — high-level design, layering, module boundaries}
- {point to a file where this is clearly visible, e.g. "see `src/core/index.ts`"}

## Dependency Changes

- {up to 5 bullets — added, removed, or upgraded packages}
- {note version pins or peer dep changes if notable}

## Features Added / Deprecated

- {up to 5 bullets — new capabilities or removed functionality}
- {point to relevant file if it illustrates the change clearly}

## Code Style Changes

- {up to 5 bullets — conventions, formatting, naming, patterns}

## Tooling / CI/CD Changes

- {up to 5 bullets — build config, workflows, linting, test setup}
- {point to changed config files}
