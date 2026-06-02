# Address Template

Write this structure to `.codevoyant/review/{slug}/address.md`.

```markdown
# Addressing Review: {PR/MR title}

## Metadata
- **PR/MR**: #{number} — {url}
- **Source comments**: `.codevoyant/review/{slug}/comments.md`
- **Generated**: {timestamp}

## Proposed Fixes

### Fix for Thread {thread-id} — {file}:{line}

**Reviewer comment:**
> {original comment body}

**Proposed change:**

```diff
- old code
+ new code
```

**Notes:** {any caveats, alternatives, or why this approach was chosen}

**Status:** `PENDING` | `SKIP` | `APPLIED`

---

### Fix for Thread {thread-id} — {file}:{line}

{...}
```

**Status values:** `PENDING` (default), `SKIP` (mark to exclude), `APPLIED` (set by agent after applying)
