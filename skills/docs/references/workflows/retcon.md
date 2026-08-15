# retcon — author documentation from the codebase

retcon reads the code and writes the full mandated documentation. It fills every section of every resolved template with real prose, diagrams, and tables. It is the only docs command that produces real content. To lay down empty skeletons and stop, use `/docs new` (or `/docs retcon --scaffold` to scaffold the full tree retcon would author, without authoring content).

retcon scaffolds the same way `new` does. It runs `scripts/scaffold.py` to lay each skeleton. Then it reads each component's code and replaces every `<!-- @agent: … -->` marker with real content. retcon reads code. It never parses templates itself.

## Variables

- `DRY_RUN` — true if `--dry-run` present (preview the manifest, write nothing)
- `SCAFFOLD_ONLY` — true if `--scaffold` present (scaffold the full tree, do not author content)
- `SKIP_EXISTING` — true by default; `--overwrite` to regenerate existing files
- `TYPE_FLAG` — value of `--type` if provided, else `""` (auto-detect per component)
- `SKILL` — this skill's directory; the scaffold script is `$SKILL/scripts/scaffold.py`
- `DOCS_DIR` — `docs/` relative to project root

## Step 0: Handle existing docs

Decide what to do with docs that already exist before authoring new ones.

**Scaffold-only.** If `SCAFFOLD_ONLY`, skip this step — never move or touch existing docs; only lay down missing skeletons (the scaffold script skips existing files unless `--overwrite`). Go to Step 1.

**No existing docs.** If `docs/` does not exist or is empty (and no `README.md` at the repo root), skip this step. Go straight to Step 1.

**Existing docs.** If any doc exists, do this:

1. Move every existing doc under `docs/` (and the repo-root `README.md` if present) into `docs/legacy/`, keeping the same relative paths. For example `docs/user-guide.md` becomes `docs/legacy/user-guide.md`. Never delete them.
2. Read each legacy doc. Confirm which facts are still correct by checking them against the code.
3. Add the legacy docs to context. An existing doc means the user judged it important. Carry its facts forward into the new docs: commands, endpoints, env vars, terminology, and structure.
4. If a legacy doc looks machine-generated (no real identifiers, no `globs` frontmatter, boilerplate prose, invented commands), ask the user (AskUserQuestion): "This doc looks machine-generated. Include its facts or replace it entirely?" Do not silently carry machine-generated content.

## Step 1: Load reference docs

Read before authoring any content:

1. `references/language-guide.md` — apply all rules to every line of prose
2. `references/mermaid-guide.md` — use the prescribed diagram types
3. `references/coverage-and-api.md` — set each doc's `globs:` coverage and respect the API-boundary rules
4. `references/structure.md` — the mandated `docs/` layout and top-level docs
5. `references/template-contract.md` — the marker tokens that mark required sections, the public API, and Components

## Step 2: Codebase discovery

Scan the repository to build a component manifest.

**Application packages:**
```bash
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.codevoyant/*" | \
  xargs grep -l '"name"' 2>/dev/null | sort
```

**Terraform modules:**
```bash
find . -type d -name "modules" -not -path "*/.codevoyant/*" | \
  xargs -I{} find {} -maxdepth 1 -mindepth 1 -type d 2>/dev/null
```

**API route groups (SvelteKit / Next.js patterns):**
```bash
find . -path "*/routes/api*" -name "+server.ts" -not -path "*/node_modules/*" | \
  sed 's|/[^/]*$||' | sort -u
```

Apply the type detection table from `references/structure.md` (the single source) to each discovered path. `--type` forces the type for all components.

**Detect top-level config** for the present-if-applicable docs (Step 3):
```bash
# CI present? (candidate globs from templates/ci.md frontmatter)
ls .github/workflows/* .github/actions/* .gitlab-ci.yml .circleci/config.yml .travis.yml Jenkinsfile* bitbucket-pipelines.yml azure-pipelines.yml 2>/dev/null | head
# Infra present?
find . \( -path "*/infra/*" -o -path "*/terraform/*" -o -name "*.tf" -o -name "Pulumi.yaml" -o -name "Dockerfile*" -o -name "docker-compose*" \) -not -path "*/node_modules/*" 2>/dev/null | head
```

Build `MANIFEST` — array of `{ name, path, type }` entries.

## Step 3: Determine the docs to author

Follow the mandated layout in `references/structure.md`. Always author:
- `README.md` (repo ROOT, not under `docs/`) — the project README, from `templates/project-readme.md`
- `docs/user-guide.md` — the user-facing guide, from `templates/user-guide.md`
- `docs/development-guide.md` — the contributor-facing guide, from `templates/development-guide.md`
- `docs/architecture/index.md` — the architecture doc, always at this path, from `templates/architecture.md`

Author present-if-applicable (from Step 2 detection):
- `docs/ci.md` — the CI/CD + infrastructure doc; include it when the repo has CI config (any of the CI candidate globs in `templates/ci.md` frontmatter) OR infra config (`infra/**`, `terraform/**`, `**/*.tf`, `Pulumi.yaml`, `Dockerfile*`, `docker-compose*`); from `templates/ci.md`

