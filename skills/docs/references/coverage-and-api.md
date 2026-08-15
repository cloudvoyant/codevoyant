# coverage-and-api — doc↔code coverage and API-boundary rules

Single source of truth for the coverage and API-boundary model. `new.md`, `update.md`, and `review.md` all reference this file. Do not restate these rules elsewhere.

The nested parent/child model below maps onto the mandated directory layout in `references/structure.md`: each directory's `index.md` is the parent (superset glob); the child docs beside it own their sub-paths (subset globs).

## The model

### Rule 1: Every doc declares the paths it covers

Every doc starts with a YAML frontmatter block that lists the repo paths (globs) the doc is the single source of truth for:

```
---
# @agent: the subdirs/files this doc owns (this line is authoring guidance)
globs:
  - "libs/auth/**"
---
# {Title}
```

- The `---` frontmatter block is at the very top of the file, before the `# Title` H1, so VitePress and other tools parse it. Nothing may precede the opening `---`.
- Only `globs:` — no title/status/tags. The `# Title` H1 stays immediately after the frontmatter.
- The `# @agent:` marker is a YAML `#` comment INSIDE the block (an HTML comment above the `---` would stop tools from parsing the frontmatter). It is authoring guidance and is dropped once `globs` is filled.
- List the subdirs and files this doc owns. A doc that documents `libs/auth` lists `"libs/auth/**"`.
- Empty or missing `globs:` is a violation (see review Rule 1).

### Rule 2: One owner per path

No two docs may cover the same subdirs or files.

**Detection:** compare every pair of docs' `globs`. For each pair, test whether their glob sets intersect (any path matched by both).

- **Disjoint** (no shared path) → OK.
- **Strict subset** (one doc's coverage is fully contained in the other's) → OK, this is a **nested** parent/child pair (see Rule 3).
- **Intersecting but neither is a subset** (identical, or partially overlapping) → **violation** (duplicate coverage). Name both docs.

A practical test for "strict subset": doc A's globs are a subset of doc B's when every path A matches is also matched by B, and B matches at least one path A does not (e.g. `libs/auth/**` ⊂ `libs/**`). Identical glob sets are NOT a subset → violation.

