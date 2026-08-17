# codevoyant skills

Publishable skill packages shipped from this repo (`npx skills add cloudvoyant/codevoyant -g --all`). Each skill is a self-contained `SKILL.md` package per the Agent Skills base spec (agentskills.io), installable one folder at a time and runnable on any skills-compatible agent.

## Shared assets (`skills/shared/` + `skills/vendor.json`)

The standard scopes each skill to its own folder — there are no cross-skill imports. An asset used by more than one skill (e.g. the SimpleEnglish STE ruleset, the spec/docs glob-checker scripts, the issue template) therefore lives once in **`skills/shared/`** (the source of truth) and is **vendored** into the skills that need it by a config-driven build, keeping each skill self-contained while avoiding copying everything into every skill.

- `skills/vendor.json` (v2) declares each asset's `source`, an optional selective `files` list, and how it maps into target skills (`skills` + `destination` and/or explicit `destinations`).
- `.mise-tasks/vendor-assets` copies each asset into its targets, or with `--check` fails on drift; `--validate` checks the schema alone.

```bash
mise run skills:vendor      # copy each shared asset into its declared destinations (commit the result)
mise run skills:validate    # frontmatter + soft-wrap rule + vendor drift + model-ID guard (CI gate)
```

Edit the source under `skills/shared/`, run `mise run skills:vendor`, and commit the result — the vendored copies are committed because `npx skills` installs straight from the repo. CI runs `skills:validate`, so a drift or a missing copy fails the build.

### The v2 manifest

Each asset in `skills/vendor.json` looks like:

```json
{
  "version": 2,
  "assets": {
    "my-asset": {
      "source": "skills/shared/my-asset",
      "files": ["ruleset.md", "sub/extra.md"],
      "skills": ["docs", "pr"],
      "destination": "references/my-asset"
    }
  }
}
```

- `source` (required) — the shared source dir; must exist.
- `files` (optional) — selective list of entries (files or subdirs) to copy; omit to copy the whole source.
- `skills` (optional) — target skill names; each receives the asset at `skills/<skill>/<destination>`.
- `destination` (optional, used with `skills`) — path relative to each skill's directory; defaults to `references/<asset-name>`.
- `destinations` (optional) — explicit repo-relative destination paths (v1 style). At least one of `skills`/`destinations` is required; both may be combined.

The common case is "these files from this shared source go into these skills at `references/<name>`" — `source` + `skills` + (optionally) `destination`.

### Vendored assets

| Asset | Source | Vendored into |
|---|---|---|
| simple-english | `skills/shared/simple-english/` | `docs` and `pr` → `references/simple-english/` |
| scope-scripts | `skills/shared/scope-scripts/` (`scope.py`, `test_scope.py`) | `spec` and `docs` → `scripts/` |
| bug-report | `skills/shared/bug-report/bug-report.md` | `gh`, `glab`, `linear` → `references/templates/` |

To add a shared asset: put its source under `skills/shared/`, add one `assets` entry to `skills/vendor.json` (see the schema above), run `mise run skills:vendor`, and commit.

Per-skill references that are **not** shared (e.g. a skill's own workflows) live in that skill's `references/` and are not managed by the build.