Add each manifest entry as a component doc at its `references/structure.md` path: a leaf entry → `docs/architecture/{name}.md`; an entry that contains sub-modules → `docs/architecture/{name}/index.md` (a directory) with its children beside it (`{child}.md` for a leaf, `{child}/index.md` when it has its own children), recursively. Detect nesting from the manifest paths (a discovered module under another discovered module is its child). An infra-ish module (Terraform module) uses `generic.md`.

## Step 4: Manifest report and confirm

Present the manifest:
```
Retcon will author (from the code):

  README.md                                    (project README, repo root)
  docs/user-guide.md                           (user-facing guide)
  docs/development-guide.md                    (contributor guide)
  docs/ci.md                                   (CI/infra config detected)
  docs/architecture/index.md                   (architecture)
  docs/architecture/auth.md                    auth     <- libs/auth (leaf)
  docs/architecture/db.md                      library  <- libs/db (leaf)
  docs/architecture/storage/index.md           library  <- libs/storage (has sub-components)
  docs/architecture/storage/blob.md            library  <- libs/storage/blob (leaf child)
  docs/architecture/api-images.md              api      <- apps/web/src/routes/api/images
  docs/architecture/infra-cdn.md               generic  <- infra/modules/cdn

{N} docs to author. Run without --dry-run to proceed.
```

If `--dry-run`, stop here. Otherwise ask (AskUserQuestion): "Author all {N} docs from the code?" — Yes / Edit manifest / Cancel. On "Edit manifest", present the list as editable text via Other, then re-parse.

**Skip existing by default.** A file that already exists is skipped (report as skipped) unless `--overwrite` is set, in which case it is regenerated. Never silently clobber.

**Scaffold-only (`--scaffold`).** If `SCAFFOLD_ONLY`, do NOT author content. Scaffold every mandated + manifest doc with the script (same per-doc command as Step 5a, using `--overwrite` when set), leaving each `@agent` marker in place for a human to fill. Report:
```
Scaffolded {N} doc skeleton(s) across {M} file(s).
Find all fill-in markers: grep -rn "@agent" docs/
```
Then stop. Do NOT run Steps 5–7.

## Step 5: Author each doc (parallel per component)

This is the expensive, intelligent path. Fan out per-component work as parallel background Agents — one per component doc — that each read their component's code and fill its template. Then generate the index/top-level docs that reference them.

**Component docs (fan out):** launch one background Agent per component in `MANIFEST` simultaneously. Each agent receives:
- The component's `{ name, output_path, path, type }` object
- Paths to `references/language-guide.md`, `references/mermaid-guide.md`, `references/coverage-and-api.md`, `references/template-contract.md`, and `references/scaffold.md`, plus the scaffold command (`scripts/scaffold.py`)
- The full `MANIFEST` (names/paths/types of every component) so it knows the sibling set before writing cross-references
- Its component's legacy doc (if any, from Step 0) so it can carry the user's facts forward
- Instruction to complete Step 5a–5b for its component and return `{ output_path, status, public_api: [one-line list of its public API section's exported surface] }` — each agent reports its own doc's `[public-api]` surface so the reconciliation pass can verify cross-links.

Collect all component-agent results before authoring the top-level/index docs (5c), because the architecture index names+links each component.

### Step 5a: Scaffold the skeleton, then read the component's source

1. **Scaffold** the skeleton with the script (same path `new` uses — `references/scaffold.md`):
   ```bash
   python3 "$SKILL/scripts/scaffold.py" --out {output_path} --template {type} --vars '{"name": "{name}", "path": "{path}"}' --overwrite
   ```
   This copies the resolved template and fills each `{key}` token from the `--vars` dict (`{name}`/`{path}`, so the frontmatter's `globs` already points at the component's directory). retcon does not parse the template itself.
2. **Read the real code** so the doc is accurate: package metadata (`package.json`/`Cargo.toml`/etc.), entry points and exports (`index.ts`, public modules), route handlers, config files, env vars, and for infra the Terraform/module definitions. Author from what the code actually does — never invent identifiers, endpoints, or env vars.

### Step 5b: Replace each `@agent` marker with real content

Open the scaffolded doc and replace every `<!-- @agent: … -->` marker with real content authored from the code, then delete the marker. The marker text is the authoring guidance for that section; the copied mermaid/table below it is the shape to fill.