**Index-doc exemption.** Index docs are navigational overviews that intentionally span the whole tree (`globs: ["**"]`). They are the project README at the repo root (`README.md`, from `project-readme.md`) and the architecture doc (`docs/architecture/index.md`, from `architecture.md`). Both carry `index: true` in their frontmatter. The other top-level docs — `docs/user-guide.md`, `docs/development-guide.md`, `docs/ci.md` — are NOT index docs: they own concrete globs (user-facing entry points; dev-tooling/task config; and CI/release + repo-wide infra config respectively — see `references/structure.md`) and participate normally in one-owner-per-path. Their globs are disjoint from each other. `docs/ci.md` owns the repo-wide infra config (e.g. `infra/**`) as well as CI/release config, so it may be a superset of an infra COMPONENT doc under `docs/architecture/` that owns a specific module (e.g. `infra/modules/cdn/**`) — that is a nested parent/child pair (Rule 3), not a duplicate-coverage violation. (A nested component's `index.md` is NOT one of these `**`-spanning index docs — it owns only its subtree and participates normally in the pairwise comparison; see `references/structure.md`.) Index docs are **exempt** from Rule 2: they are not part of the one-owner-per-path model, so a `**`-spanning index doc never counts as duplicate coverage against another index doc or against any component doc it overlaps. When computing overlaps, **drop every doc with `index: true` from the pairwise comparison entirely** — including the index-vs-index pair. Index docs still follow Rules 3 and 5 (they reference each component through its public API, not its internals).

### Rule 3: Nested docs reference the child through its interface only

A parent doc (superset glob, e.g. `libs/**`) may overlap a child doc (subset glob, e.g. `libs/auth/**`). But the parent must:

- **Name and link the child** in its `## Design` `[components]` subsection (the template-marked heading — see `references/template-contract.md`) — this is where sub-component doc links live. (They do NOT belong in `## References`, which lists technical/external sources only.)
- Reference the child module **only through its public API/interface** — the child's documented API section.
- **Never** restate the child's internals or depend on them.

The child owns its subtree; the parent treats it as a black box with a documented surface: named + linked in Design's Components section, referencing the child's public API section, never its internals.

### Rule 4: Module/component docs make their public API clear

Each module/component doc has an explicit API/interface section that documents its public surface. The section is declared by the template: the heading whose marker carries `[public-api]` (see `references/template-contract.md`). `new.md`, `review.md`, `update.md`, `retcon.md`, and `validate.md` read the resolved template — never a hard-coded section name. Edit a template's `[public-api]` marker and every workflow follows.

This section is the contract other docs are allowed to reference.

### Rule 5: Cross-module references use the offered API only

When any doc references another module, it references that module's documented public API only — the target doc's API/interface section — never the target's internal implementation.

## Detection procedure (best-effort, grep/parse)

Run this over the audited tree (`docs/` by default). It is heuristic — good enough to flag the common violations.

### Step A: Parse each doc's globs

For every `docs/**/*.md`, read the leading frontmatter and extract the `globs:` list:

```bash
# List all docs and whether they declare globs
for f in $(find docs -name "*.md" -not -path "*/node_modules/*"); do
  # frontmatter is the block between the first two '---' lines
  awk 'NR==1 && $0=="---"{fm=1;next} fm && $0=="---"{exit} fm{print}' "$f" \
    | grep -q "globs:" && echo "$f: HAS_GLOBS" || echo "$f: NO_GLOBS"
done
```

Build `COVERAGE` — a map of `doc_path → [globs...]`. A doc with no frontmatter or an empty `globs:` list → **Rule 1 finding** (missing/empty globs).

Also read the `index:` flag from each doc's frontmatter. A doc with `index: true` is an **index doc** (see Rule 2) — record it, but **exclude it from the pairwise overlap comparison in Step B**. Index docs still declare `globs` (so they do not trip Rule 1), and still run the API-boundary checks in Step C.

### Step B: Compute overlaps (Rule 2 / Rule 3)

First, **drop every index doc** (`index: true`, per Step A / Rule 2) from `COVERAGE`. Index docs span `**` by design and are exempt from Rule 2 — they never participate in this pairwise comparison. Then, for every remaining pair of docs `(A, B)`:

1. Determine the relationship between A's globs and B's globs:
   - **disjoint** — no path is matched by both → OK.
   - **A ⊂ B** or **B ⊂ A** (strict subset) → nested pair; record the parent (superset) and child (subset). Continue to Step C for this pair.
   - **overlapping-not-subset** (intersect but neither strict subset, incl. identical) → **Rule 2 finding**: duplicate coverage. Name both docs.

   Subset heuristic: normalise each glob to its directory prefix (strip a trailing `/**` or `/*`; an extension glob like `libs/auth/*.ts` normalises to its directory `libs/auth`). Compare prefixes on **whole path segments, not raw string `startsWith`**: split each prefix on `/` and test segment-by-segment, so `libs/auth` contains `libs/auth/oidc` but does **not** contain `libs/authz` (the second segment `auth` ≠ `authz`). A ⊂ B if every A-prefix is contained (segment-wise) by some B-prefix, and at least one B-prefix is not covered by A. Identical prefix sets = not a subset. This is a documented best-effort heuristic — when it cannot decide (e.g. a bare `*` or an extension-only glob at the same directory as a subtree glob), do not flag.

### Step C: API-boundary checks (Rule 3 / Rule 4 / Rule 5)

For each doc, resolve its template (see `references/structure.md` type detection) and read the `[public-api]`-marked heading from that template (`references/template-contract.md`). That heading is the doc's API/interface section.

- **Rule 4 finding** — the doc has no API/interface section (the `[public-api]`-marked heading from its template) → flag "missing API/interface section".
- **Rule 3 finding** — for each nested parent found in Step B, scan the parent doc for references to the child's subtree. If the parent names the child's internal files, functions, or types (paths under the child's globs that are NOT listed in the child's API section) rather than linking the child doc and using its API section → flag "parent documents/depends on child internals".
- **Rule 5 finding** — for each cross-module reference (a link or mention of another doc's module), check the referenced symbol against that module's API section. If the reference points at an internal file/function/type absent from the target's API section → flag "references another module's internals".

These checks are best-effort. When the heuristic cannot decide, do not flag.

## Finding types

Emit these as review findings (see `docs-review-template.md`) using severity type `COVERAGE`:

| Finding | Message |
|---|---|
| Missing/empty globs | `Missing 'globs:' frontmatter` |
| Duplicate coverage | `Duplicate coverage: {docA} and {docB} both cover {overlap} (not nested)` |
| Parent uses child internals | `{parent} references {child} internals; use {child}'s API section instead` |
| Missing API section | `Missing API/interface section ({expected} for {type})` |
| Cross-module internals | `{doc} references {target} internals; use {target}'s public API` |

## Diff scoping (update and review)

`update` and `review` restrict their work to the branch diff: they only read code that changed and only touch docs whose `globs` intersect the change. This keeps both workflows minimal-change and fast.

### Step D: Compute the changed file set

The diff base is the merge-base of the current branch against `main` (or `--diff <base>` to override; `update` also reads `--diff`, default `main`):

```bash
git diff --name-only "$(git merge-base "$BASE" HEAD)" HEAD | sort -u   # CHANGED
```

If the repo is not a git repo (or the base does not exist), skip diff scoping entirely and fall back to the whole repo/tree.

### Step E: A file falls inside a doc's globs

Match a changed path against the doc's `globs:` list using `scripts/scope.py` (a fast, deterministic implementation of the same segment-wise prefix heuristic as Step B — do not hand-roll glob matching):

```bash
printf '%s\n' "${CHANGED[@]}" | python3 "$SKILL/scripts/scope.py" --globs 'libs/auth/**'
```

A changed file is **in scope** for a doc if `scope.py` emits it for that doc's globs.

### Step F: Apply the scope

- **update:** the doc's in-scope files are `CHANGED ∩ {paths the target doc's globs contain}`. Read only those files; author/update only the sections they affect (env vars, endpoints, flows, requirements, API). Do not touch sections no changed file affects.
- **review:** the per-file agents verify content only against in-scope changed files. If a doc's globs intersect `CHANGED`, run the full check set on it; structure/language checks still apply to every doc in `TARGET_PATH`, but code-accuracy findings are only produced from in-scope files.
