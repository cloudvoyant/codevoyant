# Workflow: loop list

List every loop definition and its latest run state.

## Steps

1. Initialize the shared store before reading: `python3 "{SKILL_ROOT}/scripts/cv_init_store.py" >/dev/null` (`{SKILL_ROOT}` = the loop skill's package root — the directory containing its SKILL.md, as reported when the skill loaded; substitute the real path).
2. For each directory under `.codevoyant/loops/` that contains a `loop.md` (skip run instances — directories matching `*-run-*` or `*-{timestamp}` that carry only `run.md`):
   - Read the loop name and Max Iterations from `loop.md`.
   - Find the newest run instance for that loop (newest `run.md` whose `loop:` field matches) and read its `status`.
3. Print a table:

```
| Loop | Max | Latest run | Status |
| --- | --- | --- | --- |
| {name} | {max} | {run-id or "—"} | {complete | max-reached | running | failed | "—"} |
```

If there are no loops, report: "No loops defined. Run `/loop new {name}` to create one."
