# consolidate

Merge two skills (by local path or URL) into a single coherent skill. Deduplicates overlapping workflows, resolves naming conflicts, and produces one SKILL.md with a unified dispatcher and terse recipes.

## Variables

Received from dispatcher:
- `SOURCE_A` — first positional arg: local path or URL to skill A (required)
- `SOURCE_B` — second positional arg: local path or URL to skill B (required)
- `SKILL_NAME` — value after `--name` (may be empty; derived if absent)
- `DEST` — value after `--dest` (default: `skills/{SKILL_NAME}/`)

## Step 0.5: Validate Inputs

Both `SOURCE_A` and `SOURCE_B` must be provided. If either is missing:
```
✗ consolidate requires two sources.
  Usage: /skill consolidate <path-or-url-A> <path-or-url-B> [--name <slug>]
```
Exit.

## Step 1: Load Both Skills

For each source (A and B):

**Local path:**
- If directory: read `SKILL.md` and all `references/workflows/*.md`
- If single file: read it directly

**URL:**
- Fetch with WebFetch; extract headings, code blocks, command examples

Store as `SKILL_A_CONTENT` and `SKILL_B_CONTENT` respectively.

Report: `✓ Loaded skill A: {name/url}` and `✓ Loaded skill B: {name/url}`

## Step 2: Extract Workflow Inventories

For each skill, extract a flat list of its workflows (verbs + what each does in one line):

```
Skill A workflows:
  ci        — watch CI for a branch
  watch     — alias for ci
  ...

Skill B workflows:
  ci        — monitor CI after push
  commit    — conventional commit
  ...
```

## Step 3: Identify Overlaps and Conflicts

Compare the two inventories:

**Duplicates** — same verb, same behavior → keep one implementation (prefer the more detailed spec)

**Aliases** — same verb, different name → merge under the canonical name; add alias in dispatcher

**Conflicts** — same verb, different behavior → present both to the user:

```yaml
AskUserQuestion:
  question: "Both skills have a '{verb}' workflow with different behavior. Which should the merged skill use?"
  header: "Conflict: {verb}"
  options:
    - label: "Use Skill A's version"
      description: "{one-line summary of A's behavior}"
    - label: "Use Skill B's version"
      description: "{one-line summary of B's behavior}"
    - label: "Merge both under different names"
      description: "Keep both, rename one (describe in Other)"
```

Resolve all conflicts before proceeding.

## Step 4: Derive Merged Skill Name

If `--name` provided: use it.
Otherwise: combine the two names meaningfully (e.g. `gh` + `glab` → `vcs`, `git` + `ci` → `git`). Ask the user if no obvious merge exists.

Store as `SKILL_NAME`.

## Step 5: Draft Merged Workflows as Terse Recipes

For each retained workflow (after dedup + conflict resolution), write a terse recipe following the same rules as `learn.md` Step 4:

- No prose
- Direct narrow commands only
- One action per step
- Explicit flags
- Fail-fast exit conditions

## Step 6: Present Consolidation Plan

```
📋 Consolidation plan: {SKILL_NAME}

Source A: {name} — {N} workflows
Source B: {name} — {N} workflows

Merged ({N} workflows, {dropped} dropped as duplicates):
  {verb-a}  — {description}
  {verb-b}  — {description}
  ...

{N} conflicts resolved: {list}

Files to create:
  skills/{SKILL_NAME}/SKILL.md
  skills/{SKILL_NAME}/references/workflows/{verb}.md  (one per workflow)
  skills/{SKILL_NAME}/references/workflows/help.md
  skills/{SKILL_NAME}/LICENSE.md
```

Use **AskUserQuestion**:
```yaml
question: "Does this consolidation look right?"
header: "Merge review"
options:
  - label: "Create merged skill"
  - label: "Adjust"
    description: "Describe what to change in the Other field"
```

Loop until accepted.

## Step 7: Write Skill Files

Only after plan accepted. Same structure as `learn.md` Step 6:

- `skills/{SKILL_NAME}/SKILL.md` — unified dispatcher; includes all merged verbs and their aliases
- `skills/{SKILL_NAME}/references/workflows/{verb}.md` — one file per merged workflow
- `skills/{SKILL_NAME}/references/workflows/help.md` — unified command reference table
- `skills/{SKILL_NAME}/LICENSE.md` — MIT

If the source skills had templates or reference indexes, carry them forward only if the merged skill still uses them.

## Step 8: Validate

Run `/skill critique {SKILL_NAME}` and surface any issues.

Report:
```
✓ Merged skill created at skills/{SKILL_NAME}/

  Skill A ({N} workflows) + Skill B ({N} workflows)
  → {SKILL_NAME} ({N} workflows, {dropped} duplicates dropped)

  Previous skills are unchanged — delete them manually when ready.
```
