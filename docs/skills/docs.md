# docs

Generate, update, review, and retroactively create engineering documentation in simple technical English (STE), from standard templates.

The `docs` skill is template-driven. Every doc is scaffolded from a copy-ready template, and every scaffolded section carries a `<!-- @agent: … -->` marker — the fill-in prompt for whoever authors that section (see `references/scaffold.md`). The writing standard is Simplified Technical English: short sentences, defined acronyms, diagrams instead of prose for multi-step flows.

## Workflows

### new -- scaffold doc skeletons

Scaffold the docs structure by running `scripts/scaffold.py`, which copies a template verbatim and fills each `{key}` token from a `--vars` dict. `new` never generates prose and never analyzes code — it lays down the skeleton with `@agent` prompts and stops.

```bash
/docs new                        # scaffold the base skeleton
/docs new auth --type library    # scaffold docs/architecture/auth.md
/docs new readme                 # scaffold README.md skeleton (repo root)
/docs new architecture           # scaffold docs/architecture/index.md skeleton
/docs new --dry-run              # preview proposed skeletons without writing
/docs new --overwrite            # re-scaffold: insert missing sections into existing docs too
```

Bare `/docs new` scaffolds the mandated base structure: `README.md` (repo root), `docs/user-guide.md`, `docs/development-guide.md`, `docs/architecture/index.md`, plus `docs/ci.md` when the repo has CI or infra config, and per-app/lib component docs in monorepos. Named targets scaffold a single skeleton. Five component-type templates are available:

| Type | Use for |
|------|---------|
| `api` | REST endpoint groups (`/api/`, route handlers) |
| `library` | Monorepo packages (`libs/`, `packages/`) |
| `auth` | Auth components (library-derived) |
| `frontend` | Svelte/React features, UI component libraries |
| `generic` | Anything else, incl. Terraform modules |

If `--type` is omitted, the type is auto-detected from the component's path in the codebase (see the type table in `references/structure.md`).

### update -- apply changes to existing docs

Update documentation files. `update` has four modes, selected automatically (or by flag):

1. **Scaffold** (`--scaffold`): create missing doc files and insert missing section headings from templates. No prose. Does not touch existing content.
2. **Report exists**: consume a review report at `.codevoyant/review/{slug}/docs-review.md` and apply its verbatim replacements.
3. **No report, small changes**: audit the file against the templates and apply minimal fixes directly.
4. **No report, large changes**: escalate — run `docs review` first so you can inspect before applying (`--force` skips the threshold).

```bash
/docs update auth                # update auth.md, consuming its review report if present
/docs update --scaffold auth     # create missing files/sections with template headings only
/docs update --force             # skip the escalate threshold
```

`update` looks up the report by the file's own slug first, then falls back to the tree-level `docs` report. Throughout, it preserves human-authored text — it changes only text that is inaccurate or structurally incomplete.

### review -- audit docs/ and write a replacement report

Audit Markdown files against the templates and the STE language guide. Read-only — nothing is modified. `review` writes a verbatim, file-by-file replacement report to `.codevoyant/review/{slug}/docs-review.md` (slug derived from the reviewed path), which `update` then consumes.

```bash
/docs review                     # audit all of docs/ (slug: docs)
/docs review docs/architecture/auth.md   # audit one file (slug: docs-architecture-auth)
/docs review --json              # machine-readable output
```

Checks for: required sections (per template order), prescribed Mermaid diagram types, undefined acronyms, STE voice violations, code accuracy, and coverage/API-boundary rules.

### retcon -- author the whole docs/ tree from the codebase

The only `docs` command that writes real content. `retcon` reads the code, scaffolds each doc the same way `new` does, then fills the contract surface — tables, mermaid diagrams, runnable code samples, constrained `## Requirements`, and `## References` — replacing each `@agent` marker it consumes. It never writes prose elsewhere (see the prose policy, `references/prose-policy.md`): sections marked `<!-- @human: … -->` keep their marker untouched until a person writes them. It first handles existing docs: it moves them to `docs/legacy/`, confirms their facts against the code, and carries those facts forward (asking before carrying machine-generated content). It finishes by validating every doc's `globs` against the real code tree.

```bash
/docs retcon                     # author the whole docs/ tree
/docs retcon --dry-run           # preview the manifest retcon would author
/docs retcon --overwrite         # regenerate existing docs too
/docs retcon --scaffold          # lay down the full skeleton tree, no content
```

### validate -- code-reading check

Confirm each doc's `globs` are valid (point at real paths) and comprehensive (every discovered component has an owning doc), and that docs obey glob/component boundaries.

```bash
/docs validate                   # check globs validity + comprehensiveness
/docs validate --json            # machine-readable output
```

## Review → update pipeline

`docs review` audits docs and writes a replacement report to `.codevoyant/review/{slug}/docs-review.md`. `docs update {component}` applies that report to one file — it looks up the report by the file's own slug first, then falls back to the tree-level `docs` report, so a whole-tree review followed by `/docs update auth` finds and applies just the `auth` findings. A whole-tree report stays in place until you have run `/docs update` for each file with findings.

## Writing standard

Docs follow a junior-dev-friendly Simplified Technical English standard:

- Define every acronym on first use
- One idea per sentence
- Explain "why" before "what" for non-obvious decisions
- Mermaid diagrams replace prose for all multi-step flows
- Required sections and diagrams are derived from templates (`references/template-contract.md`)

## Annotations

Annotate any doc with `<!-- @agent: guidance -->` or `<!-- @edit: instruction -->`, then run `/docs update`. See `skills/shared/annotations.md`.
