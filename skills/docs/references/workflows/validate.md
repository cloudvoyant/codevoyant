# validate -- code-reading check that globs are comprehensive, valid, and boundaries hold

The code-reading counterpart to `review`: instead of checking docs against templates, `validate` checks docs against the **actual repo tree**. It confirms every doc's `globs:` are valid (they point at real paths) and comprehensive (every discovered component has a doc that owns its path), and that the docs obey the glob/component boundaries of `references/coverage-and-api.md` (one owner per path, nested parent/child relationships, API-only cross-references). Read-only — no doc files are modified.

Use when you changed code, added a package, or edited templates and want to know whether the docs still match the repo.

## Variables

- `TARGET_PATH` -- path to validate (default: `$DOCS_DIR/`); the repo-root `README.md` is always included
- `FORMAT` -- `--json` for machine-readable terminal output, default is human-readable
- `--diff <base>` -- restrict boundary checks to paths changed on this branch (default: whole repo)

## Step 0: Load references

Read before validating:
1. `references/structure.md` — the mandated layout and component type detection
2. `references/coverage-and-api.md` — the coverage and API-boundary rules (Steps A–C)
3. `references/template-contract.md` — how to read a doc's `[public-api]` / `[components]` markers

## Step 1: Discover components from the code

Build a `COMPONENTS` manifest by scanning the repo (same discovery as `retcon.md` Step 2):

```bash
# Application packages
find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.codevoyant/*" | \
  xargs grep -l '"name"' 2>/dev/null | sort
# Terraform modules
find . -type d -name "modules" -not -path "*/.codevoyant/*" | \
  xargs -I{} find {} -maxdepth 1 -mindepth 1 -type d 2>/dev/null
# API route groups (SvelteKit / Next.js patterns)
find . -path "*/routes/api*" -name "+server.ts" -not -path "*/node_modules/*" | \
  sed 's|/[^/]*$||' | sort -u
# CI / infra presence (for ci.md comprehensiveness; candidate globs from templates/ci.md frontmatter)
ls .github/workflows/* .github/actions/* .gitlab-ci.yml .circleci/config.yml .travis.yml Jenkinsfile* bitbucket-pipelines.yml azure-pipelines.yml 2>/dev/null | head
find . \( -path "*/infra/*" -o -path "*/terraform/*" -o -name "*.tf" -o -name "Pulumi.yaml" -o -name "Dockerfile*" -o -name "docker-compose*" \) -not -path "*/node_modules/*" 2>/dev/null | head
```

Each entry is `{ name, path, type }` — resolve `type` with `references/structure.md`. Also record `ALL_PATHS`, the set of existing repo paths under the audited scope (`git ls-files`, or `find . -type f` when not a git repo).

## Step 2: Parse each doc's globs

For every doc under `TARGET_PATH` plus the repo-root `README.md`:
- Read the leading frontmatter and extract `globs:` and `index:` (per `coverage-and-api.md` Step A).
- A doc with `exclude: true` in its frontmatter is **unmanaged** — skip it entirely for Steps 3a/3b (no glob-validity check, not an owner, not part of structure). It never produces a finding.
- Resolve each managed doc's template (Step 2 of `review.md`) and read its `[public-api]`-marked heading from the template (`template-contract.md`).

## Step 3: Check each glob is valid and comprehensive

### 3a. Glob validity — each glob points at real paths

For every doc, expand each glob against `ALL_PATHS` (a glob that matches no existing path is a dead ownership claim — either the path moved, was deleted, or the glob is wrong). Use `scripts/scope.py` with the glob plus the full path list:

```bash
printf '%s\n' "$ALL_PATHS" | python3 "$SKILL/scripts/scope.py" --globs '<glob>' | head
```

- A glob matching nothing → `type: GLOB`, message `Glob {glob} matches no paths in the repo (stale or wrong)`, `replacement_text`: the corrected glob or the `<!-- TODO -->` stub, `rationale`: "validate Step 3a: every glob must cover real paths."
- The two `index: true` docs (`README.md`, `docs/architecture/index.md`) own `**` by design — always valid; skip them.
- A component doc whose first/primary glob does not point at its code path → flag (doc out of sync with where the component lives).

### 3b. Comprehensiveness — every discovered component is owned

Group `COMPONENTS` into the architecture hierarchy first (same taxonomy as `retcon.md` Step 2.5: kind buckets, optional platform, module clusters). For each `COMPONENTS` entry, check that some non-index, non-excluded doc's globs cover its `path` (use `scope.py`) — its group doc, its module doc, or a leaf doc counts as the owner. A discovered component with no owning doc is a documentation gap:
- `type: COVERAGE`, message `Component {name} ({path}, {type}) has no owning doc`, `replacement_text`: the scaffold command for that component (`python3 "$SKILL/scripts/scaffold.py" --out docs/architecture/{name}.md --template {type} --vars '{"name": "{name}", "path": "{path}"}'`), `rationale`: "validate Step 3b: every component needs a doc that owns its path."

If the repo has CI or infra config (Step 1) but no `docs/ci.md`, flag it (present-if-applicable, per `references/structure.md`).

### 3c. Artifact gate — every diagram and table validates

Run the artifact gate over every managed doc:

```bash
python3 "$SKILL/scripts/validate_artifacts.py" {managed doc paths...}
```

Blocking findings become `type: DIAGRAM` (fence/table issues) with the gate message; NOTEs are reported but do not fail validation.

## Step 4: Check boundaries (reuse coverage-and-api)

Run the detection procedure from `references/coverage-and-api.md` Steps A–C over the docs — the pairwise overlap check (Rules 1–3) and the API-boundary checks (Rules 3–5), where the API section is each doc's template's `[public-api]` heading. Under `--diff`, restrict the pairwise comparison to docs whose globs intersect the changed set (Steps D–F), flagging only boundaries affected by the change.

Emit every finding with `type: COVERAGE` (or `GLOB` for 3a). Do not flag when the heuristic cannot decide.

## Step 5: Report

Terminal report, grouped by doc (then by type):

```
docs/architecture/storage.md
  COVERAGE  Component libs/blob has no owning doc
  GLOB      Glob "libs/removed/**" matches no paths in the repo

docs/ci.md -- clean

Summary: {N} findings across {M} files ({C} components discovered, {D} docs validated)
```

With `--json`, emit the same structure as JSON. Optionally write a copy of the findings to `.codevoyant/review/{slug}/validate.md` in the same format as `docs-review-template.md` so they can be applied via `docs update --scaffold` (component gaps) or manually. Initialize the shared store before that write: `python3 "$SKILL/scripts/cv_init_store.py" >/dev/null` (`$SKILL` is exported by SKILL.md).

Exit 0 when clean; exit 1 when any finding is reported.
