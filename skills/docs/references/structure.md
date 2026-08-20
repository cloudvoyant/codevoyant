# structure — the mandated docs/ directory layout

> **Markdown output: soft-wrap prose, never hard-wrap** — when a workflow writes a doc `.md` per this layout, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

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
    apps/                # kind bucket: deployable applications / services
      index.md           # group doc — Components name+link each module under it
      <module>.md        # a leaf module doc (single-component module)
      <module>/          # a multi-component module → becomes a directory
        index.md         # the module doc — members are ## Implementation subsections
        <sub>.md         # a leaf child doc — ONLY when the sub-component has an independent public API
    libs/                # kind bucket: shared libraries / packages
      index.md           # group doc
      <lib>.md           # a leaf library doc
      <lib>/             # a multi-component library → becomes a directory
        index.md
        <sub>.md
    ci/                  # kind bucket: CI/CD + infra modules
      index.md           # group doc
      <ci-module>.md     # a leaf CI/infra module doc
```

**Documentation grain.** A doc documents the system the way people think about it: grouped by KIND (apps|services, libs, CI), by PLATFORM when the repo has more than one deployable platform, then by MODULE within apps|services. `retcon` groups discovered components into this hierarchy before building its manifest (see `references/workflows/retcon.md` Step 2.5); `new` and `validate` follow the same grain. Simple infra artifacts (SSM parameters, S3 buckets, KMS keys) and Terraform modules belong in the owning module doc's `## Implementation`, never as their own docs.

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
- A single-component module is a leaf `<module>.md` under its kind bucket. A multi-component module is a directory `<module>/` containing `index.md` (the module doc) with each member component as an `## Implementation` subsection; a child `{sub}.md` beside the `index.md` exists ONLY when that sub-component has a distinct public API other modules consume, or is too complex to summarise in a subsection.
- A kind bucket with components gets a group doc `<kind>/index.md` whose Components name+link each module under it.
- Promotion: when a leaf module gains a sub-component with an independent public API, promote it to `<module>/index.md` and add the child doc beside it.
- Each directory's `index.md` owns that subtree's `globs`. Child docs own their sub-paths. This is the nested parent/child coverage in `references/coverage-and-api.md`: the parent (`index.md`) refers to a child only through the child's public API/interface section, never its internals.
- The architecture index (`docs/architecture/index.md`) navigates by GROUP (apps|services, libs, CI — a handful of entries), not by every implementation component.

## Grouping taxonomy

Group discovered components into the hierarchy people think in, before authoring docs. First by KIND, then by MODULE within apps|services:

- **apps** (a.k.a. services) — deployable applications/services. Within this bucket, cluster into modules using these signals (several components form ONE module):
  - They share a name prefix or a clear ownership boundary
  - They form a pipeline (producer → queue → consumer is one data flow)
  - One module calls or depends on another (caller/callee = same subsystem)
  - Removing any one of them breaks the others
  - A pre-existing README already describes them as a unit
- **libs** — shared libraries/packages
- **ci** — CI/CD + infrastructure modules

Add a PLATFORM level above the kind buckets when the repo has more than one deployable platform (web + mobile, backend + infra). A single-platform repo omits it.

Signals a component deserves its own doc:

- It has a stable public API that other modules consume independently
- It is complex enough that its internals need explanation separate from its callers
- It is deployed/versioned independently

Simple infrastructure artifacts — an SSM parameter, an S3 bucket, a KMS key — rarely warrant a standalone doc. They belong in the `## Implementation` section of the module that owns them.

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
