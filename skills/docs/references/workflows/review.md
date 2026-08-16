# review -- audit docs for template adherence and language compliance

Evaluate Markdown files in docs/ against the docs skill's template standards and the simple-English language guide. Read-only -- no doc files are modified. Produces a terminal gap report AND a written replacement report at `.codevoyant/review/{slug}/docs-review.md`.

**Preserve human text.** The review proposes replacements only for text that is inaccurate or violates a structural/language requirement. It does not rephrase working prose for style.

**Template-driven.** Required sections, diagrams, the public API section, and the Components section are all derived from the resolved template via `references/template-contract.md` — never hard-coded. Editing a template changes what review requires.

## Variables

- `TARGET_PATH` -- path to audit (default: `docs/`)
- `FORMAT` -- `--json` for machine-readable terminal output, default is human-readable
- `DIFF_BASE` -- `--diff <base>` to restrict code-accuracy verification to files changed on this branch (default: no restriction, audit the whole tree)

## Step 0: Derive review slug and create directory

Derive `SLUG` from `TARGET_PATH`:
- `docs/` -> `docs`
- `docs/architecture/auth.md` -> `docs-architecture-auth`
- `README.md` -> `readme`

Rule: lowercase the path, strip the file extension, replace `/` and non-alphanumeric characters with `-`, collapse runs of `-`, trim leading/trailing `-`.

```bash
REVIEW_DIR=".codevoyant/review/${SLUG}"
mkdir -p "$REVIEW_DIR"
```

## Step 1: Discover files to audit

```bash
find "${TARGET_PATH:-docs/}" -name "*.md" -not -path "*/node_modules/*" | sort
```

If TARGET_PATH is a single file, audit only that file.

When auditing the whole tree (default `docs/`), also include the repo-root `README.md` (the project README, which lives at the repo root — not under `docs/`) so it is checked against `project-readme.md`.

**Diff restriction (`--diff`):** when `DIFF_BASE` is set, compute `CHANGED` per `references/coverage-and-api.md` Step D. A doc whose globs do NOT intersect `CHANGED` is still structure/language-checked, but its code-accuracy findings (Step 3e) are restricted to in-scope changed files only (Step F).

## Step 2: Determine expected template per file

| File pattern | Expected template |
|---|---|
| `README.md` (repo root) | `project-readme.md` |
| `docs/user-guide.md` | `user-guide.md` (user-facing) |
| `docs/development-guide.md` | `development-guide.md` |
| `docs/ci.md` | `ci.md` (CI/CD + infrastructure) |
| `docs/architecture/index.md` | `architecture.md` (the system doc — always at this path) |
| `docs/architecture/**/index.md` (nested) | component template — detect type from its code path (see `references/structure.md`); `generic.md` if unknown |
| `docs/architecture/**/{leaf}.md` | component template — type-specific (detect from its code path, see `references/structure.md`); `generic.md` if type unknown |
| Other `docs/**/*.md` | language-guide rules only (no template structure check) |

A component that OWNS sub-components is a directory `<name>/` whose `index.md` is that component's doc (component template), NOT the architecture template. Only the single `docs/architecture/index.md` uses the architecture template.

### Structure check (see `references/structure.md`)

- The mandated top level is `README.md` (repo root), `docs/user-guide.md`, `docs/development-guide.md`, `docs/ci.md`, and `docs/architecture/index.md` (see `references/structure.md`). Check each:
  - `README.md` (at the repo root), `docs/user-guide.md`, and `docs/development-guide.md` apply to every repo — flag as missing (recommended) if absent.
  - `docs/ci.md` (CI/CD + infrastructure) is present-if-applicable — flag as missing only when the repo has CI config (any of the CI candidate globs in `templates/ci.md` frontmatter: `.github/workflows/**`, `.gitlab-ci.yml`, `.circleci/config.yml`, `Jenkinsfile*`, …) OR infra config (`infra/**`, `terraform/**`, `**/*.tf`, `Pulumi.yaml`, `Dockerfile*`, `docker-compose*`); do NOT flag a repo with neither CI nor managed infra. When `docs/ci.md` exists, also flag it (COVERAGE) if any of its `globs` matches no real path — the candidate set must be trimmed to what the repo actually has.
  - Record these as STRUCTURE findings with message `Recommended top-level doc missing: {path} (see structure.md)`. Use judgment: never hard-fail a repo that legitimately has no CI and no infra.
- The architecture doc must exist at `docs/architecture/index.md` (never a README in that directory). Flag a missing or mis-located architecture doc.
- A component that has child docs must be a directory containing `index.md`. Flag a bare `docs/architecture/<name>.md` that has siblings implying it should own sub-components (e.g. sibling files/dirs `<name>-*` or a `<name>/` dir already exists) — it should be promoted to `<name>/index.md`.
- A parent `index.md` must reference its children through their interface (already covered by the coverage-and-api Rule 3 check in Step 3e).

