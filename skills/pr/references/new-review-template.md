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

## Overall issues

{BLOCKING findings that are structural/PR-wide and cannot be anchored to a file:line. One bullet per issue: the problem and what must change. If there are none, delete this entire section — the review then posts file-level comments only. Never restate what the review did, never summarize the diff, never narrate the verdict.}

## Verification

{Which deterministic gates ran and their status — CI, project format/lint/typecheck, semgrep/bandit/trufflehog, commit consistency — one line each, including skips.}

## What was NOT verified

{The red-team-adversary's what_was_not_verified list plus anything the reviewer could not confirm from the diff. One bullet each.}

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