1. **Frontmatter is already correct.** The `---` block is first and `globs:` already points at the component's directory. Adjust the glob only if the doc owns a narrower/wider subtree than `{path}` (a component that OWNS sub-components covers its subtree only). The doc carries no stored type marker — review re-derives the doc's type from its code path (its `globs`) using the type table in `references/structure.md`.
2. **Public API section** (the template's `[public-api]`-marked heading — see `references/template-contract.md`) must be explicit — the surface other docs reference.
3. **Design → Components**: name the component's key parts; whenever this doc delegates to a sub-component that has its OWN doc, NAME and LINK it here (referencing its public API section, not its internals — see `references/coverage-and-api.md` Rule 3). Sub-component doc links live in Components, NOT in `## References` (technical/external sources only).
4. **Type-specific detail** from the source: request-lifecycle `sequenceDiagram` in `api` docs only; a data-model (`erDiagram`/type table) in `api`/`library`/`auth` docs; auth flow in `auth`; user flow in `frontend`; per the mermaid guide.
5. **Delete any `(optional)` section** whose content does not apply (e.g. no env vars → delete the Environment Variables section). Keep required sections.
6. **Carry forward legacy facts.** If a legacy doc for this component exists, incorporate its still-correct details (commands, endpoints, env vars, terminology). Do not repeat facts the code contradicts.
7. Apply all language-guide rules to written prose (STE-terse). Leave a `<!-- TODO: … -->` only for the rare thing that genuinely needs a human decision.

### Step 5c: Author the top-level and index docs

After the component docs are written, scaffold each mandated top-level doc with the script (`scripts/scaffold.py --out {out} --template {template} --vars '{"name": "{name}", "path": "{path}"}' --overwrite`; for an index/top-level doc with no code path, omit `path` — `--vars '{"name": "{name}"}'`), then author its content by replacing the `@agent` markers (Step 5b):
- `README.md` (project README, repo root) and `docs/architecture/index.md` (architecture) are the index docs — keep `index: true` + `globs: ["**"]`, cover the whole tree, and reference each component through its public API (a leaf as `./{component}.md`, a component with sub-components as `./{component}/index.md`). The architecture index's Design `[components]` section names+links EVERY component doc. The repo-root `README.md` links DOWN into `docs/` (e.g. `docs/architecture/index.md`, `docs/user-guide.md`).
- `docs/user-guide.md` (user-guide template) — author user-facing install/quickstart/usage/configuration from the CLI/binary entry, public commands, and user config. It owns concrete user-facing globs (NOT an index doc).
- `docs/development-guide.md` (development-guide template) — author from the project's real task runner. Detect it (`/task detect` / `/task list`) and use its real task names — never invent commands. Owns dev-tooling/task config globs (NOT an index doc).
- `docs/ci.md` (ci template, if applicable) — author the CI/CD pipelines/release from the workflow files, and the `## Infrastructure` section from the repo's infra config (delete that section if the repo has no managed infra). Owns CI/release + repo-wide infra config globs (NOT an index doc).

### Step 5d: Write and coverage-check

Write each doc in place (the scaffold script already created its parent dirs in Step 5a; the top-level/index docs in 5c are scaffolded the same way). After writing, run the coverage-overlap check from `references/coverage-and-api.md` (Step B) over the tree: skip docs carrying `index: true`; a non-nested overlap → warn and suggest narrowing one doc's `globs`; a strict-subset overlap → note the nested parent/child relationship; disjoint → no action. Surface these in the Step 7 summary; do not block the write.

### Step 5e: Reconcile cross-references

After every doc is written, verify the cross-links between docs. Each parallel agent sees only its own component, so it cannot verify links to other docs. The reconciliation pass checks: each component doc's Components section and the architecture index's Components section must NAME + LINK every sibling/child it delegates to, using that doc's **actual** `[public-api]` surface (the `public_api` summaries collected in Step 5). A link whose target surface does not exist, or that points at another doc's internals, is a bug — fix it in the doc. This pass runs on the final tree, so no agent authors a link it cannot verify.

## Step 6: Validate globs

Run the code-reading checks from `validate.md` over the tree you just wrote. Fix every violation before you finish.

1. **Glob validity.** Expand every glob against the repo's real paths. A glob that matches nothing is a dead ownership claim — remove it or correct it. Use `scripts/scope.py` with the full path list:
   ```bash
   git ls-files | python3 "$SKILL/scripts/scope.py" --globs '<doc glob>'
   ```
   The two index docs (`README.md`, `docs/architecture/index.md`) own `**` by design — always valid. The top-level `docs/ci.md` globs must be trimmed to the CI provider, release tool, and infra dirs this repo actually has (see `templates/ci.md` frontmatter).
2. **Glob comprehensiveness.** Every discovered component (from Step 2) must have a doc whose globs own its path. A discovered component with no owning doc is a gap — author its doc.
3. **One owner per path.** Re-run the coverage-overlap check (Step 5d) if any glob changed. No two non-index docs cover the same path unless one is nested in the other.
4. **API boundaries.** Each component doc exposes the `[public-api]`-marked section from its template; no doc references another module's internals.

Fix what fails. Do not finish with a known violation.

## Step 7: Report

```
Retcon complete — {N} docs authored, {M} skipped (already existed):

  {output_path} — {type} template
  ...

  {any coverage warnings}

Legacy docs (if any) are preserved under docs/legacy/.

Run /docs review to audit.
```
