# Workflow: loop status

Print a loop's definition and its latest run-instance state.

## Step 0: Parse arguments

```
LOOP_NAME = first positional arg (required)
```

If `LOOP_NAME` is missing, error: "Usage: /loop status <name>. A loop name is required."

## Steps

1. Initialize the shared store: `python3 "{SKILL_ROOT}/scripts/cv_init_store.py" >/dev/null` (`{SKILL_ROOT}` = the loop skill's package root — the directory containing its SKILL.md, as reported when the skill loaded; substitute the real path).
2. Resolve the definition `.codevoyant/loops/{LOOP_NAME}/loop.md`. If absent, error: "Loop '{LOOP_NAME}' not found. Run /loop new {LOOP_NAME} first."
3. Print the definition: Task, Objective, Check (or "(none)"), Max Iterations.
4. Find the newest run instance for this loop and print its `run.md`: status, iteration count, and the last iteration's result. If there is no run yet, report "(no runs yet — /loop go {LOOP_NAME})".
