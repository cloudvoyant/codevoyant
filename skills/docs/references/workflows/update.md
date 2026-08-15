# update -- apply changes to existing docs

Update documentation files. Four modes, selected automatically (or by flag):

1. **Scaffold mode** (`--scaffold`): create missing doc files and insert missing section headings from templates. Does not generate prose. Does not touch existing content.
2. **Report mode**: if a docs review report exists at `.codevoyant/review/{slug}/docs-review.md`, consume it and apply the verbatim replacements.
3. **Diff-scoped audit mode**: if no report exists, restrict scope to the branch diff and author the affected sections by reading the changed code (like retcon, but only what the diff touches).
4. **Escalation mode**: if the needed changes are too large, stop and run `docs review` first so you can inspect before applying.

**Preserve human text.** In all modes, change only text that is inaccurate or structurally incomplete. Do not rephrase working prose for style. This is the first-class principle of this workflow.

**Preserve coverage & API boundaries.** In all modes, follow `references/coverage-and-api.md`. Keep the doc's `globs:` frontmatter accurate; never add content that covers paths another doc owns (unless nested — then reference the child doc's interface only); when adding cross-references, use the target module's documented public API only; preserve the parent/child interface relationship (Step 4c).

## Variables

- `TARGET` -- component name or doc path from REMAINING_ARGS
- `FOCUS` -- optional `--add-env-vars`, `--add-endpoints`, `--add-flow` flag to scope the update
- `DIFF_BASE` -- value of `--diff <base>` if provided, else `main` (diff scoping default)
- `SKILL` -- this skill's directory; the scaffold script is `$SKILL/scripts/scaffold.py`
- `--scaffold` -- populate missing structure only (no prose generation)
- `--force` -- skip the escalation threshold and apply directly (use with caution)

## Step 0: Identify target file

If TARGET matches a file path directly, use it.
Otherwise resolve (see `references/structure.md`):
- `readme` -> `README.md` (repo root)
- `user-guide` -> `docs/user-guide.md` (user-facing)
- `development-guide` -> `docs/development-guide.md`
- `ci` -> `docs/ci.md` (CI/CD + infrastructure)
- `architecture` -> `docs/architecture/index.md`
- `{name}` -> `docs/architecture/{name}.md`, or `docs/architecture/{name}/index.md` if that component already exists as a directory (has sub-components). An `auth` component resolves the same way and uses the `auth` template.

If the file does not exist AND `--scaffold` is NOT set: suggest `docs new {name}` instead and stop.

If the file does not exist AND `--scaffold` IS set: the file will be created in scaffold mode (Step 1a).

## Step 1: Check for scaffold mode

If `--scaffold` is set, go to Step 1a (scaffold mode).
Otherwise, go to Step 1b (derive slug and locate the review report).

## Step 1a: Scaffold mode

Scaffold mode creates missing doc files and inserts missing section headings. It never generates prose content and never overwrites or removes existing text.

Detect the component type using the detection table in `references/structure.md`.

- **Missing file** → scaffold it with the script (`references/scaffold.md`): `python3 "$SKILL/scripts/scaffold.py" --out {target} --template {type} --vars '{"name": "{name}", "path": "{path}"}'` (for an index/top-level doc with no code path, omit `path` — `--vars '{"name": "{name}"}'`). It copies the template verbatim (frontmatter first, each `{key}` token filled from the `--vars` dict, every prompt a `<!-- @agent: … -->` marker).
- **Existing file, missing sections** → the script only writes whole files, so add sections additively: read the resolved template file (same resolution as scaffold), and for every `##`/`###` heading present in the template but absent in the target, insert that heading followed by its `<!-- @agent: … -->` marker (copied verbatim from the template) at the correct position in template order. Add the `globs:` frontmatter block only if the target has none. Never touch existing content.

### Report and prompt

After scaffolding, output:

```
Scaffolded {N} section(s) across {M} file(s):

  {file_path}
    + ## Requirements
    + ## References

  {file_path}
    (created -- all sections scaffolded)

Find all scaffold hints:
  grep -rn "@agent" docs/

Fill in each section, then delete its <!-- @agent: … --> marker (markers starting with "(optional)" mark deletable sections).
```

Stop. Do not generate any prose content.

## Step 1b: Derive slug and locate the review report