**Detect a component doc's type from its code path.** For a component doc (`docs/architecture/**/index.md` or `docs/architecture/**/{leaf}.md`), there is no stored type marker — read the doc's `globs` frontmatter (its first/primary glob is the code path) and resolve the type using the detection table in `references/structure.md`. If the type is still not clear, apply `generic.md` checks only (or fall back to the doc's own section set). For the fixed-path docs, the path IS the template (see the Step 2 table). Then compare the doc's headings against that resolved template.

## Step 3: Check each file (parallel background agents)

**Single file:** run checks 3a-3d, 3f inline.

**Multiple files (2+):** launch one background Agent per file simultaneously. Each agent receives the file path, its detected template type, the resolved template path, and paths to `references/mermaid-guide.md`, `references/language-guide.md`, `references/simple-english/ruleset.md`, and `references/template-contract.md`. Each agent runs checks 3a-3d, 3f and returns `{ path, gaps: [{type, message, line, current_text, replacement_text, rationale}] }`.

Collect all agent results before Step 4.

Checks 3a-3d, 3f are per-file. Check **3e (Coverage & API boundaries)** is tree-wide — run it once over all discovered files after the per-file results are collected, and merge its findings in.

For each file, run these checks:

### 3a. Required sections check (template structure)

Resolve the doc's template exactly as scaffold does (`references/scaffold.md`: `references/templates/{type}.md`, type from Step 2) and derive the required heading set from it per `references/template-contract.md` (§1 Required sections): every `##`/`###` heading whose first `<!-- @agent: … -->` marker does NOT start with `(optional)` is required. Do not restate per-type section sets — the template drives the check.

Compare headings:
- A `##`/`###` heading required by the resolved template but ABSENT in the doc is a missing-section finding.
- Optional sections (marker starts with `(optional)`) are never flagged for absence.

That is the whole structure check — the template drives it, so editing a template automatically changes what review requires. The public API/interface section (`[public-api]` marker) and Components section (`[components]` marker) are template headings and so are checked here; they are also checked semantically in Steps 3e/3f.

For each missing required section, record:
- `type`: STRUCTURE
- `current_text`: "(section absent)"
- `replacement_text`: the section heading plus its `<!-- @agent: … -->` marker copied from the resolved template
- `rationale`: "Required by {template name} template."

### 3b. Mermaid diagram check

Derive the required diagram set from the resolved template per `references/template-contract.md` (§2 Required diagrams): for each required heading that contains a ` ```mermaid ` fence in the template, the **diagram type** on the line after the fence is required for that section. Detect the doc's diagrams by grepping for ` ```mermaid ` blocks and reading the type on the next line; check that the doc has a matching-type fence somewhere under the corresponding heading. Optional sections never require a diagram.

For each missing diagram, record:
- `type`: DIAGRAM
- `current_text`: the prose that describes the flow (or "(no flow description found)")
- `replacement_text`: a Mermaid code fence stub with the correct diagram type and a placeholder comment
- `rationale`: "Template prescribes {diagram type} for section {heading}."

### 3c. Language-guide and STE checks

Apply the review check set in `references/language-guide.md` (## Review Checks) and the key STE rules from `references/simple-english/ruleset.md`.

For each violation, record:
- `type`: LANGUAGE
- `current_text`: the exact sentence or phrase containing the violation
- `replacement_text`: the minimal rewrite that fixes only the violation
- `rationale`: the specific rule number and name

### 3d. References check

Verify `## References` section is present and has at least one entry. If the doc is more than 20 lines, flag missing references.

**Index docs are exempt.** The project README (`README.md`) and the architecture doc (`docs/architecture/index.md`) are navigational index docs — they link DOWN into `docs/` instead of listing external references, so do NOT flag them for a missing `## References`. The `## Documentation` / `## Design → Components` internal links they carry are their point.

For a missing References section, record:
- `type`: REFERENCE
- `current_text`: "(section absent)"
- `replacement_text`: `## References\n\n<!-- Add links to technical/external sources actually used: upstream docs, specs, source files. -->`
- `rationale`: "Required by all doc templates."

**References must be technical/external.** `## References` lists real external/technical sources actually used by the doc — upstream framework/library docs, specs, standards, and load-bearing source files. It must NOT contain internal cross-links to sibling, child, or top-level docs (`docs/architecture/*.md`, `docs/user-guide.md`, `docs/ci.md`, `docs/development-guide.md`, etc.). Sub-component doc links belong in `## Design` → the `[components]` section (Rule 3), not here. If a `## References` entry links another doc in this `docs/` tree, flag it:
- `type`: REFERENCE
- `current_text`: the offending internal-doc-link entry
- `replacement_text`: `<!-- Move this doc link to the Components section; cite a technical/external source here instead. -->`
- `rationale`: "References are technical/external sources only; internal doc links belong in Components (see references/coverage-and-api.md Rule 3)."

### 3f. Design check (Components + inline optional diagram)

Applies to COMPONENT docs and the architecture index doc (skip `user-guide.md` / `development-guide.md` / `ci.md` — they have no `## Design`).

- **Components required.** The `## Design` section must contain the template's `[components]`-marked heading (see `references/template-contract.md` §4). If absent, record a STRUCTURE finding: `current_text`: "(section absent)"; `replacement_text`: the heading plus its `<!-- @agent: … -->` marker from the resolved template; `rationale`: "Design must contain a Components explanation (see references/coverage-and-api.md Rule 3)."
- **Sub-component docs named + linked in Components.** When this doc has child docs in the mandated structure (nested children under it — a `<name>/` dir with `index.md`, or leaf children beside a nested `index.md`; for the architecture doc, every component doc is a child), each such child MUST be named and linked in the `[components]` section, referencing the child's public API section — NOT in `## References`. If a known child doc is not linked from Components (or is only linked from References), record a COVERAGE finding: `rationale`: "coverage-and-api Rule 3: parent names+links each child in Components, referencing the child's public API section." (Best-effort — when the child set cannot be determined, do not flag.)
- **Inline system diagram is optional.** A `graph TD`/`flowchart TD` whose template marker starts with `(optional)` inside `### Components` is optional — do NOT flag its absence (its requiredness is decided by the template marker per `template-contract.md` §2).



### 3e. Coverage & API-boundary check

Apply the coverage and API-boundary rules in `references/coverage-and-api.md`. This check is **tree-wide** (it compares docs against each other), so run it once for the whole `docs/` tree — the per-file agents cannot see other files. Follow the detection procedure in that reference (Steps A–C). Under `--diff`, restrict to in-scope changed files (Steps D–F). Record findings with `type`: COVERAGE:

- **Missing/empty globs** (Rule 1): a managed doc has no leading `globs:` frontmatter, or its `globs:` list is empty. Docs with `exclude: true` in frontmatter are unmanaged and skipped (per `coverage-and-api.md` Step A). `current_text`: "(no globs frontmatter)"; `replacement_text`: the `globs:` frontmatter stub from the template with a `<!-- TODO -->`; `rationale`: "coverage-and-api Rule 1: every doc declares the paths it covers."
- **Duplicate coverage** (Rule 2): two docs' globs intersect but are NOT in a strict parent/child subset relationship. Name **both** docs. `rationale`: "coverage-and-api Rule 2: one owner per path." **Index docs are exempt** — a doc carrying `index: true` in its frontmatter (the project README `README.md` at the repo root and the architecture doc `docs/architecture/index.md`, which intentionally span `**`) is dropped from the pairwise comparison per coverage-and-api Rule 2, so a freshly generated tree with both `**` index docs produces no duplicate-coverage finding. A nested component `index.md` owns only its subtree (not `**`) and participates normally.
- **Parent uses child internals** (Rule 3): a superset-glob parent documents or depends on a nested child's internal files/functions/types instead of linking the child doc and using its API section. `rationale`: "coverage-and-api Rule 3: parent references child through its interface only."
- **Missing API/interface section** (Rule 4): a module/component doc lacks the `[public-api]`-marked heading from its resolved template. `rationale`: "coverage-and-api Rule 4: module docs must expose a public API section."
- **Cross-module internals** (Rule 5): a doc references another module's internal file/function/type rather than that module's documented API section. `rationale`: "coverage-and-api Rule 5: cross-module references use the offered API only."

Detection is heuristic/best-effort (parse each doc's `globs`, compute overlaps; check references/links against the target doc's API section). When the heuristic cannot decide, do not flag. Attach each COVERAGE finding to the relevant file (for duplicate-coverage, attach to both named docs).

## Step 4: Build terminal gap report

For each file, collect all findings. Then output:

**Human-readable (default):**
```
docs/architecture/auth.md -- 3 gaps
  STRUCTURE  Missing ## Requirements section
  DIAGRAM    Auth flow needs sequenceDiagram -- prose list found at line 38
  LANGUAGE   Acronym 'OIDC' undefined on first use (line 5)

docs/architecture/index.md -- 2 gaps
  DIAGRAM    Missing lib dependency graph (graph LR) in ## Implementation
  DIAGRAM    Missing system topology (graph TD) in ## Design

README.md -- 0 gaps

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
        { "type": "DIAGRAM", "message": "Auth flow needs sequenceDiagram", "line": 38 },
        { "type": "LANGUAGE", "message": "Acronym 'OIDC' undefined on first use", "line": 5 }
      ]
    }
  ]
}
```

## Step 5: Write replacement report

Read `references/docs-review-template.md`. Substitute all `{placeholder}` tokens with the values from this review session.

For each file with findings, write the file's findings section:
- Each finding includes the exact `current_text` and `replacement_text` captured in Step 3.
- Group findings by file path, ordered by line number.

Write the populated report to `${REVIEW_DIR}/docs-review.md`.

## Step 6: Exit

Report the terminal summary. If `--json`, output the JSON.

Then report the written replacement report:
```
Written replacement report: {REVIEW_DIR}/docs-review.md
  {finding_count} proposed replacement(s) across {file_count} file(s)

To apply (per file):
  /docs update {component}    -- applies this report's findings for that one file
                                 (looks up the report by the file's slug, then falls
                                 back to the tree-level `docs` report written here)
  Run it once per file with findings; a whole-tree report stays in place until each is applied.
To re-review:
  /docs review {path}         -- regenerates the report
```
