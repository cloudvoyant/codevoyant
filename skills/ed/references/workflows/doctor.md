# doctor — repair a mis-scaffolded diffbook book in place

`ed doctor [path] [--fix]` detects and repairs a book that was scaffolded with the old, broken layout — the diffbook **project buried inside `book/`** with content **doubly-nested at `book/docs/`** (see PL-29) — and converts it to diffbook's real convention: **project at the repo root**, `book/` as the `contentPath` **content** dir. It is **structural only**: it moves and rewrites files, de-duplicates stray dirs, and fixes the stale `docs` option. It **never re-runs author agents** and **never touches authored MDX content** beyond relocating it — generating a book is expensive; a mis-scaffold must be fixable structurally.

Default is a **dry run** (report the planned changes and stop). Pass `--fix` to apply them. The repair is **idempotent** — running it on an already-healthy book reports "nothing to do".

## ⛔ HARD STOPS — read before every action

| You are about to… | Correct action |
|---|---|
| Re-run `create-lesson` / `ed-lesson-author` / any author agent | Stop. `doctor` never authors or re-authors content. It only relocates/rewrites files. |
| Delete or overwrite any `.mdx`/`.md` **content** file | Stop. Content is only ever **moved**, never edited or removed. Only `astro.config.mjs` is rewritten. |
| Touch the repo's own top-level `docs/` (unrelated eng docs) | Stop. Only `{BOOK_DIR}/docs/` (the nested *content* layer) is flattened — never a sibling `docs/`. |
| Apply changes without `--fix` | Stop. Without `--fix` you only print the plan. |
| Apply changes you did not first list in the dry-run plan | Stop. Every mutation must appear in the printed plan first. |

## Variables

