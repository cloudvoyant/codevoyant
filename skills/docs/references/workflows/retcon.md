# retcon — author documentation from the codebase

retcon reads the code and writes the full mandated documentation. It fills every section of every resolved template with real prose, diagrams, and tables. It is the only docs command that produces real content. To lay down empty skeletons and stop, use `/docs new` (or `/docs retcon --scaffold` to scaffold the full tree retcon would author, without authoring content).

- **Markdown output: soft-wrap prose, never hard-wrap** — when this workflow writes a `.md` artifact, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

retcon scaffolds the same way `new` does. It runs `scripts/scaffold.py` to lay each skeleton. Then it reads each component's code and replaces every `<!-- @agent: … -->` marker with real content. retcon reads code. It never parses templates itself.

**Documentation grain.** retcon documents the system the way people think about it: grouped by kind (apps|services, libs, CI), by platform when the repo has more than one, then by module within apps|services. Correctness at the wrong grain is still a bad doc: a per-directory doc shaped like a service reads as a thin wrapper around a list of outputs and hides how the system works. retcon therefore groups discovered components (Step 2.5) before building the manifest (Step 3) and keeps the architecture index at the same grain.
On a flat (non-monorepo) repo, retcon first proposes a lib/module → feature breakdown from `references/module-taxonomy.md` and asks the user to confirm it (Step 2.4) before grouping.

## Variables

- `DRY_RUN` — true if `--dry-run` present (preview the manifest, write nothing)
- `SCAFFOLD_ONLY` — true if `--scaffold` present (scaffold the full tree, do not author content)
- `SKIP_EXISTING` — true by default; `--overwrite` to regenerate existing files
- `TYPE_FLAG` — value of `--type` if provided, else `""` (auto-detect per component)
- `SKILL` — this skill's directory; the scaffold script is `$SKILL/scripts/scaffold.py`
- `DOCS_DIR` — the docs directory, resolved from `.codevoyant/metadata.json` (`docs_dir`) else `docs` (see SKILL.md "Docs directory resolution")

## Step 0: Handle existing docs

Decide what to do with docs that already exist before authoring new ones.

**Scaffold-only.** If `SCAFFOLD_ONLY`, skip this step — never move or touch existing docs; only lay down missing skeletons (the scaffold script skips existing files unless `--overwrite`). Go to Step 1.

**No existing docs.** If `docs/` does not exist or is empty (and no `README.md` at the repo root), skip this step. Go straight to Step 1.

**Existing docs.** If any doc exists, do this:

