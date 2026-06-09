# dev docs -- command reference

Generate and update engineering documentation from standard templates.

## Commands

```
/dev docs                          Auto-detect missing docs, generate stubs
/dev docs readme                   Generate / update docs/README.md
/dev docs architecture             Generate / update docs/architecture/README.md
/dev docs architecture {name}      Generate / update docs/architecture/{name}.md
/dev docs help                     Show this reference
```

## Flags

| Flag | Description |
|------|-------------|
| `--type api` | Force API component template |
| `--type library` | Force library component template |
| `--type frontend` | Force frontend feature template |
| `--type infra` | Force infrastructure module template |

## Template sections (all docs)

```
## Overview       -> what it is, where it lives, why it exists (3 sentences)
## Requirements   -> what it must do (measurable properties)
## Design         -> key decisions and "why"
## Implementation -> specific flows, file structure, config
## References     -> links to code and external docs
```

## Component type guide

| Your component is... | Use `--type` |
|----------------------|-------------|
| REST/RPC endpoint group (`/api/...`) | `api` |
| Monorepo package (`libs/`, `packages/`) | `library` |
| Svelte/React feature or UI lib | `frontend` |
| Terraform module (`infra/modules/`) | `infra` |

## Mermaid diagram slots (by type)

| Template | Diagrams included |
|----------|-----------------|
| project-readme | system topology flowchart |
| architecture README | topology, ER model, request sequence, lib dependency graph, CI/CD |
| api | request sequence diagram |
| library | internal architecture dependency graph |
| frontend | user flow flowchart, component tree |
| infra | resource architecture diagram |
