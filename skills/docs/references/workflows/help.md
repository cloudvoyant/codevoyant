# docs -- command reference

Generate, update, review, and retroactively create engineering documentation.

## Commands

```
/docs new                  Scan the repo and scaffold the base doc skeleton
                           (README + docs/{user-guide,ci,development-guide,architecture/index};
                            monorepo per-app/lib component docs) — @agent prompts, no prose
/docs new [component...] [--type api|library|auth|frontend|generic]
                           Scaffold one or more doc skeletons
/docs new readme           Scaffold README.md skeleton (repo root)
/docs new user-guide       Scaffold docs/user-guide.md skeleton
/docs new development-guide Scaffold docs/development-guide.md skeleton
/docs new ci               Scaffold docs/ci.md skeleton (CI/CD + infrastructure)
/docs new architecture     Scaffold docs/architecture/index.md skeleton
/docs new --dry-run        Preview the proposed skeletons without writing
/docs new --overwrite      Re-scaffold: insert missing sections into existing docs too
/docs update [component]   Update existing doc (consumes review report if present)
/docs update --scaffold    Create missing files/sections with template headings only
/docs review [path]        Audit docs/ and write a replacement report (read-only)
/docs validate [path]      Code-reading check: globs valid + comprehensive, boundaries hold
/docs retcon               Author the whole docs/ tree from the codebase (real content)
/docs retcon --dry-run     Preview the manifest retcon would author
/docs retcon --overwrite   Regenerate existing docs too
/docs retcon --scaffold    Scaffold the full tree retcon would author, no content
/docs help                 Show this reference
```

## Flags

| Flag | Description |
|------|-------------|
| `--type api` | Force API component template |
| `--type library` | Force library template |
| `--type auth` | Force auth (library-derived) template |
| `--type frontend` | Force frontend feature template |
| `--type generic` | Force generic component template |
| `--dry-run` | Preview without writing any files (new, retcon) |
| `--json` | Machine-readable output (review, validate) |
| `--overwrite` | Re-scaffold / regenerate existing files (new, retcon) |
| `--force` | Skip escalation threshold (update only) |
| `--scaffold` | Create missing files and section headings only -- no prose (update, retcon; `new` always scaffolds) |
| `--diff <base>` | Restrict scope to files changed on this branch vs base (default `main`). update reads code only for changed files under the doc's globs; review restricts code-accuracy findings; validate restricts boundary checks |

## Review and Update Pipeline

`docs review` audits docs and writes a replacement report to `.codevoyant/review/{slug}/docs-review.md`, where `{slug}` is derived from the reviewed path (a whole-tree `/docs review` uses slug `docs`; `/docs review docs/architecture/auth.md` uses `docs-architecture-auth`). The report lists file-by-file verbatim replacements with rationale, grouped by file.

`docs update {component}` applies that report to one file. It looks up the report by the file's own slug first, then falls back to the tree-level `docs` report — so a whole-tree review followed by `/docs update auth` finds and applies just the `auth` findings. A whole-tree report stays in place until you have run `/docs update` for each file with findings.

`docs update` has four modes:
1. **Scaffold** (`--scaffold`): creates missing doc files (via `scripts/scaffold.py`) and inserts missing section headings with `<!-- @agent: … -->` markers. Does not generate prose. Does not touch existing content.
2. **Report exists**: consumes the review report's findings for the target file and applies verbatim replacements.
3. **No report, small changes**: audits and applies minimal fixes directly.
4. **No report, large changes**: runs a review first so you can inspect before applying.

The escalation threshold is: more than 5 files need changes, or any single file needs more than 40% of lines changed, or any required doc is absent. Use `--force` to skip.

## Scaffold Mode

`docs new` scaffolds missing docs by running `scripts/scaffold.py` — it copies `references/templates/{type}.md` verbatim and replaces each `{key}` token from the `--vars '{json}'` dict (`{name}`, `{path}`, and any other token a template uses). `docs update --scaffold` uses the same script for a missing file and inserts only the missing sections into an existing one. `docs retcon --scaffold` scaffolds every doc retcon would author, then stops — no content authoring. None of these generate prose or overwrite existing text.

`docs retcon` authors real content from the codebase. It first handles existing docs: if any exist under `docs/` (or a repo-root `README.md`), it moves them to `docs/legacy/`, confirms their facts against the code, and carries those facts into the new docs. If a legacy doc looks machine-generated, it asks whether to include its facts or replace it entirely. It scaffolds each doc the same way `new` does, reads the component's code, and fills every `@agent` marker with real prose, diagrams, and tables. It finishes by validating every doc's `globs` against the real code tree (per `validate.md`), so no doc claims paths that do not exist and every discovered component has an owning doc.

Each scaffolded section carries an `<!-- @agent: … -->` marker — the fill-in prompt (see `references/scaffold.md`):
```
<!-- @agent: 3 sentences max: what is this, where does it live, why does it exist. -->
```
A marker whose text starts with `(optional)` marks a section you may delete.

Find all markers:
```bash
grep -rn "@agent" "$DOCS_DIR/" README.md
```

Fill in each section, then delete its `<!-- @agent: … -->` marker.

## Docs directory structure

Docs follow a mandated layout (`references/structure.md`). The mandated top level is `README.md` (at the repo root), `docs/user-guide.md`, `docs/development-guide.md`, `docs/ci.md`, and `docs/architecture/index.md` (`ci.md` is present-if-applicable). The architecture doc is always `docs/architecture/index.md`; a leaf component is `docs/architecture/<name>.md`; a component with sub-components becomes a directory `docs/architecture/<name>/` with `index.md` plus its child docs, recursively. See `references/structure.md` for the full layout and the component type-detection table.

## Coverage & API boundaries

Every doc declares the repo paths it owns in a `globs:` frontmatter block. One owner per path; a parent references a nested child only through the child's public API. Section structure, required diagrams, the public API section, and Components are all derived from templates (`references/template-contract.md`). Full rules: `references/coverage-and-api.md`. `review` flags violations; `new`, `retcon`, and `update` keep coverage accurate; `validate` confirms globs are valid and comprehensive against the real code tree.

## Component type detection

See the table in `references/structure.md` (single source). At a glance: path/name contains `auth` → auth; `libs/`/`packages/` → library; `apps/*/routes/api/`/`*/api/*` → api; `apps/*/routes/*`/`libs/ui/*`/`libs/feature-*` → frontend; infra-ish (`infra/modules/*`, `terraform/*`) → generic.

## Annotations

Write notes for the agent in any doc: `<!-- @agent: guidance -->` or `<!-- @edit: instruction -->`. Run `/docs update` to apply them. See `skills/shared/annotations.md`.
