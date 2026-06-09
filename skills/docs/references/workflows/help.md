# docs -- command reference

Generate, update, review, and retroactively create engineering documentation.

## Commands

```
/docs new [component...] [--type api|library|frontend|infra]
                           Generate one or more specific doc files
/docs new readme           Generate docs/README.md
/docs new architecture     Generate docs/architecture/README.md
/docs update [component]   Update existing doc from current session changes
/docs review [path]        Audit docs/ for template adherence (read-only)
/docs retcon               Generate complete docs/ for a repo with none
/docs retcon --dry-run     Preview what would be generated
/docs help                 Show this reference
```

## Flags

| Flag | Description |
|------|-------------|
| `--type api` | Force API component template |
| `--type library` | Force library template |
| `--type frontend` | Force frontend feature template |
| `--type infra` | Force Terraform module template |
| `--dry-run` | Preview without writing any files |
| `--json` | Machine-readable output (review only) |
| `--overwrite` | Regenerate existing files (retcon only) |

## Template sections (all docs)

```
## Overview       -> what it is, where it lives, why it exists
## Requirements   -> measurable properties it must satisfy
## Design         -> key decisions with rationale
## Implementation -> flows, file structure, env vars, config
## References     -> links to source files and external docs
```

## Component type detection

| Your component lives in... | Auto-detected type |
|---|---|
| `libs/`, `packages/` | library |
| `apps/*/routes/api/`, `*/api/*` | api |
| `apps/*/routes/*`, `libs/ui/*`, `libs/feature-*` | frontend |
| `infra/modules/*`, `terraform/*` | infra |
