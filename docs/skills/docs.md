# docs

Generate, update, review, and retroactively create engineering documentation from standard templates.

## Workflows

### new -- create one or more doc files

Generate a specific documentation file (or multiple files at once) using the appropriate component-type template.

```bash
/docs new auth --type library          # generate docs/architecture/auth.md
/docs new auth storage payments        # batch: generate three files
/docs readme                           # generate docs/README.md
/docs architecture                     # generate docs/architecture/README.md
```

If `--type` is omitted, the type is auto-detected from the component's path in the codebase (`libs/` -> library, `apps/*/routes/api/` -> api, etc.).

### update -- add to an existing doc from session context

Update an existing documentation file with additions based on changes visible in the current session. Additive only -- existing content is preserved.

```bash
/docs update auth                      # update auth.md from session changes
/docs update storage                   # update storage.md
```

Detects new env vars, new API endpoints, new design decisions, and new flow steps from the conversation, then adds them to the appropriate sections.

### review -- audit docs/ for template adherence

Evaluate Markdown files in `docs/` against the skill's template standards. Read-only -- nothing is modified. Emits a per-file gap report.

```bash
/docs review                           # audit all of docs/
/docs review docs/architecture/        # audit one directory
/docs review docs/architecture/auth.md # audit one file
/docs review --json                    # machine-readable output
```

Checks for: required sections (Overview, Requirements, Design, Implementation, References), prescribed Mermaid diagram types, undefined acronyms, and second-person voice violations.

### retcon -- generate full docs/ for a codebase with none

Discover all major components in the codebase and generate a complete `docs/` structure from scratch. Useful when inheriting a project with no documentation.

```bash
/docs retcon                           # full codebase docs generation
/docs retcon --dry-run                 # preview manifest before generating
```

## Templates

All generated docs follow the section order: `Overview -> Requirements -> Design -> Implementation -> References`.

Four component-type templates are available:

| Type | Use for |
|------|---------|
| `api` | REST endpoint groups (`/api/`, route handlers) |
| `library` | Monorepo packages (`libs/`, `packages/`) |
| `frontend` | Svelte/React features, UI component libraries |
| `infra` | Terraform modules (`infra/modules/`) |

## Writing Standard

Generated docs follow a junior-dev-friendly writing standard:
- Define every acronym on first use
- One idea per sentence
- Explain "why" before "what" for non-obvious decisions
- Mermaid diagrams replace prose for all multi-step flows
