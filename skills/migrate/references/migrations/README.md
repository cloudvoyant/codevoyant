# Version-to-version migrations

The `/migrate` skill records the codevoyant version a store was last migrated to in `.codevoyant/metadata.json` (`{"version": "1.67.2"}`). When the store's recorded version is older than the current codevoyant version, the skill applies, in ascending version order, every migration file in this directory whose target version is greater than the recorded version and less than or equal to the current version.

## Convention

- One file per version step, named `<target-version>.md` (e.g. `1.68.0.md`). The file describes the steps to bring a store from the previous version up to `<target-version>`.
- Files are applied in ascending semver order. A file whose `<target-version>` is `<= recorded` is skipped; a file whose `<target-version>` is `> current` is skipped.
- Each file is agent-driven markdown: it explains what changed in the store's on-disk layout and the exact bash (or manual) steps to transform an older store. Keep steps idempotent and non-destructive where possible.
- After the applicable files run, `/migrate` writes the current version back to `.codevoyant/metadata.json`.

## When to add one

Only add a migration file when a codevoyant release changes the shape of data inside `.codevoyant/` (a renamed registry, a moved subdirectory, a reformatted state file, etc.). A release that does not change the store's layout needs no migration file — the version in `metadata.json` simply advances.

No real historical migrations exist yet. The template below shows the expected shape; copy it to `<target-version>.md` and fill it in when the need arises.

## Template

```markdown
# Migrate store to <target-version>

## What changed
<one-line summary of the on-disk change in .codevoyant/ introduced by this version>

## Steps
Run against the resolved store directory (`$CV_STORE`, i.e. `~/.codevoyant/<slug>/`):

1. <first step — idempotent bash or a manual instruction>
2. <second step ...>

## Notes
- <edge cases, e.g. "skip if <file> already exists", "never touch worktrees/">
```
