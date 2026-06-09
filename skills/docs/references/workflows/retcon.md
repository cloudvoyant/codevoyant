# retcon — generate complete docs/ for a codebase with no docs

Discover all major components in the codebase and generate a full docs/ structure.

## Variables

- `DRY_RUN` — true if `--dry-run` present
- `SKIP_EXISTING` — true by default; `--overwrite` to regenerate existing files

## Step 1: Codebase discovery

Scan the repository to build a component manifest:

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

Apply type heuristics (same as `new.md` Step 3) to each discovered path.

Build `MANIFEST` — array of `{ name, path, type }` entries.

## Step 2: Determine top-level docs to generate

Always generate:
- `docs/README.md` (if missing)
- `docs/architecture/README.md` (if missing)

Add each manifest entry as `docs/architecture/{name}.md`.

## Step 3: Dry-run report

If `--dry-run`:
```
Retcon manifest:

  docs/README.md                               (missing)
  docs/architecture/README.md                  (missing)
  docs/architecture/auth.md                    library  <- libs/auth
  docs/architecture/db.md                      library  <- libs/db
  docs/architecture/storage.md                 library  <- libs/storage
  docs/architecture/api-images.md              api      <- apps/web/src/routes/api/images
  docs/architecture/infra-cdn.md               infra    <- infra/modules/cdn

{N} files to generate. Run without --dry-run to proceed.
```

Ask (AskUserQuestion): "Generate all {N} files?" — Yes / Edit manifest / Cancel.

If "Edit manifest": present the list as editable text via Other, then re-parse.

## Step 4: Generate docs (parallel background agents)

Split MANIFEST into two groups:
- **Component docs** — all `docs/architecture/{name}.md` entries
- **Index docs** — `docs/README.md` and `docs/architecture/README.md` (generated last, after components)

**Component docs — launch all in parallel:**

Spawn one background Agent per component entry simultaneously. Each agent receives its `{ name, path, type, output_path }` and runs Steps 5a–5c from `references/workflows/new.md` (read existing → fill template → write). Agents that find an existing file with `SKIP_EXISTING=true` return `{ status: "skipped" }` immediately.

Wait for all component agents to complete, then report:
```
docs/architecture/auth.md    ✓ (library, 3 TODOs)
docs/architecture/db.md      ✓ (library, 2 TODOs)
docs/architecture/storage.md skipped (already exists)
...
```

**Index docs — generate sequentially after components:**

Generate `docs/architecture/README.md` first (references component list), then `docs/README.md`. These reference the full component list so must run after all components exist.

## Step 5: Final report

```
Retcon complete — {N} files generated, {M} skipped (already existed)

  {list of generated files}

Next steps:
  /docs review          — audit for gaps
  /docs update {name}   — fill in session-specific details for each component
```
