# structure — the mandated docs/ directory layout

Single source of truth for where docs live, the path→template mapping, and component type detection. `new.md`, `review.md`, `retcon.md`, `update.md`, `scaffold.md`, and `validate.md` all reference this file. The coverage model in `references/coverage-and-api.md` maps directly onto this layout: each directory's `index.md` owns that subtree's `globs`; child docs own their sub-paths; a parent refers to a child only through the child's interface.

Section headings inside each doc are NOT described here — templates are the single source of structure (see `references/template-contract.md`).

## Canonical layout

```
README.md               # top-level project doc — lives at the REPO ROOT (project-readme template)
docs/
  user-guide.md          # user-facing: install, quickstart, usage, configuration (user-guide template)
  development-guide.md   # contributor-facing: common development tasks (development-guide template)
  ci.md                 # CI/CD + infrastructure: pipelines, release, infra layout, resources, environments (ci template)
  architecture/
    index.md            # THE architecture (system) doc — always here, never README.md
    <component>.md       # a leaf component doc (no sub-components)
    <component>/         # a component that HAS sub-components → becomes a directory
      index.md           # that component's own doc
      <subcomponent>.md   # a leaf sub-component
      <subcomponent>/     # a sub-component that itself has children → recurse
        index.md
        ...
```

## Mandated top-level docs

Four docs plus the architecture doc form the mandated top level of every managed repo. The project README lives at the repo root (`README.md`); every other doc is under `docs/`:

| Doc | Template | Owns |
|-----|----------|------|
| `README.md` | `project-readme.md` | index doc — spans `**` (repo root) |
| `docs/user-guide.md` | `user-guide.md` | user-facing entry points (CLI/binary entry, public commands, user config — e.g. `bin/**`, `src/cli/**`) |
| `docs/development-guide.md` | `development-guide.md` | dev-tooling + task-runner config (`mise.toml`, `package.json`, `justfile`, `tsconfig*.json`, lint/format config) |
| `docs/ci.md` | `ci.md` | CI/CD + infrastructure config — the FULL candidate glob set is in `templates/ci.md` frontmatter; the doc must TRIM to only what the repo actually has (the CI provider, release tool, and infra dirs present). Present-if-applicable. |

`user-guide.md`, `development-guide.md`, and `ci.md` own concrete globs and participate in one-owner-per-path (they are NOT `index:`-exempt — see `references/coverage-and-api.md`). Their globs are disjoint from each other. `docs/ci.md` owns the repo-wide infra config as well as the CI/release config; an infra COMPONENT doc under `docs/architecture/` owns a specific module's subtree — that is nested coverage, not a collision.

`user-guide.md` is the user-facing counterpart to the contributor-facing `development-guide.md`: install/quickstart/usage/configuration for someone consuming the project, not building it. It owns the user-facing entry paths (CLI/binary, public config); if the project has no concrete user-facing path to own, it stays a documented top-level doc with narrow globs. `ci.md` is present-if-applicable: a repo with no CI and no managed infra legitimately omits it. `user-guide.md`, `development-guide.md`, and `README.md` apply to every repo.

## Rules

- The architecture doc is ALWAYS `docs/architecture/index.md`. Never a README in that directory.
- A component is a single `<name>.md` file when it has no sub-components. When it has sub-components it is a directory `<name>/` containing `index.md` (the component's own doc) plus its child docs, recursively.
- Promotion: when a leaf `<name>.md` gains a sub-component, promote it to `<name>/index.md` and add the child docs beside it.
- Each directory's `index.md` owns that subtree's `globs`. Child docs own their sub-paths. This is the nested parent/child coverage in `references/coverage-and-api.md`: the parent (`index.md`) refers to a child only through the child's public API/interface section, never its internals.

## Component type detection (single source of truth)

Used by `new.md` Step 3, `retcon.md` Step 2, `review.md` Step 2, `update.md` Step 1a, and `validate.md`. Resolve a component's template by its code path. Check `auth` first, then the rows below; a Terraform/infra module has no dedicated template and uses `generic.md`; if the type is still unclear, ask the user (api / library / frontend / auth / generic).

| Path pattern | Type | Template |
|---|---|---|
| path/name contains `auth` | `auth` | `auth.md` (library-derived) |
| `libs/*`, `packages/*` | `library` | `library.md` |
| `apps/*/routes/api/*`, `*/api/*` | `api` | `api.md` |
| `apps/*/routes/*` (not api), `libs/ui/*`, `libs/feature-*` | `frontend` | `frontend.md` |
| infra-ish (Terraform module, `infra/modules/*`, `terraform/*`) | `generic` | `generic.md` |
| Can't determine | ask (api / library / frontend / auth / generic) | — |

Repo-wide infra layout/resources/environments belong to `docs/ci.md`, not a component doc.

## Cross-links between docs

- The architecture `index.md` links to a leaf component as `./<component>.md` and to a component-with-sub-components as `./<component>/index.md`.
- A component doc links UP to the architecture doc as `./index.md` (from a leaf `<name>.md`) or `../index.md` (from a nested `<name>/index.md`).
- A component doc links to a sibling or child component through that component's `index.md` (or leaf `<name>.md`).
- The top-level project README (`README.md`, at the repo root) links DOWN into `docs/` — to the architecture doc as `docs/architecture/index.md`, and to `docs/user-guide.md` / `docs/development-guide.md` / `docs/ci.md`. A `docs/`-tree doc that links UP to the project README uses the repo-root path (from `docs/architecture/index.md` that is `../../README.md`).

See `references/coverage-and-api.md` for the coverage and API-boundary rules that this layout enforces.
