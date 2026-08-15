# scaffold — copy a template into a doc skeleton

Scaffolding a doc = run the script:

```bash
python3 <skill>/scripts/scaffold.py --out {out} --template {type} --vars '{"name": "{Name}", "path": "{glob-base}"}' [--overwrite]
```

It copies `references/templates/{type}.md` verbatim and replaces each `{key}` token in the template with the matching value from the `--vars` JSON dict (`{name}` → `{Name}`, `{path}` → `{glob-base}`, and any other token you pass). For an index/top-level doc with no code path, omit `path` — `--vars '{"name": "{Name}"}'`. The template is the single source of structure — editing a template is editing one markdown file, and the script needs no change. Every fill-in prompt is a `<!-- @agent: … -->` marker (grep `@agent`); a marker whose text starts with `(optional)` marks a deletable section. Exit 0 = wrote; exit 3 = file existed and was skipped (pass `--overwrite` to replace).