`review` writes its report to `.codevoyant/review/{slug}/docs-review.md`, where `slug` is derived from the path that was reviewed (see `review.md` Step 0). A whole-tree `/docs review` uses slug `docs`; a single-file `/docs review docs/architecture/auth.md` uses slug `docs-architecture-auth`. The report always groups findings by file under `### {file_path}` headings, so a whole-tree report contains a section for the target file.

`update` resolves TARGET to one file, so it must look for that file's findings under **both** the file-level slug and the tree-level `docs` slug — whichever review produced them.

Derive both candidate slugs from the resolved target path using the same rule as `review.md` Step 0 (lowercase the path, strip the file extension, replace `/` and non-alphanumeric characters with `-`, collapse runs of `-`, trim leading/trailing `-`):
- `FILE_SLUG` -- the slug for the resolved target file (e.g. `docs/architecture/auth.md` -> `docs-architecture-auth`, `README.md` -> `readme`).
- `TREE_SLUG` -- the slug for the docs tree root: `docs`.

```bash
FILE_REPORT=".codevoyant/review/${FILE_SLUG}/docs-review.md"
TREE_REPORT=".codevoyant/review/docs/docs-review.md"
```

Select `REPORT` in this order:
1. If `$FILE_REPORT` exists, use it (`REPORT=$FILE_REPORT`, `SLUG=$FILE_SLUG`).
2. Else if `$TREE_REPORT` exists AND it contains a `### {target_path}` findings section for the resolved target file, use it (`REPORT=$TREE_REPORT`, `SLUG=docs`).
3. Else no applicable report exists.

If a `REPORT` was selected, set `REVIEW_DIR=".codevoyant/review/${SLUG}"` and go to Step 2a (report mode).
If no report was selected, go to Step 2b (audit mode).

## Step 2a: Report mode -- consume the review report

