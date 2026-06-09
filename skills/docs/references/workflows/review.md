# review — audit docs/ files for template adherence

Evaluate Markdown files in docs/ against the docs skill's template standards. Read-only — no files are modified.

## Variables

- `TARGET_PATH` — path to audit (default: `docs/`)
- `FORMAT` — `--json` for machine-readable output, default is human-readable

## Step 1: Discover files to audit

```bash
find "${TARGET_PATH:-docs/}" -name "*.md" -not -path "*/node_modules/*" | sort
```

If TARGET_PATH is a single file, audit only that file.

## Step 2: Determine expected template per file

| File pattern | Expected template |
|---|---|
| `docs/README.md` | `project-readme.md` |
| `docs/architecture/README.md` | `architecture-readme.md` |
| `docs/architecture/*.md` | `component-base.md` + type-specific (detect from file content or path) |
| Other `docs/**/*.md` | language-guide rules only (no template structure check) |

For `docs/architecture/{name}.md`, detect type from:
1. `<!-- Component type: {type} -->` comment in the file (written by `docs new`)
2. Path heuristics (same as `new.md`)
3. If can't determine: apply `component-base.md` checks only

## Step 3: Check each file (parallel background agents)

**Single file:** run checks 3a–3d inline.

**Multiple files (2+):** launch one background Agent per file simultaneously. Each agent receives the file path, its detected template type, and paths to `references/mermaid-guide.md` and `references/language-guide.md`. Each agent runs checks 3a–3d and returns `{ path, gaps: [{type, message, line}] }`.

Collect all agent results before Step 4.

For each file, run these checks:

### 3a. Required sections check (template structure)

Verify each required section exists (as a `## heading`):
- `## Overview` — required in all docs
- `## Requirements` — required in all docs
- `## Design` — required in all docs
- `## Implementation` — required in all docs
- `## References` — required in all docs

Type-specific required sections:
- api: `### Endpoints` table
- library: `### Public API Surface` section
- frontend: `### User Flow` or `### Component Tree`
- infra: `### Resources Created` table, `### Module Inputs` section

### 3b. Mermaid diagram check

Using `references/mermaid-guide.md` prescriptions, check:
- Auth/OAuth docs: has a `sequenceDiagram` block? If prose describes an auth flow instead → flag
- API docs: has a `sequenceDiagram` for request flow?
- architecture README: has `graph TD` topology? ER diagram? dependency `graph LR`?
- library docs: has internal architecture `graph LR`?
- frontend docs: has user flow `flowchart TD` and component tree?
- infra docs: has architecture `graph TD`?

Detection: grep for ` ```mermaid` blocks and check the diagram type on the next line.

### 3c. Language-guide checks

- **Acronym rule**: scan for known acronym patterns (JWT, OIDC, OAuth, SSR, CDN, GCS, GCP, IAM, K8s, CI/CD, etc.) — check if they appear without a parenthetical definition on first use in the file
- **Second person**: scan for "the developer", "the user" (when referring to the reader) — flag occurrences
- **Overview length**: `## Overview` section — if it contains more than 5 sentences, flag as too long

### 3d. References check

Verify `## References` section is present and has at least one entry. If the doc is more than 20 lines, flag missing references.

## Step 4: Build gap report

For each file, collect all findings. Then output:

**Human-readable (default):**
```
docs/architecture/auth.md — 3 gaps
  STRUCTURE  Missing ## Requirements section
  DIAGRAM    Auth flow should use sequenceDiagram — prose list found at line 38
  LANGUAGE   Acronym 'OIDC' undefined on first use (line 5)

docs/architecture/README.md — 2 gaps
  DIAGRAM    Missing lib dependency graph (graph LR) in ## Implementation
  DIAGRAM    Missing ER diagram in ## Design

docs/README.md — 0 gaps

Summary: 5 gaps across 2 files (1 clean)
```

**JSON (--json):**
```json
{
  "summary": { "files": 3, "clean": 1, "total_gaps": 5 },
  "files": [
    {
      "path": "docs/architecture/auth.md",
      "gaps": [
        { "type": "STRUCTURE", "message": "Missing ## Requirements section" },
        { "type": "DIAGRAM", "message": "Auth flow should use sequenceDiagram", "line": 38 },
        { "type": "LANGUAGE", "message": "Acronym 'OIDC' undefined on first use", "line": 5 }
      ]
    }
  ]
}
```

## Step 5: Exit

Report the summary. If `--json`, output the JSON. Never modify any file.

Suggest next steps:
```
To fix gaps:
  /docs update auth        — add missing sections from session context
  /docs new auth           — regenerate with current template (non-destructive)
```