- `PROJECT_ROOT` — first non-flag token, or the cwd if omitted (the borked project's root)
- `BOOK_DIR` — content dir name, default `book`; override via `--book <name>`
- `FIX` — true if `--fix` present (else dry-run)

## Step 0: Parse args & resolve

```bash
PROJECT_ROOT="."          # or the first non-flag positional
BOOK_DIR="book"           # or the value after --book
FIX=false                 # true if --fix present
```

Resolve `BOOK="$PROJECT_ROOT/$BOOK_DIR"`.

## Step 1: Diagnose the layout

Inspect the tree and classify. Compute these booleans:

```bash
ROOT_CFG="$PROJECT_ROOT/astro.config.mjs"       # a healthy project has this
BOOK_CFG="$BOOK/astro.config.mjs"               # a BURIED project has this
NESTED_DOCS="$BOOK/docs"                         # doubly-nested content layer
```

- `BURIED` — `BOOK_CFG` exists (the diffbook project was scaffolded inside `BOOK_DIR`).
- `NESTED` — `$BOOK/docs/` exists and contains content (`index.md`/`.mdx`/chapter dirs) — content doubly-nested.
- `STALE_OPT` — the effective `astro.config.mjs` (root if present, else buried) sets the removed `docs:` option instead of `contentPath:` (renamed in diffbook 0.7.0). Detect with `grep -nE 'docs\s*:' "$CFG"` inside the `diffbook({ … })` call.
- `DUP_DIFFBOOK` — both `$PROJECT_ROOT/.diffbook/` and `$BOOK/.diffbook/` exist (stray duplicate).
- `HEALTHY` — `ROOT_CFG` exists, its `diffbook({…})` uses `contentPath`, `BOOK_CFG` does **not** exist, and `$BOOK/docs/` does **not** exist. If `HEALTHY`, report "✓ Book is already healthy — nothing to do." and **stop** (idempotent no-op).

Identify the **project files** currently under `BOOK` to relocate (only those that exist): `astro.config.mjs`, `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `tsconfig.json`, `.gitignore`, `.diffbook/`. **Do not move `node_modules/`** — note that the user should reinstall deps at the root after repair.

Identify the **content** currently under `BOOK`: everything else (`index.md`, `getting-started.md`, chapter dirs, and the nested `docs/` tree).

## Step 2: Build the repair plan

Assemble an ordered, minimal plan from the diagnosis. Typical full repair (buried + nested):

1. **Relocate project files** `BOOK/{astro.config.mjs,package.json,lockfiles,tsconfig.json,.gitignore,.diffbook/}` → `PROJECT_ROOT/`.
   - `.diffbook/` de-dup: if `PROJECT_ROOT` already has one, keep the **buried project's** copy as authoritative — back up the stray root copy to `*.ed-doctor.bak` (or remove it if it is empty/cache-only), then move the buried copy up.
   - `.gitignore` is different: a real repo root's `.gitignore` is usually authoritative (covers `node_modules/`, etc.). If `PROJECT_ROOT/.gitignore` already exists, **keep it** and instead **merge** any diffbook-specific lines from `BOOK/.gitignore` (e.g. `dist/`, `.astro/`, `.diffbook/.cache/`) that are missing — never demote the root `.gitignore` to a `.bak`. Only move `BOOK/.gitignore` up if the root has none.
2. **Flatten content**: move `BOOK/docs/*` (and dotfiles) up into `BOOK/`, then remove the now-empty `BOOK/docs/`. This removes the doubled `docs/` layer so chapters live directly under `BOOK/` (`book/01-…/`, `book/02-…/`).
3. **Rewrite `astro.config.mjs`** (now at `PROJECT_ROOT`): inside the `diffbook({ … })` call **only**, replace the `docs:` option key with `contentPath: "./{BOOK_DIR}"`. Anchor the substitution to the `diffbook(` call (do not match a bare `docs:` elsewhere in the file, e.g. inside a comment or another object) and assert it replaced **exactly one** key — if zero or more than one candidate is found, do not guess: report it and leave the file for manual review. If a `contentPath` is already present, drop the stale `docs:` and keep the single `contentPath` (pointing at `./{BOOK_DIR}`).
4. **De-duplicate** any remaining stray `.diffbook/` (keep one at `PROJECT_ROOT`).

Partial cases: apply only the relevant subset (e.g. `NESTED` but not `BURIED` → just steps 2–3; `STALE_OPT` only → just step 3). Preserve every content file — content is **moved**, never edited.

Every planned move/rewrite is recorded as a line for the report.

## Step 3: Dry-run (default) or apply

**If `FIX=false`** (dry run): print the plan and stop.

```
🩺 ed doctor — diagnosis for {PROJECT_ROOT}

  Layout: {buried project | doubly-nested content | stale `docs` option | …}

  Planned repairs (run with --fix to apply):
    • mv {BOOK}/astro.config.mjs        → {PROJECT_ROOT}/astro.config.mjs
    • mv {BOOK}/package.json            → {PROJECT_ROOT}/package.json
    • mv {BOOK}/.diffbook/              → {PROJECT_ROOT}/.diffbook/  (root stray backed up)
    • flatten {BOOK}/docs/*            → {BOOK}/
    • rewrite astro.config.mjs: docs: "…"  →  contentPath: "./{BOOK_DIR}"
    …

  Content preserved: {N} .md/.mdx files (moved, never edited). Author agents are NOT re-run.

Apply:  /ed doctor {PROJECT_ROOT} --fix
```

**If `FIX=true`**: execute the plan in order. Use `git mv` when `PROJECT_ROOT` is a git repo and the path is tracked; otherwise `mv`. Guard every move (`mkdir -p` the destination parent; never clobber a content file — if a destination content file already exists, stop and report the conflict rather than overwriting). Rewrite `astro.config.mjs` with a precise substitution of the `docs:` key → `contentPath: "./{BOOK_DIR}"`. After applying, re-run Step 1's diagnosis to confirm `HEALTHY` now holds.

## Step 4: Report

```
✅ ed doctor — repaired {PROJECT_ROOT}

  Moved:     {list of project files → root}
  Flattened: {BOOK}/docs/  →  {BOOK}/   ({N} content files relocated)
  Rewrote:   astro.config.mjs  →  contentPath: "./{BOOK_DIR}"
  De-duped:  .diffbook/  (kept root; backed up stray → {path}.ed-doctor.bak)

  Verify:
    npm install            # reinstall deps at the project root (node_modules was not moved)
    npx diffbook dev       # now runs from the repo root
```

If it was a dry run, end with the "Apply: /ed doctor … --fix" line instead. If nothing was wrong, report the healthy no-op from Step 1.
