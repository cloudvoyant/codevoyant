# new — scaffold the docs skeleton (script-driven)

Scan the repo, agree on the doc list, then run `scripts/scaffold.py` once per doc to lay down copy-ready skeletons. `new` does NO authoring — no prose, no code analysis, no template parsing. Each scaffolded doc is a template copy whose fill-in prompts are `<!-- @agent: … -->` markers. To author real content from the codebase, use `/docs retcon`.

- **Markdown output: soft-wrap prose, never hard-wrap** — when this workflow writes a `.md` artifact, write each paragraph as one continuous line; do not insert manual newlines to wrap prose at a fixed column width. Newlines still separate paragraphs, list items, headings, and code fences.

## Variables

- `TARGETS` — space-separated target names from REMAINING_ARGS (empty = scan and scaffold the base structure)
- `TYPE_FLAG` — value of `--type` if provided, else `""` (auto-detect per target)
- `DRY_RUN` — true if `--dry-run` present (print the manifest, write nothing)
- `OVERWRITE` — true if `--overwrite` present (pass through to the script)
- `SKILL` — this skill's directory; the script is `$SKILL/scripts/scaffold.py`
- `DOCS_DIR` — the docs directory, resolved from `.codevoyant/metadata.json` (`docs_dir`) else `docs` (see SKILL.md "Docs directory resolution")

## Step 1: Load references

Read `references/structure.md` (the mandated layout, path→template mapping, type detection) before building the manifest. Do NOT read the language/mermaid guides — `new` writes no prose. Do NOT read the templates — the script copies them.

## Step 2: Build the manifest

Each manifest entry is `{ out, template, name, path }`.

### 2a: No target (`/docs new`) — scan and scaffold the base structure

Base set (always): `README.md` (project-readme), `$DOCS_DIR/user-guide.md` (user-guide), `$DOCS_DIR/development-guide.md` (development-guide), `$DOCS_DIR/architecture/index.md` (architecture).

Add `$DOCS_DIR/ci.md` (ci) only when the repo has CI or infra config (detect per the candidate globs in `templates/ci.md` frontmatter):
```bash
ls .github/workflows/* .github/actions/* .gitlab-ci.yml .circleci/config.yml .travis.yml Jenkinsfile* bitbucket-pipelines.yml azure-pipelines.yml 2>/dev/null | head
find . \( -path "*/infra/*" -o -path "*/terraform/*" -o -name "*.tf" -o -name "Pulumi.yaml" -o -name "Dockerfile*" -o -name "docker-compose*" \) -not -path "*/node_modules/*" 2>/dev/null | head
```

**Monorepo detection.** Scan for workspace globs and package roots:
```bash
cat pnpm-workspace.yaml 2>/dev/null
grep -A20 '"workspaces"' package.json 2>/dev/null
grep -n "members\|\[workspace\]" Cargo.toml 2>/dev/null
cat go.work 2>/dev/null
find . -maxdepth 2 -type d \( -path "./apps/*" -o -path "./packages/*" -o -path "./libs/*" \) -not -path "*/node_modules/*" 2>/dev/null | sort
```
If it is a monorepo, group the packages into the architecture hierarchy first (same taxonomy as `retcon.md` Step 2.5 / `structure.md` "Grouping taxonomy": kind buckets, optional platform, module clusters) and add one doc per group and module under `$DOCS_DIR/architecture/` — a group doc `$DOCS_DIR/architecture/{kind}/index.md`, a leaf `$DOCS_DIR/architecture/{kind}/{module}.md` for a single-component module, or `$DOCS_DIR/architecture/{kind}/{module}/index.md` for a multi-component module (member components become `## Implementation` subsection headings in the scaffold). Detect each module's type in Step 3. A single-package repo gets only the base structure.

### 2b: Named targets (`/docs new <name…>`)

Resolve each name per `references/structure.md`:
- `readme` → `README.md`, template `project-readme`, name = project name (vars dict omits `path`)
- `user-guide` → `$DOCS_DIR/user-guide.md`, template `user-guide`
- `development-guide` → `$DOCS_DIR/development-guide.md`, template `development-guide`
- `ci` → `$DOCS_DIR/ci.md`, template `ci`
- `architecture` → `$DOCS_DIR/architecture/index.md`, template `architecture` (vars dict omits `path`)
- `{name}` with NO sub-components → `$DOCS_DIR/architecture/{name}.md`, component template
- `{name}` WITH sub-components → `$DOCS_DIR/architecture/{name}/index.md` plus each child, component template

## Step 3: Detect type (per component target)

If `--type` given, apply it to all component targets. Otherwise locate each target's directory and apply the detection table in `references/structure.md` (the single source — check `auth` first, then `libs/*`/`packages/*` → library, `*/api/*` → api, `apps/*/routes/*` (not api)/`libs/ui/*`/`libs/feature-*` → frontend, infra-ish → generic). If the type is still not clear, ask (AskUserQuestion: api / library / frontend / auth / generic).

The `path` var for a component = its code directory (e.g. `libs/auth`); the script fills the template's `{path}` token so the doc gets `globs: ["libs/auth/**"]`.

## Step 4: Confirm the manifest

Print it:
```
Docs to scaffold (skeletons only):

  README.md                           project-readme  (repo root)
  $DOCS_DIR/user-guide.md                  user-guide
  $DOCS_DIR/development-guide.md           development-guide
  $DOCS_DIR/ci.md                          ci              (CI/infra detected)
  $DOCS_DIR/architecture/index.md          architecture
  $DOCS_DIR/architecture/apps/index.md     apps            <- group doc
  $DOCS_DIR/architecture/apps/auth/index.md  auth          <- module: libs/auth
  $DOCS_DIR/architecture/apps/storage/index.md  library    <- module: libs/storage (blob + queue + worker)

Run without --dry-run to scaffold.
```
If `--dry-run`, stop here. If the layout — or which packages get their own docs — is ambiguous, ask via AskUserQuestion ("Proposed docs — look good, or adjust?": Yes / Edit / Cancel; on Edit, present the list as editable text via Other and re-parse). When the manifest is ambiguous about how the user would describe or name a system component (unclear boundaries, unclear doc naming), ask the user how they would describe it and use their wording as the doc `name`/`path`. If the layout is clear, proceed without asking.

## Step 5: Run the script per doc

For each manifest entry, run the scaffold command from `references/scaffold.md`:
```bash
python3 "$SKILL/scripts/scaffold.py" --out {out} --template {template} --vars '{"name": "{name}", "path": "{path}"}' [--overwrite]
```
For an index/top-level doc that has no code path (`readme`, `architecture`), omit `path` from the dict: `--vars '{"name": "{name}"}'`. Pass `--overwrite` when `OVERWRITE` is set. The script creates parent dirs, copies the template, replaces each `{key}` token from the `--vars` dict, and prints `wrote:` (exit 0) or `skip: exists` (exit 3). `new` never reads or parses a template.

## Step 6: Report

```
Scaffolded {N} skeleton(s), {M} skipped (already existed):

  {out} — {template} template
  ...

Find every prompt:
  grep -rn "@agent" "$DOCS_DIR/" README.md

Fill each section in (delete its <!-- @agent: … --> marker when done; markers starting with "(optional)" mark deletable sections), or run /docs retcon to have them authored from the code.
```