Read `$REPORT`. In the `## Replacements` section, findings are grouped by file under `### {file_path}` headings. Select **only the findings under the `### {target_path}` heading for the resolved target file** — ignore findings for other files (a whole-tree report covers many files; `update` applies only the target's).

If the report has no `### {target_path}` section for the resolved target (no findings for this file), report `No findings for {target_path} in {REPORT}.` and go to Step 7 (report).

For each finding under the target's section:

1. Read the `**Current text:**` block.
2. Read the `**Replacement:**` block.
3. If current text is "(section absent)", this is a section insertion -- find the correct position in the file (using template section order) and insert the replacement text.
4. If current text is a quoted block, locate the exact text in the target file and replace it with the replacement text using the Edit tool.
5. If the exact text cannot be found (file was edited since the review), skip the finding and report it as `SKIPPED: text not found in file`.

After applying all findings, report:

```
Applied {applied} replacement(s) for {target_path} from {REPORT}.
  {skipped} skipped (text changed since review).

To re-review: /docs review {path}
```

If any findings were skipped, list them with the reason.

Mark the consumed report. Two cases:
- **File-level report** (`SLUG` is the file slug, `REPORT` covers only this file): rename it so a re-run does not reapply it.
  ```bash
  mv "$REPORT" "${REPORT%.md}.applied.md"
  ```
- **Tree-level report** (`SLUG` is `docs`, shared across files): do NOT rename or delete it — other files still need their findings. Leave it in place; re-running `/docs update {other}` must still find it.

Go to Step 7 (report).

## Step 2b: Diff-scoped audit mode -- compute scope, read code, decide

Resolve the target doc's template (same heuristics as `review.md` Step 2; the type table lives in `references/structure.md`). Read `references/template-contract.md`, `references/language-guide.md`, and `references/simple-english/ruleset.md`.

**Compute the diff scope** per `references/coverage-and-api.md` Steps D–E:

```bash
BASE="${DIFF_BASE:-main}"
CHANGED="$(git diff --name-only "$(git merge-base "$BASE" HEAD)" HEAD 2>/dev/null | sort -u || true)"
# in-scope = changed files the target doc's globs own
printf '%s\n' "$CHANGED" | python3 "$SKILL/scripts/scope.py" --globs <target doc's globs>  # SCOPE
```

If the repo is not a git repo (or the base does not exist), `SCOPE` is empty — fall back to no diff scoping (audit the whole doc against its code path). If the target doc has no `globs` frontmatter, derive the scope from the doc's code path (`docs/architecture/{name}` → `{code path from the type table}`).

**Build the `CHANGES` list from three sources, in order:**

1. **Changed-code facts (the primary source).** Read each file in `SCOPE` and extract the concrete facts that affect the doc: new/changed env vars, endpoints, flow steps, requirements, dependencies, design decisions, public API additions. Draft a minimal change per fact.
2. **Template/STE compliance** (same checks as `review.md` Step 3, scoped to the target file): missing required sections, missing required diagrams (per `template-contract.md` §1–§2), language violations. A missing section is drafted as an insertion; a diagram is drafted as a mermaid stub.
3. **Session context** from the current conversation: new files created or modified, env vars mentioned, endpoints described, design decisions made, dependencies added. Only add these if the doc is not covered by source 1 (they are the human's stated intent).

Filter the draft list:
- **FOCUS flags scope it further**: `--add-env-vars` keeps only env-var changes; `--add-endpoints` only endpoint changes; `--add-flow` only flow changes. A FOCUS flag is an additive filter — it never expands beyond the diff scope.
- **Coverage guardrail**: drop any draft change that would document paths another doc owns, or reference another module's internals (Step 4c).

### Threshold check

Count the scope of needed changes:

| Condition | Threshold |
|-----------|-----------|
| Number of files that need changes | more than 5 |
| Any single file needs more than 40% of its lines changed | yes |
| Any required doc is entirely absent | yes |

If ANY threshold is exceeded AND `--force` is not set, go to Step 3 (escalation).
Otherwise, go to Step 4 (minimal apply).

If `CHANGES` is empty (no diff scope, no template violations, no session changes):
```
No changes needed for {target_path}. Nothing on this branch falls under its globs, and the file conforms to template requirements.
```
Then stop.

## Step 3: Escalation -- too many changes

Report the scope and run a review:

```
Too many changes needed for direct update:
  {reason -- for example: "6 files need changes (threshold: 5)" or "docs/architecture/auth.md needs 45% rewrite (threshold: 40%)" or "docs/architecture/auth.md is entirely absent"}

Running docs review to produce a replacement report you can inspect first.
```

Execute the `review.md` workflow with `TARGET_PATH` set to the resolved target file. `review` derives its slug from that path (the `FILE_SLUG` from Step 1b) and writes the report to `.codevoyant/review/${FILE_SLUG}/docs-review.md` — the same location Step 1b checks first, so the follow-up `/docs update {target}` will find and consume it.

Then report:

```
Review report written: .codevoyant/review/{FILE_SLUG}/docs-review.md
  Inspect the report, then run /docs update {target} to apply the replacements.
  Or run /docs update {target} --force to skip the threshold check.
```

Stop.

## Step 4: Minimal apply

For each change in `CHANGES`:
1. Identify the target section in the file.
2. Draft the minimal fix following language-guide rules and STE pragmatic mode.
3. Apply the fix using the Edit tool.

Rules:
- **Never delete** existing human-authored content unless it is factually wrong.
- **Never rephrase** working prose for style -- only fix inaccuracies and structural gaps.
- If a required section is entirely missing, add it at the correct position with a placeholder comment.
- New env vars -> add row to env vars table (or create table if absent).
- New endpoints -> add row to endpoints table.
- New flow steps -> extend existing steps.
- New design decisions -> add bullet to the appropriate Design subsection.

### Step 4c: Coverage & API-boundary guardrails

Before applying any change, check it against `references/coverage-and-api.md`:
- Keep the doc's `globs:` frontmatter accurate. If the update adds or removes paths the doc owns, update `globs` to match.
- Do NOT add content that documents paths another doc owns. If the path belongs to a nested child doc, link the child and reference only its public API section — never restate the child's internals.
- When adding a cross-reference to another module, reference that module's documented public API only — the `[public-api]`-marked heading of its resolved template (`references/template-contract.md`) — not its internal files/functions.
- Preserve the parent/child interface relationship: a superset-glob parent treats each nested child as a black box.

Drop or rewrite any candidate change that would violate these rules.

## Step 5: Preview and confirm

Show the user each proposed change:
```
Proposed changes to {target_path}:

  ## Requirements
  + - Must support {new requirement}

  ## Implementation > Environment Variables
  + | NEW_VAR | Description | yes |
```

Use AskUserQuestion:
- "Apply all changes" -- write all
- "Skip some" -- describe in Other which to skip
- "Cancel" -- no changes

## Step 6: Write changes

Apply all approved changes to the file. Write the file.

## Step 7: Report

```
Updated {target_path}

  Applied:
    {section}: {brief description}

Run /docs review {target} to check for remaining gaps.
```
