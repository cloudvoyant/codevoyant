# docs -- documentation generation workflow

Generate or update documentation files from standard templates.

## Variables

- `MODE` -- `detect | readme | architecture` (from dispatcher)
- `TARGET` -- first non-flag arg after MODE (e.g. component name for `architecture {component}`)
- `COMPONENT_TYPE` -- value of `--type` flag if given, otherwise `""` (auto-detect)
- `PROJECT_ROOT` -- working directory (assume `.`)
- `DOCS_DIR` -- `$PROJECT_ROOT/docs`

## Step 1: Load reference docs

Read the following before generating any content:

1. `references/language-guide.md` -- apply all 10 rules when writing prose in templates
2. `references/mermaid-guide.md` -- use the prescribed diagram type for each diagram slot

## Step 2: Determine what to generate

**If MODE is `detect`:**

Check for the following files and list which are missing:

```bash
test -f "$DOCS_DIR/README.md"
test -f "$DOCS_DIR/architecture/README.md"
ls "$DOCS_DIR/architecture/"*.md 2>/dev/null | grep -v README
```

Report:
```
Docs status:
  docs/README.md           -- {exists | MISSING}
  docs/architecture/README.md -- {exists | MISSING}
  docs/architecture/*.md   -- {N files: list names}
```

For each missing file: proceed to the appropriate generation step below.
Ask the user once (AskUserQuestion) if they want stubs generated for all missing files, or to stop.

**If MODE is `readme`:**
- Target file: `$DOCS_DIR/README.md`
- Template: `references/templates/project-readme.md`
- Proceed to Step 3

**If MODE is `architecture` and TARGET is empty:**
- Target file: `$DOCS_DIR/architecture/README.md`
- Template: `references/templates/architecture-readme.md`
- Proceed to Step 3

**If MODE is `architecture` and TARGET is non-empty:**
- Target file: `$DOCS_DIR/architecture/{TARGET}.md`
- Detect component type (Step 2.5)
- Proceed to Step 3

## Step 2.5: Detect component type (only for `architecture {component}`)

**If `--type` was given:** use it directly. Skip heuristics.

**Otherwise, apply heuristics from the codebase:**

Search for a directory or file matching `{TARGET}`:

```bash
find . -type d -name "{TARGET}" 2>/dev/null | head -5
find . -name "{TARGET}.ts" -o -name "{TARGET}.svelte" 2>/dev/null | head -5
```

Apply type heuristics:

| Path pattern | Detected type |
|-------------|--------------|
| `libs/*`, `packages/*` | `library` |
| `apps/*/src/routes/api/*`, `/api/` in path | `api` |
| `apps/*/src/routes/*` (not api), `libs/ui/*`, `libs/feature-*` | `frontend` |
| `infra/modules/*`, `terraform/*`, `*.tf` directory | `infra` |
| Can't determine | Ask user (AskUserQuestion with 4 options) |

Store as `COMPONENT_TYPE`.

## Step 3: Read the target file (if it exists)

```bash
test -f "{target file}" && cat "{target file}" || echo "FILE_NOT_FOUND"
```

If the file exists: note which sections are already present; only generate the missing sections (don't overwrite existing content).
If the file does not exist: generate the full template.

## Step 4: Read the appropriate template(s)

**For `readme`:** read `references/templates/project-readme.md`

**For `architecture` (index):** read `references/templates/architecture-readme.md`

**For `architecture {component}`:**
- Read `references/templates/component-base.md` (universal sections)
- Read `references/templates/component-{COMPONENT_TYPE}.md` (type-specific sections)
- Merge: base provides Overview, Requirements, Design, Implementation, References structure; type-specific template adds its extra sections (endpoint tables, component trees, etc.)

## Step 5: Fill the template

Scan the project codebase to pre-fill known values:

**For all targets:**
- Package name from `package.json` -> `{Project Name}` / `{@scope/package-name}`
- Technology stack from root `package.json` dependencies and `devDependencies`
- Monorepo structure from directory listing

**For `architecture`:**
- Lib dependency graph from `package.json` `dependencies` fields across `libs/`

**For component docs -- scan the component's directory:**
- TypeScript exports from `index.ts` or `index.svelte` -> public API table
- Environment variables from any `.env.example` or `README.md` in the component dir
- File structure from directory listing

Apply language-guide rules when writing any prose:
- Short sentences
- "You" not "the developer"
- Define acronyms on first use
- Explain the "why" for non-obvious content

Leave `<!-- TODO: ... -->` placeholders for sections that cannot be inferred from code alone (e.g. sequence diagram flows, key design decisions, rationale).

## Step 6: Write the file

```bash
mkdir -p "$(dirname {target file})"
# Write to {target file}
```

Report: `Done -- Written: {target file}`

## Step 7: Summary

```
Docs generated:

  {file path} -- {type} template, {N} TODO sections remain

To fill in the remaining sections:
  Edit {file path} directly, then run `/spec update` to capture your changes.

Run `/dev docs check {component}` (coming soon) to validate against the template.
```
