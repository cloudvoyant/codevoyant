# Review Template

Write this structure to `.codevoyant/review/{slug}/new-review.md`.

```markdown
# Review: {PR/MR title}

## Metadata
- **PR/MR**: #{number} — {url}
- **Author**: {author}
- **Branch**: {headRef} → {baseRef}
- **Stats**: +{additions} -{deletions} across {changedFiles} files
- **Reviewed**: {timestamp}

## Summary — does this deliver its intent?

{Lead with an intent verdict: does the change deliver its stated purpose end-to-end? Trace the headline use case. Then the main concern. No filler phrases.}

## Inline Comments

### {file}:{line} — {severity}

{Comment body. Include a proposed change block if applicable.}

```diff
- old code
+ new code
```

> **Reference:** {url if applicable}

---

### {file}:{line} — {severity}

{...}
```

**Severity levels:** `BLOCKING` (must change), `CONSIDER` (non-blocking), `NOTE` (informational)