1. Move every existing doc under `docs/` (and the repo-root `README.md` if present) into `docs/legacy/`, keeping the same relative paths. For example `docs/user-guide.md` becomes `docs/legacy/user-guide.md`. Never delete them. Stamp each moved doc with `exclude: true` in its frontmatter (the documented opt-out in `coverage-and-api.md` Step A and the spec skill's `validate_docs.py`) — otherwise it stays under `docs/**/*.md` and the next `review`/`validate` treats it as managed and flags it for missing/empty `globs:`.
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

**Terraform / infra modules:**
```bash
find . -type d -name "modules" -not -path "*/.codevoyant/*" | \
  xargs -I{} find {} -maxdepth 1 -mindepth 1 -type d 2>/dev/null
```

**API route groups (SvelteKit / Next.js patterns):**
```bash
find . -path "*/routes/api*" -name "+server.ts" -not -path "*/node_modules/*" | \
  sed 's|/[^/]*$||' | sort -u
```

**CI config:**
```bash
ls .github/workflows/* .github/actions/* .gitlab-ci.yml .circleci/config.yml .travis.yml Jenkinsfile* bitbucket-pipelines.yml azure-pipelines.yml 2>/dev/null | head
```

Apply the type detection table from `references/structure.md` (the single source) to each discovered path. `--type` forces the type for all components.

Build `MANIFEST` — array of `{ name, path, type }` entries. This is the raw component list; grouping happens in Step 2.5.

## Step 2.4: Flat-repo feature breakdown (propose before grouping)

Some repos are already split into monorepo/feature modules; others are flat — one package, or a tangle of top-level files. For a flat repo, grouping in Step 2.5 alone produces thin, wrong-grained docs. Detect the shape and, when flat, propose a breakdown first, using the taxonomy in `references/module-taxonomy.md`.

**Detect the shape:**

```bash
# A workspace manifest is a strong structured signal (JS/Go/misc).
STRUCTURED=$(find . -maxdepth 3 \
  \( -name pnpm-workspace.yaml -o -name go.work -o -name lerna.json -o -name nx.json -o -name turbo.json -o -name workspace.yaml \) \
  -not -path "*/node_modules/*" -not -path "*/.codevoyant/*" 2>/dev/null | head -1)
# A Cargo/pyproject file is structured only if it declares a workspace.
if [ -z "$STRUCTURED" ]; then
  find . -name Cargo.toml -not -path "*/node_modules/*" -not -path "*/.codevoyant/*" \
    -exec grep -lE '^[[:space:]]*\[workspace\]' {} + 2>/dev/null | head -1 | grep -q . && STRUCTURED="Cargo.toml"
  find . -name pyproject.toml -not -path "*/node_modules/*" -not -path "*/.codevoyant/*" \
    -exec grep -lE '^[[:space:]]*\[tool\.uv\.workspace\]' {} + 2>/dev/null | head -1 | grep -q . && STRUCTURED="pyproject.toml"
fi
# Otherwise: a conventional module-dir layout, or multiple published packages.
if [ -z "$STRUCTURED" ]; then
  STRUCTURED=$(find . -maxdepth 2 -type d \
    \( -name libs -o -name apps -o -name packages -o -name crates -o -name services -o -name features \) \
    -not -path "*/node_modules/*" -not -path "*/.codevoyant/*" 2>/dev/null | head -1)
fi
```

**If `STRUCTURED` is non-empty** — the repo already has a module layout. Skip this step's breakdown; proceed to Step 2.5 (kind bucketing) as today.

**If flat (`STRUCTURED` empty)** — derive a proposed `lib/module → feature` breakdown before bucketing, per `references/module-taxonomy.md`:

1. Read the directory tree, import graph, and package/workspace metadata to find natural module boundaries:

```bash
find . -type f \( -name '*.ts' -o -name '*.py' -o -name '*.go' -o -name '*.rs' -o -name '*.js' \) \
  -not -path "*/node_modules/*" -not -path "*/.codevoyant/*" -not -path "*/dist/*" -not -path "*/target/*" | \
  sed -E 's#^\./##; s#/[^/]+$##' | sort | uniq -c | sort -rn | head -40
```

2. Cluster the paths into a proposed map of `module/feature → dirs/files`, naming each module from the code's own vocabulary (package names, route prefixes, top-level dirs) and any docs already in the repo — never invented words. Note cross-cutting concerns (a model or pipeline being trained but not evident in the tree) as modules, per the taxonomy. If the clustering is inconclusive from directories and imports alone, read the repo's existing markdown docs (README, `docs/**`, ADRs, design notes) first — they usually already name the modules and features, which obviates reading all the code; use those names as the breakdown's seed.

3. Present the breakdown and ask the user to agree (AskUserQuestion, free-text Other for edits). Print BOTH the inferred taxonomy kind (apps vs libs per module) and the directory tree the breakdown was derived from:

```
Proposed feature breakdown for this repo (taxonomy: apps|libs → modules|features):

  <module>  [apps|libs]  → <dirs/files>
  …

Directory tree:
  <top-level tree the breakdown was inferred from>

Does this match how you think about the code? (Yes / Edit / Cancel)
```

4. On **Edit**, take the user's corrected breakdown via Other and re-present once. On **Cancel**, stop — do not author docs against a breakdown the user rejects.
5. Feed the agreed map into Step 2.5 as the module-cluster candidates, so kind bucketing and module clustering use the confirmed boundaries instead of re-deriving them from raw paths.

The agreed breakdown is the seed for `GROUPS`, not a replacement for Step 2.5's kind/platform/module logic — Step 2.5 still assigns each module to a kind bucket and platform level.

## Step 2.5: Group components into the architecture hierarchy

Group `MANIFEST` entries into the hierarchy people actually think in, and confirm each grouping with the user.

**Step 2.5a — Kind buckets.** Bucket every component into exactly one kind: `apps` (also called `services` — use the repo's own naming for the bucket directory) for deployable applications/services; `libs` for shared libraries/packages; `ci` for CI/CD and infra modules. Use the type table from `references/structure.md` plus the path as signals (a `libs/*` path → libs; an `apps/*` path or route group → apps; a Terraform module / CI config → ci). A component whose kind is unclear → ask (AskUserQuestion: apps / libs / ci).

**Step 2.5b — Platform level.** If the repo has more than one deployable platform (e.g. `web` and `mobile`, or `backend` and `infra`), add a platform directory ABOVE the kind buckets: `docs/architecture/{platform}/apps/...`, `docs/architecture/{platform}/libs/...`. Ask the user what the platforms are (AskUserQuestion with the candidates, or Other). A single-platform repo omits the platform level entirely.

**Step 2.5c — Module clusters (within apps|services).** Cluster the apps components into modules/services. Signals that several components form ONE module:
- They share a name prefix or a clear ownership boundary (e.g. `auth-*`, `libs/storage/*`)
- They form a pipeline: producer → queue → consumer is one data flow, not three components
- One module calls or depends on another (caller/callee = same subsystem)
- Removing any one of them breaks the others
- A pre-existing README already describes them as a unit

Signals a component deserves its own doc:
- It has a stable public API that other modules consume independently
- It is complex enough that its internals need explanation separate from its callers
- It is deployed/versioned independently

Simple infrastructure artifacts — an SSM parameter, an S3 bucket, a KMS key — rarely warrant a standalone doc. They belong in the `## Implementation` section of the module that owns them. A Terraform module is an implementation detail inside the owning module doc's `## Implementation`, not a peer-level doc.

For each proposed module cluster, ask the user (AskUserQuestion): "These components appear to form one module — document them together or separately?" Accept the clustering, or apply the user's edits to split/merge before proceeding.

Build `GROUPS` — the final tree: `{ platform?, kind, modules: [{ module_name, members: [{ name, path, type }] }] }`. Single-component modules become leaf docs.

## Step 3: Determine the docs to author

Follow the mandated layout in `references/structure.md`. Always author:
- `README.md` (repo ROOT, not under `docs/`) — the project README, from `templates/project-readme.md`
- `docs/user-guide.md` — the user-facing guide, from `templates/user-guide.md`
- `docs/development-guide.md` — the contributor-facing guide, from `templates/development-guide.md`
- `docs/architecture/index.md` — the architecture doc, always at this path, from `templates/architecture.md`

Author present-if-applicable (from Step 2 detection):
- `docs/ci.md` — the CI/CD + infrastructure doc; include it when the repo has CI config (any of the CI candidate globs in `templates/ci.md` frontmatter) OR infra config; from `templates/ci.md`

Author group and module docs from the `GROUPS` tree (Step 2.5), at `references/structure.md` paths:
- Each **kind bucket** with components → a group doc: `docs/architecture/apps/index.md` (or `docs/architecture/libs/index.md`, `docs/architecture/ci/index.md`), component template — the group doc's Components name+link each module under it, and its `## Implementation` holds group-wide concerns.
- Each **module** → `docs/architecture/{kind}/{module}.md` for a single-component module, or `docs/architecture/{kind}/{module}/index.md` for a multi-component module (members are `## Implementation` subsections).
- A sub-component with a distinct public API other modules consume, or too complex to summarise in a subsection → a leaf child doc beside the module `index.md`: `docs/architecture/{kind}/{module}/{sub}.md`.
- With a platform level (Step 2.5b), the kind dirs nest under `docs/architecture/{platform}/`.

Simple infra artifacts and Terraform modules do NOT get their own docs — they are `## Implementation` details of the module that owns them.

## Step 4: Manifest report and confirm

Present the manifest (tree first):
```
Retcon will author (from the code):

  README.md                                    (project README, repo root)
  docs/user-guide.md                           (user-facing guide)
  docs/development-guide.md                    (contributor guide)
  docs/ci.md                                   (CI/infra config detected)
  docs/architecture/index.md                   (architecture — system map by group)
  docs/architecture/apps/index.md              apps       <- group doc
  docs/architecture/apps/auth/index.md         auth       <- module: libs/auth (+ libs/auth/oidc)
  docs/architecture/apps/storage/index.md      library    <- module: libs/storage (blob + queue + worker)
  docs/architecture/apps/storage/api-images.md api        <- sub-component with its own API
  docs/architecture/libs/ui.md                 library    <- module: libs/ui (single-component)
  docs/architecture/ci/index.md                ci         <- group doc (CI/CD + infra modules)

{N} docs to author. Run without --dry-run to proceed.
```

If `--dry-run`, stop here. Otherwise ask (AskUserQuestion): "Author all {N} docs from the code?" — Yes / Edit manifest / Cancel. On "Edit manifest", present the list as editable text via Other, then re-parse. Confirm the Step 2.5 groupings were accepted before proceeding.

**Skip existing by default.** A file that already exists is skipped (report as skipped) unless `--overwrite` is set, in which case it is regenerated. Never silently clobber.

**Scaffold-only (`--scaffold`).** If `SCAFFOLD_ONLY`, do NOT author content. Scaffold every mandated + group/module doc with the script (same per-doc command as Step 5a, using `--overwrite` when set), leaving each `@agent` marker in place for a human to fill. Report:
```
Scaffolded {N} doc skeleton(s) across {M} file(s).
Find all fill-in markers: grep -rn "@agent" "$DOCS_DIR/"
```
Then stop. Do NOT run Steps 5–7.

## Step 5: Author each doc (parallel per group/module)

This is the expensive, intelligent path. Fan out per-doc work as parallel background Agents — one per group/module doc — that each read the members' code and fill the template. Then generate the index/top-level docs that reference them.

**Doc fan-out:** launch one background Agent per group/module doc simultaneously. Each agent receives:
- The doc's `{ name, members: [{ name, path, type }], output_path }` object
- Paths to `references/language-guide.md`, `references/mermaid-guide.md`, `references/coverage-and-api.md`, `references/template-contract.md`, and `references/scaffold.md`, plus the scaffold command (`scripts/scaffold.py`)
- The full `GROUPS` tree (names/members/types of every group and module) so it knows the sibling set before writing cross-references
- Any legacy docs for its members (from Step 0) so it can carry the user's facts forward
- Instruction to complete Step 5a–5b for its doc and return `{ output_path, status, public_api: [one-line list of its public API section's exported surface] }` — each agent reports its own doc's `[public-api]` surface so the reconciliation pass can verify cross-links.

Collect all agent results before authoring the top-level/index docs (5c), because the architecture index names+links each group and module.

### Step 5a: Scaffold the skeleton, then read the members' source

1. **Scaffold** the skeleton with the script (same path `new` uses — `references/scaffold.md`):
   ```bash
   python3 "$SKILL/scripts/scaffold.py" --out {output_path} --template {type} --vars '{"name": "{name}", "path": "{path}"}' --overwrite
   ```
   This copies the resolved template and fills each `{key}` token from the `--vars` dict (`{name}`/`{path}`, so the frontmatter's `globs` already points at the doc's directory). retcon does not parse the template itself.
2. **Read the real code** so the doc is accurate: package metadata (`package.json`/`Cargo.toml`/etc.), entry points and exports (`index.ts`, public modules), route handlers, config files, env vars, and for infra the Terraform/module definitions. Author from what the code actually does — never invent identifiers, endpoints, or env vars.

### Step 5b: Replace each `@agent` marker with real content

Open the scaffolded doc and replace every `<!-- @agent: … -->` marker with real content authored from the code, then delete the marker. The marker text is the authoring guidance for that section; the copied mermaid/table below it is the shape to fill.

1. **Frontmatter is already correct.** The `---` block is first and `globs:` already points at the doc's directory. Adjust the glob only if the doc owns a narrower/wider subtree than `{path}`. The doc carries no stored type marker — review re-derives the doc's type from its code path (its `globs`) using the type table in `references/structure.md`.
2. **Public API section** (the template's `[public-api]`-marked heading — see `references/template-contract.md`) must be explicit — the surface other modules reference.
3. **Design → Components**: name the doc's key parts; whenever this doc delegates to a sub-component that has its OWN doc, NAME and LINK it here (referencing its public API section, not its internals — see `references/coverage-and-api.md` Rule 3). Sub-component doc links live in Components, NOT in `## References` (technical/external sources only).
4. **Implementation → one subsection per member module/component.** For a multi-component module doc, `## Implementation` carries one `### {member}` subsection per member — this is where Terraform modules, Lambda handlers, config files, and infra artifacts appear. A group doc's `## Implementation` holds group-wide concerns and names each module via Components.
5. **Type-specific detail** from the source: request-lifecycle `sequenceDiagram` in `api` docs only; a data-model (`erDiagram`/type table) in `api`/`library`/`auth` docs; auth flow in `auth`; user flow in `frontend`; per the mermaid guide.
6. **Delete any `(optional)` section** whose content does not apply (e.g. no env vars → delete the Environment Variables section). Keep required sections.
7. **Carry forward legacy facts.** If a legacy doc for this doc's members exists, incorporate its still-correct details (commands, endpoints, env vars, terminology). Do not repeat facts the code contradicts.
8. Apply all language-guide rules to written prose (STE-terse). Leave a `<!-- TODO: … -->` only for the rare thing that genuinely needs a human decision.

### Step 5c: Author the top-level and index docs

After the group/module docs are written, scaffold each mandated top-level doc with the script (`scripts/scaffold.py --out {out} --template {template} --vars '{"name": "{name}", "path": "{path}"}' --overwrite`; for an index/top-level doc with no code path, omit `path` — `--vars '{"name": "{name}"}'`), then author its content by replacing the `@agent` markers (Step 5b):
- `README.md` (project README, repo root) and `docs/architecture/index.md` (architecture) are the index docs — keep `index: true` + `globs: ["**"]`, cover the whole tree, and reference each group/module through its public API. The architecture index's Design `[components]` section names+links the GROUP docs (apps/libs/ci — a handful of entries) and includes a `graph TD` system-topology diagram showing how the groups connect. The repo-root `README.md` links DOWN into `docs/` (e.g. `docs/architecture/index.md`, `docs/user-guide.md`).
- `docs/user-guide.md` (user-guide template) — author user-facing install/quickstart/usage/configuration from the CLI/binary entry, public commands, and user config. It owns concrete user-facing globs (NOT an index doc).
- `docs/development-guide.md` (development-guide template) — author from the project's real task runner. Detect it (`/task detect` / `/task list`) and use its real task names — never invent commands. Owns dev-tooling/task config globs (NOT an index doc).
- `docs/ci.md` (ci template, if applicable) — author the CI/CD pipelines/release from the workflow files, and the `## Infrastructure` section from the repo's infra config (delete that section if the repo has no managed infra). Owns CI/release + repo-wide infra config globs (NOT an index doc).

### Step 5d: Write and coverage-check

Write each doc in place (the scaffold script already created its parent dirs in Step 5a; the top-level/index docs in 5c are scaffolded the same way). Then run the **Mermaid label fixup** over every authored doc: inside each ` ```mermaid ` fence, replace a literal `\n` (backslash-n) that appears between node-label brackets (`[...]` or `["..."]`) with `<br/>` — Mermaid renders a literal `\n` as the two characters, never as a line break (see `references/mermaid-guide.md`). Use `python3` so the pass is deterministic:

```bash
find "$DOCS_DIR" -name "*.md" -print0 | xargs -0 -I{} python3 -c "
import re, sys, pathlib
for path in sys.argv[1:]:
    p = pathlib.Path(path)
    text = p.read_text()
    def fix(m):
        fence = m.group(0)
        # Inside node labels (text between [ and ] that is not part of a
        # link target), every literal backslash-n becomes <br/>.
        def label(n):
            return '[' + re.sub(r'\\\\n', r'<br/>', n.group(1)) + ']'
        fence = re.sub(r'\[([^\]\n]+)\]', label, fence)
        return fence
    fixed = re.sub(r'\`\`\`mermaid\s*.*?\`\`\`', fix, text, flags=re.DOTALL)
    if fixed != text:
        p.write_text(fixed)
" {}
```

After the fixup, run the coverage-overlap check from `references/coverage-and-api.md` (Step B) over the tree: skip docs carrying `index: true`; a non-nested overlap → warn and suggest narrowing one doc's `globs`; a strict-subset overlap → note the nested parent/child relationship; disjoint → no action. Surface these in the Step 7 summary; do not block the write.

### Step 5e: Reconcile cross-references

After every doc is written, verify the cross-links between docs. Each parallel agent sees only its own doc, so it cannot verify links to other docs. The reconciliation pass checks: each doc's Components section and the architecture index's Components section must NAME + LINK every sibling/child it delegates to, using that doc's **actual** `[public-api]` surface (the `public_api` summaries collected in Step 5). A link whose target surface does not exist, or that points at another doc's internals, is a bug — fix it in the doc. This pass runs on the final tree, so no agent authors a link it cannot verify.

## Step 6: Validate globs

Run the code-reading checks from `validate.md` over the tree you just wrote. Fix every violation before you finish.

1. **Glob validity.** Expand every glob against the repo's real paths. A glob that matches nothing is a dead ownership claim — remove it or correct it. Use `scripts/scope.py` with the full path list:
   ```bash
   git ls-files | python3 "$SKILL/scripts/scope.py" --globs '<doc glob>'
   ```
   The two index docs (`README.md`, `docs/architecture/index.md`) own `**` by design — always valid. The top-level `docs/ci.md` globs must be trimmed to the CI provider, release tool, and infra dirs this repo actually has (see `templates/ci.md` frontmatter).
2. **Glob comprehensiveness.** Every discovered component (from Step 2) must have a doc whose globs own its path — its group doc, its module doc, or a leaf doc. A discovered component with no owning doc is a gap — author its doc.
3. **One owner per path.** Re-run the coverage-overlap check (Step 5d) if any glob changed. No two non-index docs cover the same path unless one is nested in the other.
4. **API boundaries.** Each doc exposes the `[public-api]`-marked section from its template; no doc references another module's internals.

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
