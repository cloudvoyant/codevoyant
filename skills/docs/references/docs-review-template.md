# Docs Review Template

Write this structure to `.codevoyant/review/{slug}/docs-review.md`.

```markdown
# Docs Review: {scope}

## Metadata
- **Scope**: {TARGET_PATH}
- **Reviewed**: {timestamp}
- **Files audited**: {total_files}
- **Files with findings**: {files_with_findings}
- **Total findings**: {total_findings}

## Summary

{total_findings} finding(s) across {files_with_findings} file(s). {clean_files} file(s) are clean.

{If 0 findings: "All audited files conform to template and language-guide requirements."}

## Replacements

### {file_path}

#### Finding {N} -- {TYPE}: {message}

**Current text:**
> {The exact current text block from the file. For missing sections, write "(section absent)".}

**Replacement:**
{The exact replacement text. For missing sections, provide the section with a placeholder comment.}

**Rationale:** {The specific rule or template requirement. For example: "Language-guide rule 1: define every acronym on first use." or "Required by base template: ## Requirements section."}

---

{Repeat for each finding in this file.}

### {next_file_path}

{Repeat for each file with findings.}

## Clean Files

- {file_path} -- 0 findings

## Next Steps

To apply these replacements (one file at a time):
  /docs update {component}    -- applies this report's findings for that one file
                                 (resolves the report by the file's slug, falling back
                                 to the tree-level `docs` report if this was a whole-tree review)

To re-review after manual edits:
  /docs review {path}         -- regenerates this report
```

**Severity types:** `STRUCTURE` (missing/malformed section), `DIAGRAM` (missing/wrong diagram type), `LANGUAGE` (language-guide or STE violation), `REQUIREMENTS` (a requirement in `## Requirements` violates R1–R7 of `references/requirements-guidance.md`), `REFERENCE` (missing References section or entries), `PROSE` (LLM prose outside the prose-policy allowance — not in a `<!-- -->` comment, not in `## Requirements`, not in `## References`, not a minimal artifact label; see `references/prose-policy.md`), `COVERAGE` (missing/duplicate `globs` coverage or API-boundary violation — see `references/coverage-and-api.md`), `GLOB` (a doc's `globs` matches no real paths, or a discovered component has no owning doc — from `validate`).

**Principles:**
- Each replacement preserves all surrounding human-authored text. The replacement block contains ONLY the text that changes, not the entire file.
- For LANGUAGE findings, the replacement is the minimal rewrite that fixes the violation. Do not rephrase working prose for style.
- For STRUCTURE findings where a section is absent, the replacement is a section stub with a placeholder comment so the human can fill it in.
