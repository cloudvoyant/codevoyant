# new — generate one or more documentation files

Create doc files from templates. Accepts one or more component names, or special targets `readme` and `architecture`.

## Variables

- `TARGETS` — space-separated list of target names from REMAINING_ARGS (e.g. `auth storage`)
- `TYPE_FLAG` — value of `--type` if provided, else `""` (auto-detect per target)
- `DRY_RUN` — true if `--dry-run` present
- `DOCS_DIR` — `docs/` relative to project root

## Step 1: Load reference docs

Read before generating any content:
1. `references/language-guide.md` — apply all 10 rules
2. `references/mermaid-guide.md` — use prescribed diagram types

## Step 2: Parse targets

If TARGETS is empty:
- Check for `readme` or `architecture` in REMAINING_ARGS — handle as special targets
- Otherwise ask (AskUserQuestion): "Which doc(s) do you want to create?" with free-text

Special target resolution:
- `readme` → `$DOCS_DIR/README.md` using `templates/project-readme.md`
- `architecture` (no component name) → `$DOCS_DIR/architecture/README.md` using `templates/architecture-readme.md`
- `{name}` → `$DOCS_DIR/architecture/{name}.md` using component templates

Build `TARGET_LIST` — array of `{ name, output_path, template_base, type }` objects.

## Step 3: Detect type (per target)

For each target in TARGET_LIST where `type` is not yet set:

If `--type` was given globally, apply to all targets.

Otherwise, for each target, search the codebase:
```bash
find . -type d -name "{target}" 2>/dev/null | grep -v node_modules | head -5
```

Apply type heuristics:
| Path pattern | Type |
|---|---|
| `libs/*`, `packages/*` | `library` |
| `apps/*/src/routes/api/*`, `*/api/*` | `api` |
| `apps/*/src/routes/*` (not api), `libs/ui/*`, `libs/feature-*` | `frontend` |
| `infra/modules/*`, `terraform/*` | `infra` |
| Can't determine | ask (AskUserQuestion, 4 options) |

## Step 4: Dry-run report (if --dry-run)

Print:
```
Docs to generate:

  docs/README.md                      project-readme template
  docs/architecture/auth.md           library template  <- auto-detected from libs/auth
  docs/architecture/storage.md        library template  <- auto-detected from libs/storage

Run without --dry-run to generate.
```
Then stop.

## Step 5: Generate docs (parallel when multiple targets)

**Single target:** execute Steps 5a–5c inline.

**Multiple targets (2+):** launch one background Agent per target simultaneously. Each agent receives:
- The target's `{ name, output_path, type }` object
- Paths to `references/templates/` and `references/language-guide.md`
- Instruction to complete Steps 5a–5c and return `{ output_path, todos_count, status }`

Collect all agent results before Step 6.

### Step 5a: Read existing file

```bash
test -f "{output_path}" && cat "{output_path}" || echo "FILE_NOT_FOUND"
```
If exists: note present sections — only generate MISSING sections.
If not found: generate the full template.

### Step 5b: Read templates and fill content

1. Read `references/templates/component-base.md` + `references/templates/component-{type}.md`
2. Scan the component's directory in the codebase to pre-fill: package name, exports, env vars, file structure
3. Apply all language-guide rules to written prose
4. Leave `<!-- TODO: ... -->` for anything requiring human judgment

For `readme` / `architecture` index targets, read the single corresponding template.

### Step 5c: Write output file

```bash
mkdir -p "$(dirname {output_path})"
# Write filled template to output_path
```

## Step 6: Summary

```
Generated {N} doc(s):

  {output_path} — {type} template, {N} TODO sections remain
  ...

Fill in the TODO sections, then run /docs review to validate.
```
