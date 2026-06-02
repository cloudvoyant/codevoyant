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

## Summary

{One-paragraph overall impression. State the main concern first. No filler phrases.}

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

**Severity levels:** `MUST CHANGE` (blocking), `CONSIDER` (non-blocking), `NOTE` (informational)
