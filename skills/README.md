# codevoyant skills

Publishable skill packages shipped from this repo (`npx skills add cloudvoyant/codevoyant -g --all`). Each skill is a self-contained `SKILL.md` package per the Agent Skills base spec (agentskills.io), installable one folder at a time and runnable on any skills-compatible agent.

## Shared assets (`skills/shared/` + `skills/vendor.json`)

The standard scopes each skill to its own folder — there are no cross-skill imports. An asset used by more than one skill (e.g. the SimpleEnglish STE ruleset) therefore lives once in **`skills/shared/`** (the source of truth) and is **vendored** into the skills that need it by a config-driven build, keeping each skill self-contained while avoiding copying everything into every skill.

- `skills/vendor.json` maps each shared asset to the skill directories that carry a copy (`source` + `destinations`).
- `.mise-tasks/vendor-assets` copies each source into every destination, or with `--check` fails on drift.

```bash
mise run skills:vendor      # copy each shared asset into its declared destinations (commit the result)
mise run skills:validate    # frontmatter + soft-wrap rule + vendor drift + model-ID guard (CI gate)
```

Edit the source under `skills/shared/`, run `mise run skills:vendor`, and commit the result — the vendored copies are committed because `npx skills` installs straight from the repo. CI runs `skills:validate`, so a drift or a missing copy fails the build.

To add a shared asset: put its source under `skills/shared/`, add one `assets` entry to `skills/vendor.json` listing the destination directories, run `mise run skills:vendor`, and commit.

Per-skill references that are **not** shared (e.g. a skill's own workflows) live in that skill's `references/` and are not managed by the build.
