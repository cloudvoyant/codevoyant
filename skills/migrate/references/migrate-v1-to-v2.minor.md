# Migrate store: v1 (unified `.codevoyant/plans/`) → v2 (per-skill plan stores)

<from>v1</from>
<to>v2.minor</to>

## What changed
In the v1 store layout every plan draft — regardless of which skill created it — landed flat under `.codevoyant/plans/{slug}/`, and the store's plan registry (`.codevoyant/README.md`) recorded each plan's owning plugin in its `Plugin` column. Around the same era the `em` skill was renamed to `plan`, so older registry rows may carry the `em` plugin name while the skill now lives at `skills/plan/`. The v2 layout splits the shared plan store by owning skill: spec-created plans move to `.codevoyant/spec/{slug}/` and plan-created plans (plugin `plan`, including rows recorded under the old `em` name) move to `.codevoyant/plan/{slug}/`. This migration relocates existing drafts into the per-skill stores, normalizes `em` → `plan` in the registry, and leaves the registry shape otherwise unchanged — the `Plugin` column is now the definitive owner signal.

## Selector
- `<from>v1</from>` — any store already on the v1 layout (metadata.json present, recorded version in the v1 series).
- `<to>v2.minor</to>` — brings the store to the v2 layout (any 2.x minor). The dispatcher selects this migration whenever the recorded version is below v2 and the current codevoyant version is v2 or higher.

## Prerequisites
The store + symlink must already exist. `SKILL.md` Step 1 (`cv_init_store`) has run and exported `CV_STORE` (`~/.codevoyant/<slug>/`). The store must be on the v1 layout — `.codevoyant/plans/` exists and `metadata.json` records a v1-series version (the dispatcher guarantees this by selection). If `.codevoyant/spec/` or `.codevoyant/plan/` already exist, treat them as pre-existing destinations; never clobber their contents.

## Critical rules (apply throughout)
- **Never clobber.** Relocation is a move, but collision-safe: a plan dir is moved only if the destination path is absent; on a collision keep the destination copy and preserve the incoming one under the destination as `{slug}.local-<UTC-timestamp>`.
- **Never touch `worktrees/`.** Git worktrees are absolute checkouts; never copy, move, or descend into a `worktrees/` subtree.
- **Classify by ownership, never by guess.** Owner comes from the registry `Plugin` column first; plan.md structure is only a fallback for unregistered plans.
- **The registry is updated in place**, never preserved as a `.local-` copy.

## Step A: Classify every plan under `.codevoyant/plans/`

Read the registry `.codevoyant/README.md` (header `| Name | Status | Plugin | Description | Created | Branch |`). For each directory `.codevoyant/plans/{slug}` that exists (plan dirs may or may not contain a `plan.md` — a task-file-only draft is still a plan dir), assign an owner:

1. **Registry row present** → the row's `Plugin` column, normalised: `em` → `plan`; every other value is used verbatim (`spec`, `plan`).
2. **No registry row** → inspect `.codevoyant/plans/{slug}/plan.md` if it exists:
   - contains a `## Metadata` section with a `- **Branch**:` line → `spec` (spec skill template).
   - contains `## Milestones`, `**Team:**`, or `**Scope:** project|initiative` → `plan` (plan skill template).
3. **Unresolvable** (no registry row and no recognisable plan.md) → leave `.codevoyant/plans/{slug}` in place and report it to the author for manual triage. It is NOT moved.

Collect the classification into `SPEC_PLANS` and `PLAN_PLANS` (lists of slugs).

## Step B: Relocate each classified plan

For each slug in `SPEC_PLANS`, move `.codevoyant/plans/{slug}` → `.codevoyant/spec/{slug}`. For each slug in `PLAN_PLANS`, move `.codevoyant/plans/{slug}` → `.codevoyant/plan/{slug}`. Collision-safe per the rules above:

```bash
move_plan() {  # move_plan SLUG DEST_ROOT
  local slug="$1" dest_root="$2" src="$CV_STORE/plans/$slug"
  [ -d "$src" ] || return 0
  [ -d "$CV_STORE/plans" ] || return 0
  mkdir -p "$dest_root"
  if [ ! -e "$dest_root/$slug" ]; then
    mv "$src" "$dest_root/$slug"
    echo "moved: plans/$slug -> $(basename "$dest_root")/$slug"
  else
    mv "$src" "$dest_root/$slug.local-$(date -u +%Y%m%dT%H%M%SZ)"   # collision → preserve incoming
    echo "collision: kept $(basename "$dest_root")/$slug, preserved incoming as $slug.local-*"
  fi
}
for s in "${SPEC_PLANS[@]}"; do move_plan "$s" "$CV_STORE/spec"; done
for s in "${PLAN_PLANS[@]}"; do move_plan "$s" "$CV_STORE/plan"; done
```

After relocating, remove the now-empty `plans/` directory only if every entry under it was either moved, resolved, or reported as triage:

```bash
# If nothing was left for triage and plans/ is empty, drop the directory.
[ -d "$CV_STORE/plans" ] && [ -z "$(ls -A "$CV_STORE/plans" 2>/dev/null)" ] && rmdir "$CV_STORE/plans"
```

## Step C: Normalize the registry (em → plan)

Rewrite `.codevoyant/README.md`, replacing the `em` value in the `Plugin` column (column 3) with `plan`. Data rows are identified as in the v0→v1 migration (a row begins with `|` and its trimmed first column is not `Name` and not a `---` separator). No other rows change:

```bash
python3 - "$CV_STORE/README.md" <<'PY'
import csv, io, sys

path = sys.argv[1]
with open(path) as f:
    text = f.read()

# Split into leading preamble (header/intro lines) + table lines.
lines = text.splitlines(keepends=True)
head = []
rows = []
for line in lines:
    body = line.rstrip("\n")
    if body.startswith("|") and "|" in body[1:]:
        cells = [c.strip() for c in body.strip("|").split("|")]
        is_header = cells and cells[0] == "Name"
        is_sep = body.startswith("|-")
        if not is_header and not is_sep:
            rows.append(body)
            continue
    head.append(line)

out = []
for body in rows:
    cells = [c.strip() for c in body.strip("|").split("|")]
    if len(cells) >= 3 and cells[2] == "em":
        cells[2] = "plan"
        body = "| " + " | ".join(cells) + " |"
    out.append(body + "\n")

with open(path, "w") as f:
    f.writelines(head)
    f.writelines(out)
PY
echo "registry normalized: em -> plan in Plugin column"
```

## Step D: Report

Report to the author:
- each plan moved from `.codevoyant/plans/` to `.codevoyant/spec/` or `.codevoyant/plan/`,
- any `.local-*` collision-preserved copies,
- any plans left in `.codevoyant/plans/` for manual triage (with the reason),
- the registry `em` → `plan` normalization result.

## Notes
- Idempotent: re-running against an already-migrated store finds no plans under `.codevoyant/plans/` (or an absent directory), moves nothing, and normalizes nothing new.
- Skip entirely when `.codevoyant/plans/` does not exist — the dispatcher still records the version.
- Never touch `worktrees/`.
